import {
  app,
  Menu,
  clipboard,
  webContents,
  WebContentsView,
  type BrowserWindow,
  type MenuItemConstructorOptions,
  type WebContents,
} from 'electron';
import type {
  BrowserSnapshot,
  DevToolsDockState,
  NavigateRequest,
  TabRenderMode,
  TabActionRequest,
  TabDescriptor,
  TabRuntimeUpdateRequest,
  ViewportBounds,
} from '../../shared/browser-contract';
import { DevToolsDockManager } from './devtools-dock-manager';
import type { PersistedTabSession } from './session-store';

interface ManagedTab {
  descriptor: TabDescriptor;
}

interface TabManagerOptions {
  onStateChanged: (snapshot: BrowserSnapshot) => void;
  debug: boolean;
  getMainWindow: () => BrowserWindow | null;
  onDevToolsDockStateChanged?: (state: DevToolsDockState) => void;
}

const INTERNAL_PREFIX = 'notilus://';
const DEFAULT_INTERNAL_URL = 'notilus://speed-dial';
const SHARED_WEBVIEW_PARTITION = 'persist:notilus-default';
const PRIVATE_PARTITION_PREFIX = 'private:';

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

function normalizeRuntimeUrl(rawUrl: string, fallback: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return fallback;
  if (trimmed === 'about:blank') return fallback;
  if (trimmed.startsWith('chrome-error://')) return fallback;
  return trimmed;
}

function isDevToolsShortcutInput(input: Electron.Input): boolean {
  const key = typeof input.key === 'string' ? input.key.toUpperCase() : '';
  return key === 'F12' || ((input.control || input.meta) && input.shift && key === 'I');
}

export class TabManager {
  private readonly tabs = new Map<string, ManagedTab>();
  private readonly order: string[] = [];
  private activeTabId: string | null = null;
  private sequence = 1;
  private pinnedTabIds = new Set<string>();
  private readonly webContentsByTabId = new Map<string, number>();
  private readonly nativeViewsByTabId = new Map<string, WebContentsView>();
  private readonly nativeViewCleanupByTabId = new Map<string, () => void>();
  private viewportBounds: ViewportBounds | null = null;
  private readonly contextMenuByWebContentsId = new Map<
    number,
    { tabId: string; cleanup: () => void }
  >();
  private readonly devToolsDock: DevToolsDockManager;

  constructor(private readonly options: TabManagerOptions) {
    this.devToolsDock = new DevToolsDockManager({
      debug: options.debug,
      getMainWindow: options.getMainWindow,
      onStateChanged: state => {
        options.onDevToolsDockStateChanged?.(state);
      },
    });
  }

  getSnapshot(): BrowserSnapshot {
    return {
      tabs: this.order
        .map(id => this.tabs.get(id)?.descriptor)
        .filter((tab): tab is TabDescriptor => Boolean(tab))
        .map(tab => ({ ...tab })),
      activeTabId: this.activeTabId,
    };
  }

  exportSession(): PersistedTabSession {
    const tabs = this.order
      .map(id => this.tabs.get(id)?.descriptor)
      .filter((tab): tab is TabDescriptor => Boolean(tab))
      .filter(tab => !tab.isPrivate)
      .map(tab => ({
        id: tab.id,
        url: tab.url,
        title: tab.title,
        kind: tab.kind,
        renderMode: tab.renderMode,
        isPrivate: tab.isPrivate,
      }));

    const validIds = new Set(tabs.map(tab => tab.id));
    const activeTabId =
      this.activeTabId && validIds.has(this.activeTabId) ? this.activeTabId : tabs[0]?.id ?? null;

    return {
      version: 1,
      activeTabId,
      tabs,
      pinnedTabIds: Array.from(this.pinnedTabIds).filter(id => validIds.has(id)),
      updatedAt: new Date().toISOString(),
    };
  }

