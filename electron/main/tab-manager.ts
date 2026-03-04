import { BrowserWindow, WebContentsView, type WebContents } from 'electron';
import type {
  BrowserSnapshot,
  NavigateRequest,
  TabActionRequest,
  TabDescriptor,
  ViewportBounds,
} from '../../shared/browser-contract';
import type { PersistedTabSession } from './session-store';

interface ManagedTab {
  descriptor: TabDescriptor;
  view?: WebContentsView;
}

interface TabManagerOptions {
  window: BrowserWindow;
  preloadPath: string;
  onStateChanged: (snapshot: BrowserSnapshot) => void;
  debug: boolean;
}

const INTERNAL_PREFIX = 'notilus://';
const DEFAULT_INTERNAL_URL = 'notilus://speed-dial';
const MAX_SESSION_TABS = 50;

function isInternalUrl(url: string): boolean {
  return url.startsWith(INTERNAL_PREFIX);
}

function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return DEFAULT_INTERNAL_URL;
  if (isInternalUrl(trimmed)) return trimmed;

  const hasProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed);
  return hasProtocol ? trimmed : `https://${trimmed}`;
}

function getInternalTitle(url: string): string {
  return url.replace(INTERNAL_PREFIX, '').replace(/-/g, ' ') || 'speed dial';
}

