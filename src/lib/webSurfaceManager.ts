import type { BrowserTab } from '@/hooks/useBrowserState';
import {
  desktopBindTabWebContents,
  desktopSetTabRenderMode,
  desktopUnbindTabWebContents,
  desktopUpdateTabRuntime,
} from '@/lib/electronBridge';
import {
  buildRuntimeExtensionSignature,
  getRuntimeExtensionsForUrl,
} from '@/lib/extensionsRuntime';

interface WebviewTag extends HTMLElement {
  getWebContentsId: () => number;
  getURL: () => string;
  getTitle: () => string;
  isLoading: () => boolean;
  canGoBack: () => boolean;
  canGoForward: () => boolean;
  loadURL: (url: string) => Promise<void>;
  reload: () => void;
  setZoomFactor?: (factor: number) => void;
  insertCSS?: (css: string) => Promise<string>;
  executeJavaScript?: <T = unknown>(code: string, userGesture?: boolean) => Promise<T>;
}

type SurfaceMode = 'tab' | 'panel';

type AutoSwitchInfo = {
  origin: string;
  reason: 'blocked';
};

interface WebSurface {
  id: string;
  mode: SurfaceMode;
  url: string;
  serviceId?: string;
  tabId?: string;
  webview: WebviewTag;
  partition: string;
  container: HTMLElement | null;
  domReady: boolean;
  boundTabId: string | null;
  requestedUrl: string | null;
  runtimeSignature: string | null;
  runtimeExtensionSignature: string | null;
  nativeRequested: boolean;
  emitRuntime?: () => Promise<void>;
  cleanup?: () => void;
}

type PendingPanelTransfer = {
  serviceId: string;
  url: string;
  requestedAt: number;
};

const BLOCKED_ERROR_SIGNATURES = [
  'ERR_BLOCKED_BY_RESPONSE',
  'ERR_BLOCKED_BY_CLIENT',
  'ERR_BLOCKED_BY_CSP',
  'ERR_BLOCKED_BY_X_FRAME_OPTIONS',
];
const DEFAULT_PARTITION = 'persist:notilus-default';
const PRIVATE_PARTITION_PREFIX = 'private:';

function deriveTitle(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function isInvalidRuntimeUrl(url: string): boolean {
  if (!url) return true;
  if (url === 'about:blank') return true;
  if (url.startsWith('chrome-error://')) return true;
  return false;
}

function resolveRuntimeUrl(rawUrl: string, fallbackUrl: string): string {
  const candidate = rawUrl.trim();
  return isInvalidRuntimeUrl(candidate) ? fallbackUrl : candidate;
}

function normalizeComparableUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  if (rawUrl.startsWith('notilus://')) return rawUrl;
  try {
    const parsed = new URL(rawUrl);
    parsed.hash = '';
    const normalizedPath = parsed.pathname.replace(/\/+$/, '');
    parsed.pathname = normalizedPath || '/';
    const normalized = parsed.toString();
    return normalized.endsWith('/') && parsed.pathname === '/' ? normalized.slice(0, -1) : normalized;
  } catch {
    return rawUrl;
  }
}

