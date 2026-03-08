import type {
  ConsoleEntry,
  DOMNode,
  InspectedElementDetails,
  NetworkRequest,
  PerformanceMetrics,
  SourceFile,
  StorageItem,
} from '@/types/devtools';
import {
  DEVTOOLS_CLEAR_CONSOLE_SCRIPT,
  DEVTOOLS_CLEAR_NETWORK_SCRIPT,
  DEVTOOLS_FETCH_DOM_TREE_SCRIPT,
  DEVTOOLS_FETCH_PERFORMANCE_SCRIPT,
  DEVTOOLS_FETCH_SOURCES_SCRIPT,
  DEVTOOLS_FETCH_STORAGE_SCRIPT,
  DEVTOOLS_FLUSH_SCRIPT,
  DEVTOOLS_INJECTION_SCRIPT,
  DEVTOOLS_RESET_RESPONSIVE_SCRIPT,
  devtoolsApplyResponsivePresetScript,
  devtoolsExecuteScriptWrapper,
  devtoolsInspectSelectorScript,
  devtoolsSetInspectModeScript,
  normalizeStoragePayload,
  parseJsonPayload,
  parseRuntimeFlushPayload,
  type StorageSnapshot,
} from './devtoolsRuntime';

export interface DevtoolsRuntimeUpdate {
  logs: ConsoleEntry[];
  requests: NetworkRequest[];
  inspectedElement: InspectedElementDetails | null;
}

export interface DevtoolsDataSnapshot {
  domTree: DOMNode | null;
  performance: PerformanceMetrics | null;
  sources: SourceFile[];
  storage: Record<'localStorage' | 'sessionStorage' | 'cookie', StorageItem[]>;
}

export type ResponsivePresetId = 'desktop' | 'tablet' | 'mobile' | 'reset';

type RuntimeListener = (payload: DevtoolsRuntimeUpdate) => void;

interface RuntimeWebviewElement extends HTMLElement {
  executeJavaScript?: <T = unknown>(code: string, userGesture?: boolean) => Promise<T>;
  getWebContentsId?: () => number;
}

const POLL_INTERVAL_MS = 140;

function getActiveWebview(): RuntimeWebviewElement | null {
  return (
    document.querySelector('webview[data-active="true"][data-visible="true"]') ??
    document.querySelector('webview[data-active="true"]')
  ) as RuntimeWebviewElement | null;
}

export class DevtoolsBridge {
  private listeners = new Set<RuntimeListener>();
  private pollTimer: number | null = null;
  private pollInFlight = false;
  private injectedWebContentsIds = new Set<number>();

