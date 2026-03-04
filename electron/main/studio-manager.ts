import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { app, BrowserWindow, type WebContents } from 'electron';
import type {
  StudioCaptureResult,
  StudioRecordingSnapshot,
  StudioRecordedEvent,
  StudioScriptResult,
  StudioViewportRequest,
} from '../../shared/browser-contract';
import { TabManager } from './tab-manager';

interface RecordingState {
  isRecording: boolean;
  startedAt: string | null;
  events: StudioRecordedEvent[];
}

const MAX_CAPTURE_DIMENSION = 16384;

function buildCapturePath(mode: 'viewport' | 'fullpage'): string {
  const capturesDir = join(app.getPath('downloads'), 'Notilus', 'captures');
  mkdirSync(capturesDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return join(capturesDir, `capture-${mode}-${stamp}.png`);
}

function formatScriptOutput(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export class StudioManager {
  private readonly cssKeysByWebContentsId = new Map<number, string[]>();
  private readonly recordingsByWebContentsId = new Map<number, RecordingState>();

  constructor(
    private readonly window: BrowserWindow,
    private readonly tabManager: TabManager,
    private readonly debug: boolean
  ) {}

  resizeWindow(payload: StudioViewportRequest): void {
    const width = Math.max(480, Math.floor(payload.width));
    const height = Math.max(320, Math.floor(payload.height));
    this.window.setContentSize(width, height, true);
    this.log('resize-window', `${width}x${height}`);
  }

  async captureViewport(): Promise<StudioCaptureResult> {
    const webContents = this.requireActiveWebContents();
    const image = await webContents.capturePage();
    const filePath = buildCapturePath('viewport');
    writeFileSync(filePath, image.toPNG());
    this.log('capture-viewport', filePath);
    return {
      filePath,
      capturedAt: new Date().toISOString(),
      mode: 'viewport',
    };
  }

  async captureFullPage(): Promise<StudioCaptureResult> {
    const webContents = this.requireActiveWebContents();
    const filePath = buildCapturePath('fullpage');

    try {
      const dimensions = await webContents.executeJavaScript(
        `(() => ({
          width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth, window.innerWidth),
          height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, window.innerHeight)
        }))();`,
        true
      );

      const width = Math.min(MAX_CAPTURE_DIMENSION, Number(dimensions?.width) || 0);
      const height = Math.min(MAX_CAPTURE_DIMENSION, Number(dimensions?.height) || 0);
      const rect =
        width > 0 && height > 0
          ? {
              x: 0,
              y: 0,
              width,
              height,
            }
          : undefined;

      const image = rect ? await webContents.capturePage(rect) : await webContents.capturePage();
      writeFileSync(filePath, image.toPNG());
    } catch {
      const image = await webContents.capturePage();
      writeFileSync(filePath, image.toPNG());
    }

    this.log('capture-fullpage', filePath);
    return {
      filePath,
      capturedAt: new Date().toISOString(),
      mode: 'fullpage',
    };
  }

  async applyCss(css: string): Promise<void> {
    const webContents = this.requireActiveWebContents();
    const key = await webContents.insertCSS(css);
    const list = this.cssKeysByWebContentsId.get(webContents.id) ?? [];
    list.push(key);
    this.cssKeysByWebContentsId.set(webContents.id, list);
    this.log('apply-css', `webContents=${webContents.id}`);
  }

  async clearCss(): Promise<void> {
    const webContents = this.requireActiveWebContents();
    const list = this.cssKeysByWebContentsId.get(webContents.id) ?? [];
    for (const key of list) {
      await webContents.removeInsertedCSS(key).catch(() => {
        // Ignore invalidated keys.
      });
    }
    this.cssKeysByWebContentsId.set(webContents.id, []);
    this.log('clear-css', `webContents=${webContents.id}`);
  }

  async runScript(script: string): Promise<StudioScriptResult> {
    const webContents = this.requireActiveWebContents();
    const result = await webContents.executeJavaScript(script, true);
    this.log('run-script', `webContents=${webContents.id}`);
    return {
      output: formatScriptOutput(result),
    };
  }

  async startRecording(): Promise<StudioRecordingSnapshot> {
    const webContents = this.requireActiveWebContents();
    await webContents.executeJavaScript(
      `(() => {
        if (window.__notilusStudioRecorderCleanup) {
          return;
        }
        window.__notilusStudioRecorderEvents = [];
        const select = (el) => {
          if (!el) return '';
          if (el.id) return '#' + el.id;
          if (el.name) return el.tagName.toLowerCase() + '[name="' + el.name + '"]';
          if (el.className && typeof el.className === 'string') {
            const firstClass = el.className.split(' ').filter(Boolean)[0];
            if (firstClass) return el.tagName.toLowerCase() + '.' + firstClass;
          }
          return el.tagName ? el.tagName.toLowerCase() : '';
        };
        const push = (event) => {
          window.__notilusStudioRecorderEvents.push(event);
        };
        const onClick = (e) => {
          push({
            type: 'click',
            selector: select(e.target),
            value: '',
            x: e.clientX || 0,
            y: e.clientY || 0,
            timestamp: Date.now(),
          });
        };
        const onInput = (e) => {
          const target = e.target;
          if (!target || !('value' in target)) return;
          push({
            type: 'input',
            selector: select(target),
            value: String(target.value ?? ''),
            x: 0,
            y: 0,
            timestamp: Date.now(),
          });
        };
        const onScroll = () => {
          push({
            type: 'scroll',
            selector: 'window',
            value: String(window.scrollY || 0),
            x: 0,
            y: 0,
            timestamp: Date.now(),
          });
        };
        document.addEventListener('click', onClick, true);
        document.addEventListener('input', onInput, true);
        window.addEventListener('scroll', onScroll, true);
        window.__notilusStudioRecorderCleanup = () => {
          document.removeEventListener('click', onClick, true);
          document.removeEventListener('input', onInput, true);
          window.removeEventListener('scroll', onScroll, true);
          delete window.__notilusStudioRecorderCleanup;
        };
      })();`,
      true
    );

    const state: RecordingState = {
      isRecording: true,
      startedAt: new Date().toISOString(),
      events: [],
    };
    this.recordingsByWebContentsId.set(webContents.id, state);
    this.log('start-recording', `webContents=${webContents.id}`);
    return this.getRecording();
  }

  async stopRecording(): Promise<StudioRecordingSnapshot> {
    const webContents = this.requireActiveWebContents();
    const events = await webContents.executeJavaScript(
      `(() => {
        const events = Array.isArray(window.__notilusStudioRecorderEvents)
          ? window.__notilusStudioRecorderEvents
          : [];
        if (typeof window.__notilusStudioRecorderCleanup === 'function') {
          window.__notilusStudioRecorderCleanup();
        }
        delete window.__notilusStudioRecorderEvents;
        return events;
      })();`,
      true
    );

    const previous = this.recordingsByWebContentsId.get(webContents.id);
    const normalizedEvents: StudioRecordedEvent[] = Array.isArray(events)
      ? events.map(event => ({
          type: String(event?.type ?? ''),
          selector: String(event?.selector ?? ''),
          value: String(event?.value ?? ''),
          x: Number(event?.x ?? 0),
          y: Number(event?.y ?? 0),
          timestamp: Number(event?.timestamp ?? Date.now()),
        }))
      : [];

    const state: RecordingState = {
      isRecording: false,
      startedAt: previous?.startedAt ?? null,
      events: normalizedEvents,
    };
    this.recordingsByWebContentsId.set(webContents.id, state);
    this.log('stop-recording', `webContents=${webContents.id} events=${normalizedEvents.length}`);
    return this.getRecording();
  }

  getRecording(): StudioRecordingSnapshot {
    const webContents = this.tabManager.getActiveExternalWebContents();
    if (!webContents) {
      return {
        isRecording: false,
        startedAt: null,
        events: [],
      };
    }

    const state = this.recordingsByWebContentsId.get(webContents.id);
    if (!state) {
      return {
        isRecording: false,
        startedAt: null,
        events: [],
      };
    }

    return {
      isRecording: state.isRecording,
      startedAt: state.startedAt,
      events: state.events.map(event => ({ ...event })),
    };
  }

  private requireActiveWebContents(): WebContents {
    const webContents = this.tabManager.getActiveExternalWebContents();
    if (!webContents) {
      throw new Error('Studio actions require an active external tab.');
    }
    return webContents;
  }

  private log(event: string, message: string): void {
    if (!this.debug) return;
    console.info(`[studio-manager] ${event} ${message}`);
  }
}
