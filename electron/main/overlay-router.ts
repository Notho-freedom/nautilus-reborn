import { BrowserWindow, ipcMain, type IpcMainEvent } from 'electron';
import { BrowserIpcChannels } from '../../shared/browser-contract';
import type { ExternalOverlayEvent, ExternalOverlayState } from '../../shared/overlay-contract';
import { TabManager } from './tab-manager';

const EMPTY_OVERLAY_STATE: ExternalOverlayState = {
  tabId: null,
  overlays: [],
  blocking: false,
};

interface OverlayRouterOptions {
  mainWindow: BrowserWindow;
  tabManager: TabManager;
  debug: boolean;
}

export class OverlayRouter {
  private readonly statesByTabId = new Map<string, ExternalOverlayState>();
  private activeRenderedTabId: string | null = null;

  constructor(private readonly options: OverlayRouterOptions) {}

  setup(): void {
    ipcMain.on(BrowserIpcChannels.overlayEvent, this.onOverlayEventFromTab);
  }

  dispose(): void {
    ipcMain.removeListener(BrowserIpcChannels.overlayEvent, this.onOverlayEventFromTab);
  }

  setState(payload: ExternalOverlayState): void {
    if (!payload.tabId) return;
    this.statesByTabId.set(payload.tabId, payload);
    this.applyToActiveTab();
    this.log(`set-state tab=${payload.tabId} overlays=${payload.overlays.length}`);
  }

  clear(): void {
    const activeTabId = this.options.tabManager.getActiveTabId();
    if (activeTabId) {
      this.statesByTabId.delete(activeTabId);
    }
    this.clearFromCurrentRenderedTab();
    this.log('clear');
  }

  onTabStateChanged(): void {
    this.applyToActiveTab();
  }

  private applyToActiveTab(): void {
    const activeTab = this.options.tabManager.getActiveTabDescriptor();
    if (!activeTab || activeTab.kind !== 'external') {
      this.clearFromCurrentRenderedTab();
      return;
    }

    const tabId = activeTab.id;
    const payload = this.statesByTabId.get(tabId) ?? { ...EMPTY_OVERLAY_STATE, tabId };
    const sent = this.options.tabManager.sendOverlayToTab(tabId, payload);
    if (!sent) {
      this.clearFromCurrentRenderedTab();
      return;
    }
    this.activeRenderedTabId = tabId;
  }

  private clearFromCurrentRenderedTab(): void {
    if (!this.activeRenderedTabId) return;
    this.options.tabManager.sendOverlayToTab(this.activeRenderedTabId, EMPTY_OVERLAY_STATE);
    this.activeRenderedTabId = null;
  }

  private readonly onOverlayEventFromTab = (
    event: IpcMainEvent,
    payload: ExternalOverlayEvent
  ) => {
    const senderTabId = this.options.tabManager.getTabIdByWebContentsId(event.sender.id);
    if (!senderTabId) return;
    const activeTabId = this.options.tabManager.getActiveTabId();
    if (!activeTabId || activeTabId !== senderTabId) return;
    if (this.options.mainWindow.isDestroyed()) return;

    this.options.mainWindow.webContents.send(BrowserIpcChannels.overlayEvent, {
      ...payload,
      tabId: senderTabId,
    } satisfies ExternalOverlayEvent);
  };

  private log(message: string): void {
    if (!this.options.debug) return;
    console.info(`[overlay-router] ${message}`);
  }
}
