import type { Rectangle } from 'electron';
import { BrowserWindow } from 'electron';
import type { RuntimeMode } from '../../shared/viewport-contract';
import { createChromeWindow, createContentWindow } from './window-manager';

interface WindowStackManagerOptions {
  preloadPath: string;
  debug: boolean;
}

type RuntimeModeListener = (mode: RuntimeMode) => void;

export class WindowStackManager {
  private readonly chromeWindow: BrowserWindow;
  private contentWindow: BrowserWindow | null = null;
  private runtimeMode: RuntimeMode = 'single-window-fallback';
  private readonly runtimeModeListeners = new Set<RuntimeModeListener>();

  constructor(private readonly options: WindowStackManagerOptions) {
    this.chromeWindow = createChromeWindow({ preloadPath: options.preloadPath });
    this.bootstrapContentWindow();
    this.wireWindowSync();
  }

  getChromeWindow(): BrowserWindow {
    return this.chromeWindow;
  }

  getContentWindow(): BrowserWindow | null {
    return this.contentWindow;
  }

  getRuntimeMode(): RuntimeMode {
    return this.runtimeMode;
  }

  onRuntimeModeChanged(listener: RuntimeModeListener): () => void {
    this.runtimeModeListeners.add(listener);
    return () => {
      this.runtimeModeListeners.delete(listener);
    };
  }

  applyContentLayout(bounds: Rectangle, visible: boolean): void {
    if (this.runtimeMode !== 'dual-window' || !this.contentWindow || this.contentWindow.isDestroyed()) {
      return;
    }

    const width = Math.max(0, Math.floor(bounds.width));
    const height = Math.max(0, Math.floor(bounds.height));
    const x = Math.floor(bounds.x);
    const y = Math.floor(bounds.y);

    if (!visible || width <= 0 || height <= 0) {
      if (this.contentWindow.isVisible()) {
        this.contentWindow.hide();
      }
      return;
    }

    this.contentWindow.setBounds({ x, y, width, height }, false);
    if (!this.contentWindow.isVisible()) {
      this.contentWindow.showInactive();
    }
    this.contentWindow.moveTop();
  }

  destroy(): void {
    if (this.contentWindow && !this.contentWindow.isDestroyed()) {
      this.contentWindow.destroy();
    }
    this.contentWindow = null;
  }

  private bootstrapContentWindow(): void {
    try {
      this.contentWindow = createContentWindow({ parentWindow: this.chromeWindow });
      this.setRuntimeMode('dual-window');
      this.log('runtime-mode dual-window');
    } catch (error) {
      this.contentWindow = null;
      this.setRuntimeMode('single-window-fallback');
      this.log(`runtime-mode single-window-fallback (${String(error)})`);
    }
  }

  private wireWindowSync(): void {
    const chrome = this.chromeWindow;

    chrome.on('closed', () => {
      this.destroy();
    });

    chrome.on('show', () => {
      if (!this.contentWindow || this.contentWindow.isDestroyed()) return;
      this.contentWindow.showInactive();
      this.contentWindow.moveTop();
    });

    chrome.on('restore', () => {
      if (!this.contentWindow || this.contentWindow.isDestroyed()) return;
      this.contentWindow.showInactive();
      this.contentWindow.moveTop();
    });

    chrome.on('hide', () => {
      if (!this.contentWindow || this.contentWindow.isDestroyed()) return;
      this.contentWindow.hide();
    });

    chrome.on('minimize', () => {
      if (!this.contentWindow || this.contentWindow.isDestroyed()) return;
      this.contentWindow.hide();
    });

    chrome.on('closed', () => {
      if (!this.contentWindow || this.contentWindow.isDestroyed()) return;
      this.contentWindow.close();
    });
  }

  private setRuntimeMode(mode: RuntimeMode): void {
    if (this.runtimeMode === mode) return;
    this.runtimeMode = mode;
    this.runtimeModeListeners.forEach(listener => listener(mode));
  }

  private log(message: string): void {
    if (!this.options.debug) return;
    console.info(`[window-stack] ${message}`);
  }
}
