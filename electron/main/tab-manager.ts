import {
  Menu,
  clipboard,
  webContents,
  type MenuItemConstructorOptions,
  type WebContents,
} from 'electron';
import type {
  BrowserSnapshot,
  NavigateRequest,
  TabActionRequest,
  TabDescriptor,
  TabRuntimeUpdateRequest,
} from '../../shared/browser-contract';

interface ManagedTab {
  descriptor: TabDescriptor;
}

interface TabManagerOptions {
  onStateChanged: (snapshot: BrowserSnapshot) => void;
  debug: boolean;
}

const INTERNAL_PREFIX = 'notilus://';
const DEFAULT_INTERNAL_URL = 'notilus://speed-dial';

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

export class TabManager {
  private readonly tabs = new Map<string, ManagedTab>();
  private readonly order: string[] = [];
  private activeTabId: string | null = null;
  private sequence = 1;
  private pinnedTabIds = new Set<string>();
  private readonly webContentsByTabId = new Map<string, number>();
  private readonly contextMenuByWebContentsId = new Map<
    number,
    { tabId: string; cleanup: () => void }
  >();

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

  createTab(rawUrl = DEFAULT_INTERNAL_URL): BrowserSnapshot {
    const url = normalizeUrl(rawUrl);
    const tabId = this.createTabId();
    const descriptor: TabDescriptor = {
      id: tabId,
      title: deriveTitle(url),
      url,
      kind: isInternalUrl(url) ? 'internal' : 'external',
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

    const closingIndex = this.order.indexOf(tabId);
    this.tabs.delete(tabId);
    this.order.splice(closingIndex, 1);
    this.pinnedTabIds.delete(tabId);
    this.webContentsByTabId.delete(tabId);
    this.detachContextMenuForTab(tabId);
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
        isLoading: false,
        canGoBack: false,
        canGoForward: false,
      };
      this.webContentsByTabId.delete(targetId);
      this.log('tab:navigate', `${targetId} -> ${url}`);
      this.activateTabInternal(targetId);
      this.notifyStateChanged();
      return this.getSnapshot();
    }

    tab.descriptor = {
      ...tab.descriptor,
      kind: 'external',
      url,
      title: deriveTitle(url),
      isLoading: true,
      canGoBack: tab.descriptor.canGoBack ?? false,
      canGoForward: tab.descriptor.canGoForward ?? false,
    };

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
    targetWebContents.openDevTools({ mode: 'right' });
    this.log('tab:open-devtools', target!.descriptor.id);
  }

  bindWebContents(tabId: string, webContentsId: number): void {
    const tab = this.tabs.get(tabId);
    if (!tab) return;
    if (tab.descriptor.kind !== 'external') return;

    const targetWebContents = webContents.fromId(webContentsId);
    if (!targetWebContents || targetWebContents.isDestroyed()) {
      this.log('tab:bind-webcontents:invalid', `${tabId} -> ${webContentsId}`);
      return;
    }

    this.webContentsByTabId.set(tabId, webContentsId);
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

    const url = normalizeRuntimeUrl(payload.url, tab.descriptor.url);
    const title = payload.title.trim() || deriveTitle(url);

    tab.descriptor = {
      ...tab.descriptor,
      kind: 'external',
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
      url: currentUrl,
      title: currentTitle || deriveTitle(currentUrl),
      isLoading: targetWebContents.isLoading(),
      canGoBack: targetWebContents.canGoBack(),
      canGoForward: targetWebContents.canGoForward(),
    };
  }

  private activateTabInternal(tabId: string): void {
    this.activeTabId = tabId;
    this.log('tab:activate', tabId);
  }

  private resolveWebContents(tabId?: string): WebContents | null {
    if (!tabId) return null;
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

    const onDestroyed = () => {
      this.detachContextMenuByWebContentsId(webContentsId);
    };

    targetWebContents.on('context-menu', onContextMenu);
    targetWebContents.once('destroyed', onDestroyed);

    const cleanup = () => {
      targetWebContents.removeListener('context-menu', onContextMenu);
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
            targetWebContents.inspectElement(params.x, params.y);
            if (!targetWebContents.isDevToolsOpened()) {
              targetWebContents.openDevTools({ mode: 'right' });
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