  restoreSession(session: PersistedTabSession): BrowserSnapshot {
    this.resetTabs();

    const tabs = Array.isArray(session.tabs) ? session.tabs : [];
    const trimmed = tabs.slice(0, 50);

    for (const tab of trimmed) {
      if (!tab || typeof tab.id !== 'string' || typeof tab.url !== 'string') continue;
      const url = normalizeUrl(tab.url);
      const kind = isInternalUrl(url) ? 'internal' : 'external';
      const descriptor: TabDescriptor = {
        id: tab.id,
        title: tab.title?.trim() || deriveTitle(url),
        url,
        kind,
        renderMode: kind === 'external' ? 'webview' : undefined,
        isPrivate: undefined,
        isLoading: kind === 'external',
        canGoBack: false,
        canGoForward: false,
      };
      this.tabs.set(tab.id, { descriptor });
      this.order.push(tab.id);
    }

    if (this.order.length === 0) {
      return this.createTab(DEFAULT_INTERNAL_URL);
    }

    this.pinnedTabIds = new Set(
      (session.pinnedTabIds ?? []).filter(id => this.tabs.has(id))
    );

    const preferredActive =
      session.activeTabId && this.tabs.has(session.activeTabId)
        ? session.activeTabId
        : this.order[0];
    this.activateTabInternal(preferredActive);
    this.notifyStateChanged();
    return this.getSnapshot();
  }

  createTab(rawUrl = DEFAULT_INTERNAL_URL, options?: { isPrivate?: boolean }): BrowserSnapshot {
    const url = normalizeUrl(rawUrl);
    const tabId = this.createTabId();
    const isPrivate = options?.isPrivate ?? false;
    const descriptor: TabDescriptor = {
      id: tabId,
      title: deriveTitle(url),
      url,
      kind: isInternalUrl(url) ? 'internal' : 'external',
      renderMode: isInternalUrl(url) ? undefined : 'webview',
      isPrivate: isPrivate || undefined,
      isLoading: !isInternalUrl(url),
      canGoBack: false,
      canGoForward: false,
    };

    this.tabs.set(tabId, { descriptor });
    this.order.push(tabId);

    this.log('tab:create', `${tabId} -> ${url}`);
    this.activateTabInternal(tabId);
    this.notifyStateChanged();
    return this.getSnapshot();
  }

  closeTab(tabId: string): BrowserSnapshot {
    const target = this.tabs.get(tabId);
    if (!target) return this.getSnapshot();
    const closingActiveTab = this.activeTabId === tabId;

    const closingIndex = this.order.indexOf(tabId);
    this.tabs.delete(tabId);
    this.order.splice(closingIndex, 1);
    this.pinnedTabIds.delete(tabId);
    this.webContentsByTabId.delete(tabId);
    this.destroyNativeView(tabId);
    this.detachContextMenuForTab(tabId);
    if (closingActiveTab) {
      this.devToolsDock.close();
    }
    this.log('tab:close', tabId);

    if (this.order.length === 0) {
      return this.createTab(DEFAULT_INTERNAL_URL);
    }

    if (!this.hasNonPinnedTabs()) {
      const speedDialId = this.findSpeedDialTabId();
      if (speedDialId) {
        this.activateTabInternal(speedDialId);
        this.notifyStateChanged();
        return this.getSnapshot();
      }
      return this.createTab(DEFAULT_INTERNAL_URL);
    }

    if (this.activeTabId === tabId) {
      this.activeTabId = this.findClosestNonPinnedTabId(closingIndex);
      this.log('tab:activate', this.activeTabId ?? 'null');
    }

    this.notifyStateChanged();
    return this.getSnapshot();
  }

  activateTab(tabId: string): BrowserSnapshot {
    if (!this.tabs.has(tabId)) return this.getSnapshot();
    this.activateTabInternal(tabId);
    this.notifyStateChanged();
    return this.getSnapshot();
  }

  moveTab(tabId: string, toIndex: number): BrowserSnapshot {
    const fromIndex = this.order.indexOf(tabId);
    if (fromIndex < 0) return this.getSnapshot();
    const clamped = Math.max(0, Math.min(toIndex, this.order.length - 1));
    if (fromIndex === clamped) return this.getSnapshot();

    this.order.splice(fromIndex, 1);
    this.order.splice(clamped, 0, tabId);
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
      tab.descriptor = {
        ...tab.descriptor,
        url,
        title: deriveTitle(url),
        kind: 'internal',
        renderMode: undefined,
        isLoading: false,
        canGoBack: false,
        canGoForward: false,
      };
      this.webContentsByTabId.delete(targetId);
      this.destroyNativeView(targetId);
      this.log('tab:navigate', `${targetId} -> ${url}`);
      this.activateTabInternal(targetId);
      this.notifyStateChanged();
      return this.getSnapshot();
    }