function getOrigin(url: string): string | null {
  if (!url) return null;
  if (url.startsWith('notilus://')) return url;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function extractPopupUrl(rawEvent: Event): string | null {
  const event = rawEvent as unknown as Record<string, unknown>;
  const detail = (event.detail as Record<string, unknown> | undefined) ?? {};

  const candidates = [
    event.url,
    event.targetUrl,
    event.newURL,
    detail.url,
    detail.targetURL,
    detail.targetUrl,
    detail.newURL,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const trimmed = candidate.trim();
    if (!trimmed) continue;
    return trimmed;
  }
  return null;
}

function createSurfaceId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

class WebSurfaceManager {
  private surfaces = new Map<string, WebSurface>();
  private tabSurfaceByTabId = new Map<string, string>();
  private panelSurfaceByServiceId = new Map<string, string>();
  private tabContainers = new Map<string, HTMLElement>();
  private panelContainers = new Map<string, HTMLElement>();
  private activeTabId: string | null = null;
  private zoomPct = 100;
  private onCreateTab: ((url: string) => void) | null = null;
  private pendingPanelTransfer: PendingPanelTransfer | null = null;
  private autoSwitchByTabId = new Map<string, AutoSwitchInfo>();

  private resolvePartitionForTab(tab: BrowserTab) {
    if (tab.isPrivate) {
      return `${PRIVATE_PARTITION_PREFIX}${tab.id}`;
    }
    return DEFAULT_PARTITION;
  }

  setOnCreateTab(callback: ((url: string) => void) | null) {
    this.onCreateTab = callback;
  }

  setActiveTabId(tabId: string | null) {
    this.activeTabId = tabId;
    for (const surface of this.surfaces.values()) {
      if (!surface.tabId) continue;
      surface.webview.dataset.active = surface.tabId === tabId ? 'true' : 'false';
    }
  }

  setZoom(zoomPct: number) {
    this.zoomPct = zoomPct;
    for (const surface of this.surfaces.values()) {
      if (surface.mode !== 'tab') continue;
      this.applyZoomPct(surface, zoomPct);
    }
  }

  registerTabContainer(tabId: string, container: HTMLElement | null) {
    if (!container) {
      this.tabContainers.delete(tabId);
      return;
    }
    this.tabContainers.set(tabId, container);
    const surfaceId = this.tabSurfaceByTabId.get(tabId);
    if (surfaceId) {
      const surface = this.surfaces.get(surfaceId);
      if (surface) this.attachSurface(surface, container);
    }
  }

  registerPanelContainer(serviceId: string, container: HTMLElement | null) {
    if (!container) {
      this.panelContainers.delete(serviceId);
      return;
    }
    this.panelContainers.set(serviceId, container);
    const surfaceId = this.panelSurfaceByServiceId.get(serviceId);
    if (surfaceId) {
      const surface = this.surfaces.get(surfaceId);
      if (surface) this.attachSurface(surface, container);
    }
  }

  requestPanelToTabTransfer(serviceId: string, url: string) {
    this.pendingPanelTransfer = {
      serviceId,
      url,
      requestedAt: Date.now(),
    };
  }

  ensurePanelSurface(serviceId: string, url: string): { closeTabId: string | null } {
    if (typeof document === 'undefined') return { closeTabId: null };

    let surfaceId = this.panelSurfaceByServiceId.get(serviceId);
    let surface: WebSurface | undefined;
    if (surfaceId) {
      surface = this.surfaces.get(surfaceId);
    }

    if (surface && surface.partition !== DEFAULT_PARTITION) {
      this.destroySurface(surface);
      this.surfaces.delete(surface.id);
      surface = undefined;
      surfaceId = undefined;
    }

    if (!surface) {
      surface = this.createSurface({
        url,
        mode: 'panel',
        serviceId,
        partition: DEFAULT_PARTITION,
      });
      surfaceId = surface.id;
      this.surfaces.set(surfaceId, surface);
      this.panelSurfaceByServiceId.set(serviceId, surfaceId);
    }
    surface.url = url;

    const closeTabId = surface.tabId ?? null;
    if (surface.tabId) {
      this.tabSurfaceByTabId.delete(surface.tabId);
      surface.tabId = undefined;
    }

    this.configureSurfaceMode(surface, 'panel');
    const container = this.panelContainers.get(serviceId);
    if (container) this.attachSurface(surface, container);

    return { closeTabId };
  }

  reloadPanelSurface(serviceId: string) {
    const surfaceId = this.panelSurfaceByServiceId.get(serviceId);
    if (!surfaceId) return;
    const surface = this.surfaces.get(surfaceId);
    surface?.webview.reload?.();
  }

  syncTabs(tabs: BrowserTab[], activeTabId: string, zoomPct: number) {
    this.activeTabId = activeTabId;
    this.zoomPct = zoomPct;

    const externalTabs = tabs.filter(tab => tab.kind === 'external' && tab.renderMode !== 'native');
    const nextTabIds = new Set(externalTabs.map(tab => tab.id));
    const allTabIds = new Set(tabs.map(tab => tab.id));

    for (const [tabId, surfaceId] of this.tabSurfaceByTabId) {
      if (nextTabIds.has(tabId)) continue;
      this.releaseTab(tabId, surfaceId);
    }

    this.handleAutoSwitchRevert(tabs);
    for (const tabId of Array.from(this.autoSwitchByTabId.keys())) {
      if (!allTabIds.has(tabId)) {
        this.autoSwitchByTabId.delete(tabId);
      }
    }

    for (const tab of externalTabs) {
      this.ensureTabSurface(tab);
    }

    this.setActiveTabId(activeTabId);
  }

  refreshExtensions(tabId: string) {
    const surfaceId = this.tabSurfaceByTabId.get(tabId);
    if (!surfaceId) return;
    const surface = this.surfaces.get(surfaceId);
    if (!surface || surface.mode !== 'tab') return;
    surface.runtimeExtensionSignature = null;
    surface.webview.reload?.();
  }

  private ensureTabSurface(tab: BrowserTab) {
    if (typeof document === 'undefined') return;
    if (tab.kind !== 'external' || tab.renderMode === 'native') return;

    let surfaceId = this.tabSurfaceByTabId.get(tab.id);
    if (!surfaceId && this.pendingPanelTransfer && !tab.isPrivate) {
      const normalizedTarget = normalizeComparableUrl(this.pendingPanelTransfer.url);
      const normalizedTab = normalizeComparableUrl(tab.url);
      if (normalizedTarget === normalizedTab || tab.id === this.activeTabId) {
        const candidateSurfaceId = this.panelSurfaceByServiceId.get(this.pendingPanelTransfer.serviceId);
        if (candidateSurfaceId) {
          surfaceId = candidateSurfaceId;
          this.pendingPanelTransfer = null;
        }
      }
    }

    let surface: WebSurface | undefined;
    if (surfaceId) {
      surface = this.surfaces.get(surfaceId);
    }

    const desiredPartition = this.resolvePartitionForTab(tab);
    if (surface && surface.partition !== desiredPartition) {
      this.destroySurface(surface);
      this.surfaces.delete(surface.id);
      surface = undefined;
      surfaceId = undefined;
    }

    if (!surface) {
      surface = this.createSurface({
        url: tab.url,
        mode: 'tab',
        partition: desiredPartition,
      });
      surfaceId = surface.id;
      this.surfaces.set(surfaceId, surface);
    }

    surface.tabId = tab.id;
    surface.url = tab.url;
    surface.webview.dataset.tabId = tab.id;
    surface.webview.dataset.active = tab.id === this.activeTabId ? 'true' : 'false';

    this.tabSurfaceByTabId.set(tab.id, surfaceId);

    this.configureSurfaceMode(surface, 'tab');
    void this.bindSurfaceToTab(surface, tab.id);
    void surface.emitRuntime?.();

    const container = this.tabContainers.get(tab.id);
    if (container) this.attachSurface(surface, container);

    this.syncSurfaceUrl(surface, tab.url);
  }

  private releaseTab(tabId: string, surfaceId?: string) {
    const resolvedSurfaceId = surfaceId ?? this.tabSurfaceByTabId.get(tabId);
    if (!resolvedSurfaceId) return;

    const surface = this.surfaces.get(resolvedSurfaceId);
    if (!surface) {
      this.tabSurfaceByTabId.delete(tabId);
      return;
    }

    this.tabSurfaceByTabId.delete(tabId);
    if (surface.boundTabId) {
      void desktopUnbindTabWebContents({ tabId: surface.boundTabId });
      surface.boundTabId = null;
    }
    surface.tabId = undefined;
    surface.nativeRequested = false;

    if (surface.serviceId) {
      this.configureSurfaceMode(surface, 'panel');
      const container = this.panelContainers.get(surface.serviceId);
      if (container) this.attachSurface(surface, container);
      return;
    }

    this.destroySurface(surface);
    this.surfaces.delete(resolvedSurfaceId);
  }

  private handleAutoSwitchRevert(tabs: BrowserTab[]) {
    for (const tab of tabs) {
      if (tab.kind !== 'external' || tab.renderMode !== 'native') continue;
      const autoSwitch = this.autoSwitchByTabId.get(tab.id);
      if (!autoSwitch) continue;
      const currentOrigin = getOrigin(tab.url);
      if (!currentOrigin || currentOrigin === autoSwitch.origin) continue;
      this.autoSwitchByTabId.delete(tab.id);
      const surfaceId = this.tabSurfaceByTabId.get(tab.id);
      const surface = surfaceId ? this.surfaces.get(surfaceId) : undefined;
      if (surface) surface.nativeRequested = false;
      void desktopSetTabRenderMode({ tabId: tab.id, mode: 'webview' });
    }
  }

  private syncSurfaceUrl(surface: WebSurface, targetUrl: string) {
    if (surface.mode !== 'tab') return;
    if (!surface.domReady) return;

    const normalizedTarget = normalizeComparableUrl(targetUrl);
    if (surface.requestedUrl === normalizedTarget) return;

    let currentUrl = '';
    try {
      currentUrl = surface.webview.getURL();
    } catch {
      surface.requestedUrl = normalizedTarget;
      return;
    }

    const normalizedCurrent = normalizeComparableUrl(resolveRuntimeUrl(currentUrl, targetUrl));
    if (normalizedCurrent !== normalizedTarget) {
      void surface.webview.loadURL(targetUrl).catch(() => {
        // ignore transient load errors
      });
    }
    surface.requestedUrl = normalizedTarget;
  }

  private async bindSurfaceToTab(
    surface: WebSurface,
    tabId: string,
    emitRuntime?: () => Promise<void>
  ) {
    if (!surface.domReady) return;
    if (surface.boundTabId === tabId) return;

    if (surface.boundTabId) {
      await desktopUnbindTabWebContents({ tabId: surface.boundTabId });
      surface.boundTabId = null;
    }

    try {
      const webContentsId = surface.webview.getWebContentsId();
      if (typeof webContentsId === 'number' && Number.isFinite(webContentsId)) {
        surface.boundTabId = tabId;
        await desktopBindTabWebContents({ tabId, webContentsId });
        if (emitRuntime) await emitRuntime();
      }
    } catch {
      // ignore bind failure
    }
  }

  private configureSurfaceMode(surface: WebSurface, mode: SurfaceMode) {
    if (surface.mode === mode) return;
    surface.mode = mode;

    if (mode === 'panel') {
      surface.webview.dataset.active = 'false';
      surface.webview.dataset.visible = 'true';
      surface.webview.dataset.panel = surface.serviceId ?? '';
      surface.webview.dataset.tabId = '';
      surface.nativeRequested = false;
      this.applyZoomFactor(surface, 1);
      if (surface.boundTabId) {
        void desktopUnbindTabWebContents({ tabId: surface.boundTabId });
        surface.boundTabId = null;
      }
    }

    if (mode === 'tab') {
      surface.webview.dataset.panel = '';
      this.applyZoomPct(surface, this.zoomPct);
    }
  }

  private createSurface({
    url,
    mode,
    serviceId,
    partition,
  }: {
    url: string;
    mode: SurfaceMode;
    serviceId?: string;
    partition: string;
  }) {
    const webview = document.createElement('webview') as WebviewTag;
    webview.setAttribute('partition', partition);
    webview.setAttribute('allowpopups', 'true');
    webview.setAttribute('data-surface', 'true');
    webview.className = 'bg-transparent';
    webview.src = url;
    Object.assign(webview.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      border: '0',
      background: 'transparent',
    });

    const surface: WebSurface = {
      id: createSurfaceId(serviceId ?? 'tab'),
      mode,
      url,
      serviceId,
      webview,
      partition,
      container: null,
      domReady: false,
      boundTabId: null,
      requestedUrl: null,
      runtimeSignature: null,
      runtimeExtensionSignature: null,
      nativeRequested: false,
    };

    this.attachListeners(surface);
    return surface;
  }

  private attachSurface(surface: WebSurface, container: HTMLElement) {
    if (surface.container === container && container.contains(surface.webview)) return;

    if (surface.webview.parentElement && surface.webview.parentElement !== container) {
      surface.webview.parentElement.removeChild(surface.webview);
    }

    container.appendChild(surface.webview);
    surface.container = container;

    if (surface.mode === 'tab') {
      this.applyZoomPct(surface, this.zoomPct);
    } else {
      this.applyZoomFactor(surface, 1);
    }
  }

  private attachListeners(surface: WebSurface) {
    const webview = surface.webview;

    const emitRuntime = async () => {
      if (surface.mode !== 'tab') return;
      if (!surface.tabId || !surface.domReady) return;

      let rawUrl = '';
      let rawTitle = '';
      let isLoading = false;
      let canGoBack = false;
      let canGoForward = false;

      try {
        rawUrl = webview.getURL();
        rawTitle = webview.getTitle();
        isLoading = webview.isLoading();
        canGoBack = webview.canGoBack();
        canGoForward = webview.canGoForward();
      } catch {
        return;
      }

      const currentUrl = resolveRuntimeUrl(rawUrl, surface.url);
      const runtimeTitle = rawTitle.trim() || deriveTitle(currentUrl);
      const payload = {
        tabId: surface.tabId,
        url: currentUrl,
        title: runtimeTitle,
        isLoading,
        canGoBack,
        canGoForward,
      };

      const signature = JSON.stringify(payload);
      if (surface.runtimeSignature === signature) return;
      surface.runtimeSignature = signature;
      await desktopUpdateTabRuntime(payload);
    };

    surface.emitRuntime = emitRuntime;

    const applyExtensions = async () => {
      if (surface.mode !== 'tab') return;
      if (!surface.domReady) return;

      let currentUrl = '';
      try {
        currentUrl = webview.getURL();
      } catch {
        return;
      }
      const resolvedUrl = resolveRuntimeUrl(currentUrl, surface.url);
      if (resolvedUrl.startsWith('notilus://')) return;

      const signature = `${normalizeComparableUrl(resolvedUrl)}|${buildRuntimeExtensionSignature(resolvedUrl)}`;
      if (surface.runtimeExtensionSignature === signature) return;

      const effects = getRuntimeExtensionsForUrl(resolvedUrl);
      for (const effect of effects) {
        try {
          if (effect.css) {
            await webview.insertCSS?.(effect.css);
          }
          if (effect.js) {
            await webview.executeJavaScript?.(effect.js, true);
          }
        } catch {
          // ignore extension failures
        }
      }
      surface.runtimeExtensionSignature = signature;
    };

    const handleDomReady = async () => {
      surface.domReady = true;
      if (surface.mode === 'panel') {
        this.applyZoomFactor(surface, 1);
      } else {
        this.applyZoomPct(surface, this.zoomPct);
      }

      if (surface.mode === 'tab' && surface.tabId) {
        await this.bindSurfaceToTab(surface, surface.tabId, emitRuntime);
        this.syncSurfaceUrl(surface, surface.url);
      }
    };

    const handlePopup = (event: Event) => {
      const targetUrl = extractPopupUrl(event);
      if (!targetUrl) return;
      (event as { preventDefault?: () => void }).preventDefault?.();
      this.onCreateTab?.(targetUrl);
    };

    const handleFailLoad = (event: Event) => {
      const detail = event as unknown as {
        errorDescription?: string;
        isMainFrame?: boolean;
      };
      const isMainFrame = detail.isMainFrame !== false;
      const description = typeof detail.errorDescription === 'string' ? detail.errorDescription : '';
      const upperDescription = description.toUpperCase();
      const blockedByResponse = BLOCKED_ERROR_SIGNATURES.some(signature => upperDescription.includes(signature));

      if (surface.mode === 'tab' && surface.tabId && isMainFrame && blockedByResponse) {
        if (!surface.nativeRequested) {
          surface.nativeRequested = true;
          const origin = getOrigin(surface.url);
          if (origin) {
            this.autoSwitchByTabId.set(surface.tabId, { origin, reason: 'blocked' });
          }
          void desktopSetTabRenderMode({ tabId: surface.tabId, mode: 'native', reason: 'blocked' });
        }
      }

      void emitRuntime();
    };

    const listeners: Array<[string, EventListener]> = [
      ['dom-ready', () => void handleDomReady()],
      ['did-start-loading', () => void emitRuntime()],
      [
        'did-stop-loading',
        () => {
          void emitRuntime();
          void applyExtensions();
        },
      ],
      ['did-navigate', () => void emitRuntime()],
      ['did-navigate-in-page', () => void emitRuntime()],
      ['page-title-updated', () => void emitRuntime()],
      ['did-fail-load', handleFailLoad],
      ['new-window', handlePopup],
      ['did-create-window', handlePopup],
    ];

    for (const [name, listener] of listeners) {
      webview.addEventListener(name, listener);
    }

    surface.cleanup = () => {
      for (const [name, listener] of listeners) {
        webview.removeEventListener(name, listener);
      }
      if (surface.boundTabId) {
        void desktopUnbindTabWebContents({ tabId: surface.boundTabId });
        surface.boundTabId = null;
      }
    };
  }

  private destroySurface(surface: WebSurface) {
    surface.cleanup?.();
    if (surface.webview.parentElement) {
      surface.webview.parentElement.removeChild(surface.webview);
    }
  }

  private isSurfaceAttached(surface: WebSurface) {
    if (!surface.domReady) return false;
    const webviewConnected = surface.webview.isConnected;
    const parentConnected = surface.webview.parentElement?.isConnected ?? false;
    return webviewConnected || parentConnected;
  }

  private applyZoomFactor(surface: WebSurface, factor: number) {
    if (!this.isSurfaceAttached(surface)) return;
    try {
      surface.webview.setZoomFactor?.(factor);
    } catch {
      // ignore zoom failures for detached surfaces
    }
  }

  private applyZoomPct(surface: WebSurface, zoomPct: number) {
    if (!this.isSurfaceAttached(surface)) return;
    try {
      surface.webview.setZoomFactor?.(this.clampZoom(zoomPct));
    } catch {
      // ignore zoom failures for detached surfaces
    }
  }

  private clampZoom(value: number) {
    return Math.max(0.25, Math.min(5, value / 100));
  }
}