function deriveTitle(url: string): string {
  if (isInternalUrl(url)) return getInternalTitle(url);
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export class TabManager {
  private readonly tabs = new Map<string, ManagedTab>();
  private readonly order: string[] = [];
  private pinnedTabIds: string[] = [];
  private activeTabId: string | null = null;
  private sequence = 1;
  private viewportBounds: ViewportBounds = { x: 0, y: 0, width: 0, height: 0 };

  constructor(private readonly options: TabManagerOptions) {}

  getSnapshot(): BrowserSnapshot {
    return {
      tabs: this.order
        .map(id => this.tabs.get(id)?.descriptor)
        .filter((tab): tab is TabDescriptor => Boolean(tab))
        .map(tab => ({ ...tab })),
      activeTabId: this.activeTabId,
    };
  }

  restoreSession(session: PersistedTabSession): BrowserSnapshot {
    this.destroyAllTabs();

    const restored = session.tabs.slice(0, MAX_SESSION_TABS);
    for (const tab of restored) {
      this.createTabFromDescriptor(
        {
          id: tab.id,
          title: tab.title || deriveTitle(tab.url),
          url: normalizeUrl(tab.url),
          kind: tab.kind,
          isLoading: tab.kind === 'external',
          canGoBack: false,
          canGoForward: false,
        },
        true
      );
    }

    if (!this.order.length) {
      return this.createTab(DEFAULT_INTERNAL_URL);
    }

    const validIds = new Set(this.order);
    this.pinnedTabIds = session.pinnedTabIds.filter(id => validIds.has(id));

    const restoredActive =
      typeof session.activeTabId === 'string' && this.tabs.has(session.activeTabId)
        ? session.activeTabId
        : this.order[0];

    if (restoredActive) {
      this.activeTabId = restoredActive;
      this.syncViewVisibility();
    }

    this.notifyStateChanged();
    return this.getSnapshot();
  }

  exportSession(pinnedTabIds: string[] = []): PersistedTabSession {
    const effectivePinned =
      pinnedTabIds.length > 0 ? [...new Set(pinnedTabIds)] : [...this.pinnedTabIds];
    return {
      version: 1,
      activeTabId: this.activeTabId,
      tabs: this.order
        .map(id => this.tabs.get(id)?.descriptor)
        .filter((tab): tab is TabDescriptor => Boolean(tab))
        .slice(0, MAX_SESSION_TABS)
        .map(tab => ({
          id: tab.id,
          url: tab.url,
          title: tab.title,
          kind: tab.kind,
        })),
      pinnedTabIds: effectivePinned,
      updatedAt: new Date().toISOString(),
    };
  }

  setPinnedTabs(tabIds: string[]): void {
    const validIds = new Set(this.order);
    this.pinnedTabIds = tabIds.filter(id => validIds.has(id));
  }

  createTab(rawUrl = DEFAULT_INTERNAL_URL): BrowserSnapshot {
    const url = normalizeUrl(rawUrl);
    const kind = isInternalUrl(url) ? 'internal' : 'external';
    const tabId = this.createTabFromDescriptor(
      {
        id: this.createTabId(),
        title: deriveTitle(url),
        url,
        kind,
        isLoading: kind === 'external',
        canGoBack: false,
        canGoForward: false,
      },
      true
    );

    this.log('tab:create', `${tabId} -> ${url}`);
    this.activateTabInternal(tabId);
    this.notifyStateChanged();
    return this.getSnapshot();
  }

  closeTab(tabId: string): BrowserSnapshot {
    const target = this.tabs.get(tabId);
    if (!target) return this.getSnapshot();

    if (target.view) {
      this.destroyView(target.view);
    }

    const closingIndex = this.order.indexOf(tabId);
    this.tabs.delete(tabId);
    this.order.splice(closingIndex, 1);
    this.pinnedTabIds = this.pinnedTabIds.filter(id => id !== tabId);
    this.log('tab:close', tabId);

    if (this.order.length === 0) {
      return this.createTab(DEFAULT_INTERNAL_URL);
    }

    if (this.activeTabId === tabId) {
      const fallbackIndex = Math.max(0, Math.min(closingIndex, this.order.length - 1));
      this.activeTabId = this.order[fallbackIndex] ?? null;
    }

    this.syncViewVisibility();
    this.notifyStateChanged();
    return this.getSnapshot();
  }

  activateTab(tabId: string): BrowserSnapshot {
    if (!this.tabs.has(tabId)) return this.getSnapshot();
    this.activateTabInternal(tabId);
    this.notifyStateChanged();
    return this.getSnapshot();
  }

  navigate(request: NavigateRequest): BrowserSnapshot {
    const targetId = request.tabId ?? this.activeTabId;
    if (!targetId) return this.getSnapshot();

    const tab = this.tabs.get(targetId);
    if (!tab) return this.getSnapshot();

    const url = normalizeUrl(request.url);
    if (isInternalUrl(url)) {
      if (tab.view) {
        this.destroyView(tab.view);
        tab.view = undefined;
      }
      tab.descriptor = {
        ...tab.descriptor,
        url,
        title: deriveTitle(url),
        kind: 'internal',
        isLoading: false,
        canGoBack: false,
        canGoForward: false,
      };
      this.log('tab:navigate', `${targetId} -> ${url}`);
      this.activateTabInternal(targetId);
      this.notifyStateChanged();
      return this.getSnapshot();
    }

    tab.descriptor.kind = 'external';
    tab.descriptor.url = url;
    tab.descriptor.title = deriveTitle(url);
    tab.descriptor.isLoading = true;
    if (!tab.view) {
      tab.view = this.createExternalView(targetId, url);
    } else {
      void tab.view.webContents.loadURL(url).catch(error => {
        this.log('tab:navigate:error', String(error));
      });
    }

    this.log('tab:navigate', `${targetId} -> ${url}`);
    this.activateTabInternal(targetId);
    this.notifyStateChanged();
    return this.getSnapshot();
  }

  goBack(request: TabActionRequest): BrowserSnapshot {
    const target = this.resolveTargetTab(request.tabId);
    if (target?.view?.webContents.canGoBack()) {
      target.view.webContents.goBack();
      this.log('tab:go-back', target.descriptor.id);
    }
    return this.getSnapshot();
  }

  goForward(request: TabActionRequest): BrowserSnapshot {
    const target = this.resolveTargetTab(request.tabId);
    if (target?.view?.webContents.canGoForward()) {
      target.view.webContents.goForward();
      this.log('tab:go-forward', target.descriptor.id);
    }
    return this.getSnapshot();
  }

  reload(request: TabActionRequest): BrowserSnapshot {
    const target = this.resolveTargetTab(request.tabId);
    if (target?.view) {
      target.view.webContents.reload();
      this.log('tab:reload', target.descriptor.id);
    }
    return this.getSnapshot();
  }

  openDevTools(request: TabActionRequest): void {
    const target = this.resolveTargetTab(request.tabId);
    if (!target?.view) return;
    target.view.webContents.openDevTools({ mode: 'detach' });
    this.log('tab:open-devtools', target.descriptor.id);
  }

  setViewportBounds(bounds: ViewportBounds): void {
    this.viewportBounds = {
      x: Math.max(0, Math.floor(bounds.x)),
      y: Math.max(0, Math.floor(bounds.y)),
      width: Math.max(0, Math.floor(bounds.width)),
      height: Math.max(0, Math.floor(bounds.height)),
    };
    this.syncViewVisibility();
  }

  getActiveExternalWebContents(): WebContents | null {
    const target = this.resolveTargetTab(this.activeTabId ?? undefined);
    if (!target?.view) return null;
    if (target.descriptor.kind !== 'external') return null;
    return target.view.webContents;
  }

  private resolveTargetTab(tabId?: string): ManagedTab | null {
    const resolvedId = tabId ?? this.activeTabId;
    if (!resolvedId) return null;
    return this.tabs.get(resolvedId) ?? null;
  }

  private createTabId(): string {
    const id = `tab-${Date.now()}-${this.sequence}`;
    this.sequence += 1;
    return id;
  }

  private createTabFromDescriptor(descriptor: TabDescriptor, withInitialLoad: boolean): string {
    const managedTab: ManagedTab = { descriptor: { ...descriptor } };

    if (descriptor.kind === 'external') {
      managedTab.view = this.createExternalView(descriptor.id, descriptor.url, withInitialLoad);
      managedTab.descriptor.isLoading = true;
    }

    this.tabs.set(descriptor.id, managedTab);
    this.order.push(descriptor.id);
    return descriptor.id;
  }

  private createExternalView(
    tabId: string,
    initialUrl: string,
    shouldLoad: boolean
  ): WebContentsView {
    const view = new WebContentsView({
      webPreferences: {
        preload: this.options.preloadPath,
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
      },
    });

    view.setVisible(false);
    this.options.window.contentView.addChildView(view);
    view.setBounds(this.getEffectiveBounds());
    this.attachWebContentsListeners(tabId, view);
    if (shouldLoad) {
      void view.webContents.loadURL(initialUrl).catch(error => {
        this.log('tab:load:error', String(error));
      });
    }
    return view;
  }

  private attachWebContentsListeners(tabId: string, view: WebContentsView): void {
    const refresh = () => {
      this.refreshTabFromWebContents(tabId);
      this.notifyStateChanged();
    };

    view.webContents.setWindowOpenHandler(({ url }) => {
      this.createTab(url);
      return { action: 'deny' };
    });

    view.webContents.on('did-start-loading', refresh);
    view.webContents.on('did-stop-loading', refresh);
    view.webContents.on('did-navigate', refresh);
    view.webContents.on('did-navigate-in-page', refresh);
    view.webContents.on('did-fail-load', refresh);
    view.webContents.on('page-title-updated', event => {
      event.preventDefault();
      refresh();
    });
  }

  private refreshTabFromWebContents(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab?.view) return;

    const { webContents } = tab.view;
    const currentUrl = webContents.getURL() || tab.descriptor.url;
    const currentTitle = webContents.getTitle().trim();

    tab.descriptor = {
      ...tab.descriptor,
      kind: 'external',
      url: currentUrl,
      title: currentTitle || deriveTitle(currentUrl),
      isLoading: webContents.isLoading(),
      canGoBack: webContents.canGoBack(),
      canGoForward: webContents.canGoForward(),
    };
  }

  private activateTabInternal(tabId: string): void {
    this.activeTabId = tabId;
    this.syncViewVisibility();
    this.log('tab:activate', tabId);
  }

  private syncViewVisibility(): void {
    const activeId = this.activeTabId;
    if (!activeId) return;

    const bounds = this.getEffectiveBounds();
    for (const id of this.order) {
      const tab = this.tabs.get(id);
      if (!tab?.view) continue;

      const shouldShow = id === activeId && tab.descriptor.kind === 'external';
      tab.view.setVisible(shouldShow);
      if (shouldShow) {
        tab.view.setBounds(bounds);
      }
    }
  }

  private destroyView(view: WebContentsView): void {
    try {
      this.options.window.contentView.removeChildView(view);
    } catch {
      // Ignore if already detached.
    }

    if (!view.webContents.isDestroyed()) {
      (view.webContents as any).destroy?.();
    }
  }

  private destroyAllTabs(): void {
    for (const id of this.order) {
      const tab = this.tabs.get(id);
      if (!tab?.view) continue;
      this.destroyView(tab.view);
    }
    this.tabs.clear();
    this.order.splice(0, this.order.length);
    this.pinnedTabIds = [];
    this.activeTabId = null;
  }

  private getEffectiveBounds(): ViewportBounds {
    if (this.viewportBounds.width > 0 && this.viewportBounds.height > 0) {
      return this.viewportBounds;
    }

    const bounds = this.options.window.getContentBounds();
    return { x: 0, y: 0, width: bounds.width, height: bounds.height };
  }

  private notifyStateChanged(): void {
    this.options.onStateChanged(this.getSnapshot());
  }

  private log(event: string, message: string): void {
    if (!this.options.debug) return;
    console.info(`[tab-manager] ${event} ${message}`);
  }
}