    const renderMode: TabRenderMode =
      tab.descriptor.renderMode === 'native' ? 'native' : 'webview';
    tab.descriptor = {
      ...tab.descriptor,
      kind: 'external',
      renderMode,
      url,
      title: deriveTitle(url),
      isLoading: true,
      canGoBack: tab.descriptor.canGoBack ?? false,
      canGoForward: tab.descriptor.canGoForward ?? false,
    };

    if (renderMode === 'native') {
      this.ensureNativeView(targetId, url);
      const view = this.nativeViewsByTabId.get(targetId);
      if (view && !view.webContents.isDestroyed()) {
        view.webContents.loadURL(url).catch(() => {
          // Ignore navigation failures; renderer will retry.
        });
      }
    }

    this.log('tab:navigate', `${targetId} -> ${url}`);
    this.activateTabInternal(targetId);
    this.notifyStateChanged();
    return this.getSnapshot();
  }

  goBack(request: TabActionRequest): BrowserSnapshot {
    const target = this.resolveTargetTab(request.tabId);
    const targetWebContents = this.resolveWebContents(target?.descriptor.id);
    if (targetWebContents?.canGoBack()) {
      targetWebContents.goBack();
      this.log('tab:go-back', target!.descriptor.id);
    }
    return this.getSnapshot();
  }

  goForward(request: TabActionRequest): BrowserSnapshot {
    const target = this.resolveTargetTab(request.tabId);
    const targetWebContents = this.resolveWebContents(target?.descriptor.id);
    if (targetWebContents?.canGoForward()) {
      targetWebContents.goForward();
      this.log('tab:go-forward', target!.descriptor.id);
    }
    return this.getSnapshot();
  }

  reload(request: TabActionRequest): BrowserSnapshot {
    const target = this.resolveTargetTab(request.tabId);
    const targetWebContents = this.resolveWebContents(target?.descriptor.id);
    if (targetWebContents) {
      targetWebContents.reload();
      this.log('tab:reload', target!.descriptor.id);
    }
    return this.getSnapshot();
  }

  openDevTools(request: TabActionRequest): void {
    const target = this.resolveTargetTab(request.tabId);
    const targetWebContents = this.resolveWebContents(target?.descriptor.id);
    if (!targetWebContents) return;
    const dockAttached = this.devToolsDock.openFor(targetWebContents);
    if (!dockAttached) {
      this.log('tab:open-devtools:fallback', target!.descriptor.id);
    }
    targetWebContents.openDevTools({
      mode: 'detach',
      activate: true,
    });
    this.log('tab:open-devtools', target!.descriptor.id);
  }

  closeDevTools(request: TabActionRequest = {}): void {
    let closedAny = false;
    const explicitTarget = this.resolveTargetTab(request.tabId);
    const explicitWebContents = this.resolveWebContents(explicitTarget?.descriptor.id);
    if (explicitWebContents?.isDevToolsOpened()) {
      explicitWebContents.closeDevTools();
      closedAny = true;
      this.log('tab:close-devtools', explicitTarget!.descriptor.id);
    }

    const activeTarget = this.resolveTargetTab(this.activeTabId ?? undefined);
    const activeWebContents = this.resolveWebContents(activeTarget?.descriptor.id);
    if (activeWebContents?.isDevToolsOpened() && !closedAny) {
      activeWebContents.closeDevTools();
      closedAny = true;
      this.log('tab:close-devtools', activeTarget!.descriptor.id);
    }

    for (const tabId of this.order) {
      const targetWebContents = this.resolveWebContents(tabId);
      if (!targetWebContents?.isDevToolsOpened()) continue;
      targetWebContents.closeDevTools();
      closedAny = true;
      this.log('tab:close-devtools', tabId);
    }

    if (closedAny) {
      this.devToolsDock.close();
      return;
    }

    this.devToolsDock.close();
  }

  bindWebContents(tabId: string, webContentsId: number): void {
    const tab = this.tabs.get(tabId);
    if (!tab) return;
    if (tab.descriptor.kind !== 'external') return;
    if (tab.descriptor.renderMode === 'native') return;

    const targetWebContents = webContents.fromId(webContentsId);
    if (!targetWebContents || targetWebContents.isDestroyed()) {
      this.log('tab:bind-webcontents:invalid', `${tabId} -> ${webContentsId}`);
      return;
    }

    this.webContentsByTabId.set(tabId, webContentsId);
    if (!tab.descriptor.renderMode) {
      tab.descriptor = { ...tab.descriptor, renderMode: 'webview' };
    }
    this.attachContextMenuForTab(tabId, targetWebContents);
    this.refreshTabFromWebContents(tabId, targetWebContents);
    this.log('tab:bind-webcontents', `${tabId} -> ${webContentsId}`);
    this.notifyStateChanged();
  }

  unbindWebContents(tabId: string): void {
    if (!this.webContentsByTabId.has(tabId)) return;
    this.webContentsByTabId.delete(tabId);
    this.detachContextMenuForTab(tabId);
    this.log('tab:unbind-webcontents', tabId);
  }

  updateTabRuntime(payload: TabRuntimeUpdateRequest): BrowserSnapshot {
    const tab = this.tabs.get(payload.tabId);
    if (!tab) return this.getSnapshot();
    if (tab.descriptor.kind !== 'external') return this.getSnapshot();
    if (tab.descriptor.renderMode === 'native') return this.getSnapshot();

    const url = normalizeRuntimeUrl(payload.url, tab.descriptor.url);
    const title = payload.title.trim() || deriveTitle(url);

    tab.descriptor = {
      ...tab.descriptor,
      kind: 'external',
      renderMode: tab.descriptor.renderMode ?? 'webview',
      url,
      title,
      isLoading: Boolean(payload.isLoading),
      canGoBack: Boolean(payload.canGoBack),
      canGoForward: Boolean(payload.canGoForward),
    };

    this.notifyStateChanged();
    return this.getSnapshot();
  }

  getActiveExternalWebContents(): WebContents | null {
    const target = this.resolveTargetTab(this.activeTabId ?? undefined);
    if (!target) return null;
    if (target.descriptor.kind !== 'external') return null;
    return this.resolveWebContents(target.descriptor.id);
  }

  getActiveTabId(): string | null {
    return this.activeTabId;
  }

  getActiveTabDescriptor(): TabDescriptor | null {
    const target = this.resolveTargetTab(this.activeTabId ?? undefined);
    return target?.descriptor ?? null;
  }

  hasActiveExternalTab(): boolean {
    const target = this.resolveTargetTab(this.activeTabId ?? undefined);
    return Boolean(target && target.descriptor.kind === 'external');
  }

  setPinnedTabs(tabIds: string[]): void {
    const validIds = new Set(this.order);
    this.pinnedTabIds = new Set(tabIds.filter(tabId => validIds.has(tabId)));
    this.notifyStateChanged();
  }

  setTabRenderMode(tabId: string, mode: TabRenderMode): BrowserSnapshot {
    const tab = this.tabs.get(tabId);
    if (!tab) return this.getSnapshot();
    if (tab.descriptor.kind !== 'external') return this.getSnapshot();

    const nextMode: TabRenderMode = mode === 'native' ? 'native' : 'webview';
    if (tab.descriptor.renderMode === nextMode) return this.getSnapshot();

    if (nextMode === 'native') {
      this.webContentsByTabId.delete(tabId);
      this.detachContextMenuForTab(tabId);
      tab.descriptor = { ...tab.descriptor, renderMode: 'native' };
      this.ensureNativeView(tabId, tab.descriptor.url);
    } else {
      this.destroyNativeView(tabId);
      tab.descriptor = { ...tab.descriptor, renderMode: 'webview' };
    }

    this.syncNativeViews();
    this.notifyStateChanged();
    return this.getSnapshot();
  }

  getDevToolsDockState(): DevToolsDockState {
    return this.devToolsDock.getState();
  }

  setDevToolsDockWidth(width: number): DevToolsDockState {
    return this.devToolsDock.setWidth(width);
  }

  syncDevToolsLayout(): void {
    this.devToolsDock.syncLayout();
    this.syncNativeViews();
  }

  setViewportBounds(bounds: ViewportBounds): void {
    this.viewportBounds = bounds;
    this.syncNativeViews();
  }

  private ensureNativeView(tabId: string, url: string): void {
    const existing = this.nativeViewsByTabId.get(tabId);
    if (existing && !existing.webContents.isDestroyed()) {
      return;
    }

    if (existing) {
      this.destroyNativeView(tabId);
    }

    const isPrivate = this.tabs.get(tabId)?.descriptor.isPrivate ?? false;
    const partition = isPrivate ? `${PRIVATE_PARTITION_PREFIX}${tabId}` : SHARED_WEBVIEW_PARTITION;

    let view: WebContentsView;
    try {
      view = new WebContentsView({
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
          webSecurity: true,
          partition,
        },
      });
    } catch (error) {
      this.log('native-view-create-failed', String(error));
      return;
    }

    view.setVisible(false);
    this.nativeViewsByTabId.set(tabId, view);

    const targetWebContents = view.webContents;
    if (app.userAgentFallback) {
      targetWebContents.setUserAgent(app.userAgentFallback);
    }
    this.attachContextMenuForTab(tabId, targetWebContents);

    const onUpdate = () => {
      this.refreshTabFromNativeView(tabId, targetWebContents);
      this.notifyStateChanged();
    };

    const onDestroyed = () => {
      this.destroyNativeView(tabId);
    };

    targetWebContents.on('did-start-loading', onUpdate);
    targetWebContents.on('did-stop-loading', onUpdate);
    targetWebContents.on('did-navigate', onUpdate);
    targetWebContents.on('did-navigate-in-page', onUpdate);
    targetWebContents.on('page-title-updated', onUpdate);
    targetWebContents.on('did-fail-load', onUpdate);
    targetWebContents.once('destroyed', onDestroyed);

    targetWebContents.setWindowOpenHandler(details => {
      if (details?.url) {
        this.createTab(details.url, { isPrivate });
      }
      return { action: 'deny' };
    });

    const cleanup = () => {
      targetWebContents.removeListener('did-start-loading', onUpdate);
      targetWebContents.removeListener('did-stop-loading', onUpdate);
      targetWebContents.removeListener('did-navigate', onUpdate);
      targetWebContents.removeListener('did-navigate-in-page', onUpdate);
      targetWebContents.removeListener('page-title-updated', onUpdate);
      targetWebContents.removeListener('did-fail-load', onUpdate);
      targetWebContents.removeListener('destroyed', onDestroyed);
    };
    this.nativeViewCleanupByTabId.set(tabId, cleanup);

    const mainWindow = this.options.getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      this.attachNativeView(mainWindow, view);
    }

    targetWebContents
      .loadURL(url)
      .catch(() => {
        // Ignore navigation failures; renderer will retry.
      });
  }

  private destroyNativeView(tabId: string): void {
    const cleanup = this.nativeViewCleanupByTabId.get(tabId);
    if (cleanup) {
      cleanup();
      this.nativeViewCleanupByTabId.delete(tabId);
    }

    const view = this.nativeViewsByTabId.get(tabId);
    if (!view) return;
    this.nativeViewsByTabId.delete(tabId);
    this.detachContextMenuForTab(tabId);

    const mainWindow = this.options.getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.contentView.children.includes(view)) {
        mainWindow.contentView.removeChildView(view);
      }
    }

    try {
      view.webContents.destroy();
    } catch {
      // ignore
    }
  }

  private syncNativeViews(): void {
    const mainWindow = this.options.getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) return;

    const bounds = this.viewportBounds;
    for (const [tabId, view] of this.nativeViewsByTabId.entries()) {
      if (view.webContents.isDestroyed()) {
        this.destroyNativeView(tabId);
        continue;
      }

      const descriptor = this.tabs.get(tabId)?.descriptor;
      const shouldShow =
        descriptor?.kind === 'external' &&
        descriptor.renderMode === 'native' &&
        this.activeTabId === tabId &&
        bounds &&
        bounds.width > 0 &&
        bounds.height > 0;

      if (!shouldShow) {
        view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
        view.setVisible(false);
        continue;
      }

      this.attachNativeView(mainWindow, view);
      view.setBounds({
        x: Math.max(0, Math.round(bounds.x)),
        y: Math.max(0, Math.round(bounds.y)),
        width: Math.max(0, Math.round(bounds.width)),
        height: Math.max(0, Math.round(bounds.height)),
      });
      view.setVisible(true);
    }
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

  private refreshTabFromWebContents(tabId: string, targetWebContents: WebContents): void {
    const tab = this.tabs.get(tabId);
    if (!tab) return;
    if (tab.descriptor.kind !== 'external') return;

    const currentUrl = normalizeRuntimeUrl(targetWebContents.getURL(), tab.descriptor.url);
    const currentTitle = targetWebContents.getTitle().trim();
    tab.descriptor = {
      ...tab.descriptor,
      kind: 'external',
      renderMode: tab.descriptor.renderMode ?? 'webview',
      url: currentUrl,
      title: currentTitle || deriveTitle(currentUrl),
      isLoading: targetWebContents.isLoading(),
      canGoBack: targetWebContents.canGoBack(),
      canGoForward: targetWebContents.canGoForward(),
    };
  }

  private refreshTabFromNativeView(tabId: string, targetWebContents: WebContents): void {
    const tab = this.tabs.get(tabId);
    if (!tab) return;
    if (tab.descriptor.kind !== 'external') return;

    const currentUrl = normalizeRuntimeUrl(targetWebContents.getURL(), tab.descriptor.url);
    const currentTitle = targetWebContents.getTitle().trim();
    tab.descriptor = {
      ...tab.descriptor,
      kind: 'external',
      renderMode: 'native',
      url: currentUrl,
      title: currentTitle || deriveTitle(currentUrl),
      isLoading: targetWebContents.isLoading(),
      canGoBack: targetWebContents.canGoBack(),
      canGoForward: targetWebContents.canGoForward(),
    };
  }

  private attachNativeView(mainWindow: BrowserWindow, view: WebContentsView): void {
    const contentView = mainWindow.contentView;
    const attached = contentView.children.includes(view);
    if (!attached) {
      contentView.addChildView(view);
    }
  }

  private resetTabs(): void {
    for (const tabId of this.order) {
      this.destroyNativeView(tabId);
      this.detachContextMenuForTab(tabId);
    }
    this.tabs.clear();
    this.order.length = 0;
    this.webContentsByTabId.clear();
    this.pinnedTabIds.clear();
    this.activeTabId = null;
    this.devToolsDock.close();
  }

  private activateTabInternal(tabId: string): void {
    this.activeTabId = tabId;
    this.syncNativeViews();
    this.log('tab:activate', tabId);
  }

  private resolveWebContents(tabId?: string): WebContents | null {
    if (!tabId) return null;
    const nativeView = this.nativeViewsByTabId.get(tabId);
    if (nativeView) {
      if (!nativeView.webContents.isDestroyed()) {
        return nativeView.webContents;
      }
      this.destroyNativeView(tabId);
    }
    const targetId = this.webContentsByTabId.get(tabId);
    if (!targetId) return null;
    const targetWebContents = webContents.fromId(targetId);
    if (!targetWebContents || targetWebContents.isDestroyed()) {
      this.webContentsByTabId.delete(tabId);
      this.detachContextMenuByWebContentsId(targetId);
      return null;
    }
    return targetWebContents;
  }

  private attachContextMenuForTab(tabId: string, targetWebContents: WebContents): void {
    const webContentsId = targetWebContents.id;
    const existing = this.contextMenuByWebContentsId.get(webContentsId);
    if (existing?.tabId === tabId) return;
    if (existing) {
      existing.cleanup();
      this.contextMenuByWebContentsId.delete(webContentsId);
    }

    const onContextMenu = (_event: Electron.Event, params: Electron.ContextMenuParams) => {
      const menuTemplate = this.buildContextMenuTemplate(tabId, targetWebContents, params);
      if (menuTemplate.length === 0) return;
      const menu = Menu.buildFromTemplate(menuTemplate);
      menu.popup();
    };

    const onBeforeInputEvent = (event: Electron.Event, input: Electron.Input) => {
      if (!isDevToolsShortcutInput(input)) return;
      event.preventDefault();
      if (targetWebContents.isDevToolsOpened()) {
        this.closeDevTools({ tabId });
      } else {
        this.openDevTools({ tabId });
      }
    };

    const onDestroyed = () => {
      this.detachContextMenuByWebContentsId(webContentsId);
    };

    targetWebContents.on('context-menu', onContextMenu);
    targetWebContents.on('before-input-event', onBeforeInputEvent);
    targetWebContents.once('destroyed', onDestroyed);

    const cleanup = () => {
      targetWebContents.removeListener('context-menu', onContextMenu);
      targetWebContents.removeListener('before-input-event', onBeforeInputEvent);
      targetWebContents.removeListener('destroyed', onDestroyed);
    };

    this.contextMenuByWebContentsId.set(webContentsId, { tabId, cleanup });
  }

  private detachContextMenuForTab(tabId: string): void {
    for (const [webContentsId, subscription] of this.contextMenuByWebContentsId.entries()) {
      if (subscription.tabId !== tabId) continue;
      subscription.cleanup();
      this.contextMenuByWebContentsId.delete(webContentsId);
    }
  }

  private detachContextMenuByWebContentsId(webContentsId: number): void {
    const subscription = this.contextMenuByWebContentsId.get(webContentsId);
    if (!subscription) return;
    subscription.cleanup();
    this.contextMenuByWebContentsId.delete(webContentsId);
  }

  private buildContextMenuTemplate(
    tabId: string,
    targetWebContents: WebContents,
    params: Electron.ContextMenuParams
  ): MenuItemConstructorOptions[] {
    const template: MenuItemConstructorOptions[] = [
      {
        label: 'Back',
        enabled: targetWebContents.canGoBack(),
        click: () => targetWebContents.goBack(),
      },
      {
        label: 'Forward',
        enabled: targetWebContents.canGoForward(),
        click: () => targetWebContents.goForward(),
      },
      {
        label: 'Reload',
        click: () => targetWebContents.reload(),
      },
    ];

    if (params.linkURL) {
      template.push(
        { type: 'separator' },
        {
          label: 'Open Link in New Tab',
          click: () => {
            this.log('tab:context-open-link', `${tabId} -> ${params.linkURL}`);
            this.createTab(params.linkURL);
          },
        },
        {
          label: 'Copy Link',
          click: () => clipboard.writeText(params.linkURL),
        }
      );
    }

    const { editFlags, selectionText } = params;
    if (params.isEditable) {
      template.push(
        { type: 'separator' },
        { label: 'Cut', enabled: editFlags.canCut, role: 'cut' },
        { label: 'Copy', enabled: editFlags.canCopy || Boolean(selectionText), role: 'copy' },
        { label: 'Paste', enabled: editFlags.canPaste, role: 'paste' },
        { label: 'Select All', enabled: editFlags.canSelectAll, role: 'selectAll' }
      );
    } else if (selectionText) {
      template.push({ type: 'separator' }, { label: 'Copy', role: 'copy' });
    }

    if (this.options.debug || process.env.NODE_ENV !== 'production') {
      template.push(
        { type: 'separator' },
        {
          label: 'Inspect Element',
          click: () => {
            const inspect = () => {
              targetWebContents.inspectElement(params.x, params.y);
            };
            if (targetWebContents.isDevToolsOpened()) {
              inspect();
              return;
            }
            targetWebContents.once('devtools-opened', inspect);
            const dockAttached = this.devToolsDock.openFor(targetWebContents);
            targetWebContents.openDevTools({
              mode: 'detach',
              activate: true,
            });
            if (!dockAttached) {
              this.log('tab:inspect-devtools:fallback', tabId);
            }
          },
        }
      );
    }

    return template;
  }

  private hasNonPinnedTabs(): boolean {
    return this.order.some(tabId => !this.pinnedTabIds.has(tabId));
  }

  private findSpeedDialTabId(): string | null {
    const match = this.order.find(tabId => {
      if (this.pinnedTabIds.has(tabId)) return false;
      const tab = this.tabs.get(tabId);
      return tab?.descriptor.url === DEFAULT_INTERNAL_URL;
    });
    return match ?? null;
  }

  private findClosestNonPinnedTabId(preferredIndex: number): string | null {
    if (this.order.length === 0) return null;
    const start = Math.max(0, Math.min(preferredIndex, this.order.length - 1));

    for (let offset = 0; offset < this.order.length; offset += 1) {
      const right = start + offset;
      if (right < this.order.length) {
        const rightId = this.order[right];
        if (!this.pinnedTabIds.has(rightId)) return rightId;
      }

      if (offset === 0) continue;
      const left = start - offset;
      if (left >= 0) {
        const leftId = this.order[left];
        if (!this.pinnedTabIds.has(leftId)) return leftId;
      }
    }

    return null;
  }

  private notifyStateChanged(): void {
    this.options.onStateChanged(this.getSnapshot());
  }

  private log(event: string, message: string): void {
    if (!this.options.debug) return;
    console.info(`[tab-manager] ${event} ${message}`);
  }
}