export const webSurfaceManager = new WebSurfaceManager();

export const webSurfaceManagerApi = {
  setOnCreateTab: (callback: ((url: string) => void) | null) =>
    webSurfaceManager.setOnCreateTab(callback),
  syncTabs: (tabs: BrowserTab[], activeTabId: string, zoomPct: number) =>
    webSurfaceManager.syncTabs(tabs, activeTabId, zoomPct),
  registerTabContainer: (tabId: string, container: HTMLElement | null) =>
    webSurfaceManager.registerTabContainer(tabId, container),
  registerPanelContainer: (serviceId: string, container: HTMLElement | null) =>
    webSurfaceManager.registerPanelContainer(serviceId, container),
  ensurePanelSurface: (serviceId: string, url: string) =>
    webSurfaceManager.ensurePanelSurface(serviceId, url),
  requestPanelToTabTransfer: (serviceId: string, url: string) =>
    webSurfaceManager.requestPanelToTabTransfer(serviceId, url),
  reloadPanelSurface: (serviceId: string) => webSurfaceManager.reloadPanelSurface(serviceId),
  setActiveTabId: (tabId: string | null) => webSurfaceManager.setActiveTabId(tabId),
  setZoom: (zoomPct: number) => webSurfaceManager.setZoom(zoomPct),
  refreshExtensions: (tabId: string) => webSurfaceManager.refreshExtensions(tabId),
};