  subscribe(listener: RuntimeListener): () => void {
    this.listeners.add(listener);
    this.ensurePolling();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.stopPolling();
      }
    };
  }

  async executeScript(script: string): Promise<string | null> {
    const webview = getActiveWebview();
    if (!webview) return null;
    await this.ensureRuntime(webview);

    const raw = await webview.executeJavaScript?.(devtoolsExecuteScriptWrapper(script), true);
    const payload = parseJsonPayload<{ success?: boolean; result?: string; error?: string }>(raw, {});
    if (!payload || payload.success === false) {
      return payload?.error ? `Error: ${payload.error}` : null;
    }
    return payload.result ?? null;
  }

  async fetchDOMTree(): Promise<DOMNode | null> {
    const webview = getActiveWebview();
    if (!webview) return null;
    const raw = await webview.executeJavaScript?.(DEVTOOLS_FETCH_DOM_TREE_SCRIPT, true);
    return parseJsonPayload<DOMNode | null>(raw, null);
  }

  async inspectElement(selector: string): Promise<InspectedElementDetails | null> {
    const webview = getActiveWebview();
    if (!webview) return null;
    const raw = await webview.executeJavaScript?.(devtoolsInspectSelectorScript(selector), true);
    return parseJsonPayload<InspectedElementDetails | null>(raw, null);
  }

  async fetchPerformance(): Promise<PerformanceMetrics | null> {
    const webview = getActiveWebview();
    if (!webview) return null;
    const raw = await webview.executeJavaScript?.(DEVTOOLS_FETCH_PERFORMANCE_SCRIPT, true);
    return parseJsonPayload<PerformanceMetrics | null>(raw, null);
  }

  async fetchStorage(): Promise<Record<'localStorage' | 'sessionStorage' | 'cookie', StorageItem[]>> {
    const webview = getActiveWebview();
    if (!webview) {
      return { localStorage: [], sessionStorage: [], cookie: [] };
    }
    const raw = await webview.executeJavaScript?.(DEVTOOLS_FETCH_STORAGE_SCRIPT, true);
    const payload = parseJsonPayload<StorageSnapshot>(raw, {
      localStorage: [],
      sessionStorage: [],
      cookies: [],
    });
    return normalizeStoragePayload(payload);
  }

  async fetchSources(): Promise<SourceFile[]> {
    const webview = getActiveWebview();
    if (!webview) return [];
    const raw = await webview.executeJavaScript?.(DEVTOOLS_FETCH_SOURCES_SCRIPT, true);
    return parseJsonPayload<SourceFile[]>(raw, []);
  }

  async clearConsole(): Promise<void> {
    const webview = getActiveWebview();
    if (!webview) return;
    await this.ensureRuntime(webview);
    await webview.executeJavaScript?.(DEVTOOLS_CLEAR_CONSOLE_SCRIPT, true);
  }

  async clearNetwork(): Promise<void> {
    const webview = getActiveWebview();
    if (!webview) return;
    await this.ensureRuntime(webview);
    await webview.executeJavaScript?.(DEVTOOLS_CLEAR_NETWORK_SCRIPT, true);
  }

  async clearAll(): Promise<void> {
    await Promise.all([this.clearConsole(), this.clearNetwork()]);
  }

  async setInspectMode(enabled: boolean): Promise<void> {
    const webview = getActiveWebview();
    if (!webview) return;
    await this.ensureRuntime(webview);
    await webview.executeJavaScript?.(devtoolsSetInspectModeScript(enabled), true);
  }

  async applyResponsivePreset(preset: ResponsivePresetId): Promise<void> {
    const webview = getActiveWebview();
    if (!webview) return;
    const script =
      preset === 'reset'
        ? DEVTOOLS_RESET_RESPONSIVE_SCRIPT
        : devtoolsApplyResponsivePresetScript(preset);
    await webview.executeJavaScript?.(script, true);
  }

  private ensurePolling(): void {
    if (this.pollTimer !== null) return;
    this.pollTimer = window.setInterval(() => {
      void this.pollRuntime();
    }, POLL_INTERVAL_MS);
    void this.pollRuntime();
  }

  private stopPolling(): void {
    if (this.pollTimer === null) return;
    window.clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  private async pollRuntime(): Promise<void> {
    if (this.pollInFlight) return;

    const webview = getActiveWebview();
    if (!webview || typeof webview.executeJavaScript !== 'function') {
      return;
    }

    this.pollInFlight = true;
    try {
      await this.ensureRuntime(webview);
      const raw = await webview.executeJavaScript<string | null>(DEVTOOLS_FLUSH_SCRIPT, true);
      const payload = parseRuntimeFlushPayload(raw);

      if (payload.logs.length === 0 && payload.requests.length === 0 && !payload.inspectedElement) {
        return;
      }

      const update: DevtoolsRuntimeUpdate = {
        logs: payload.logs,
        requests: payload.requests,
        inspectedElement: payload.inspectedElement ?? null,
      };

      this.listeners.forEach(listener => {
        listener(update);
      });
    } catch {
      // Runtime polling errors are ignored to keep panel resilient.
    } finally {
      this.pollInFlight = false;
    }
  }

  private async ensureRuntime(webview: RuntimeWebviewElement): Promise<void> {
    const webContentsId = webview.getWebContentsId?.() ?? -1;
    if (webContentsId > 0 && this.injectedWebContentsIds.has(webContentsId)) {
      return;
    }

    try {
      await webview.executeJavaScript?.(DEVTOOLS_INJECTION_SCRIPT, true);
      if (webContentsId > 0) {
        this.injectedWebContentsIds.add(webContentsId);
      }
    } catch {
      // If injection fails, next cycle can retry.
    }
  }
}

export const devtoolsBridge = new DevtoolsBridge();

export async function fetchDevtoolsSnapshot(): Promise<DevtoolsDataSnapshot> {
  const [domTree, performance, sources, storage] = await Promise.all([
    devtoolsBridge.fetchDOMTree(),
    devtoolsBridge.fetchPerformance(),
    devtoolsBridge.fetchSources(),
    devtoolsBridge.fetchStorage(),
  ]);

  return {
    domTree,
    performance,
    sources,
    storage,
  };
}
