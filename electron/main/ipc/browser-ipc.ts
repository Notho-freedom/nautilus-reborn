import { ipcMain } from 'electron';
import type {
  NavigateRequest,
  TabActivateRequest,
  TabActionRequest,
  TabCloseRequest,
  TabCreateRequest,
  ViewportBounds,
} from '../../../shared/browser-contract';
import { BrowserIpcChannels } from '../../../shared/browser-contract';
import type { ExternalOverlayState } from '../../../shared/overlay-contract';
import { TabManager } from '../tab-manager';

interface RegisterBrowserIpcOptions {
  tabManager: TabManager;
  onOverlaySetState: (payload: ExternalOverlayState) => void;
  onOverlayClear: () => void;
  debug: boolean;
}

function removeExistingHandlers() {
  ipcMain.removeHandler(BrowserIpcChannels.getState);
  ipcMain.removeHandler(BrowserIpcChannels.tabCreate);
  ipcMain.removeHandler(BrowserIpcChannels.tabClose);
  ipcMain.removeHandler(BrowserIpcChannels.tabActivate);
  ipcMain.removeHandler(BrowserIpcChannels.navigate);
  ipcMain.removeHandler(BrowserIpcChannels.goBack);
  ipcMain.removeHandler(BrowserIpcChannels.goForward);
  ipcMain.removeHandler(BrowserIpcChannels.reload);
  ipcMain.removeHandler(BrowserIpcChannels.openDevTools);
  ipcMain.removeHandler(BrowserIpcChannels.setViewportBounds);
  ipcMain.removeHandler(BrowserIpcChannels.overlaySetState);
  ipcMain.removeHandler(BrowserIpcChannels.overlayClear);
}

export function registerBrowserIpc({
  tabManager,
  onOverlaySetState,
  onOverlayClear,
  debug,
}: RegisterBrowserIpcOptions) {
  const log = (channel: string, payload?: unknown) => {
    if (!debug) return;
    const serialized = payload ? JSON.stringify(payload) : '';
    console.info(`[ipc] ${channel} ${serialized}`);
  };

  removeExistingHandlers();

  ipcMain.handle(BrowserIpcChannels.getState, () => {
    log(BrowserIpcChannels.getState);
    return tabManager.getSnapshot();
  });

  ipcMain.handle(BrowserIpcChannels.tabCreate, (_event, payload: TabCreateRequest = {}) => {
    log(BrowserIpcChannels.tabCreate, payload);
    return tabManager.createTab(payload.url);
  });

  ipcMain.handle(BrowserIpcChannels.tabClose, (_event, payload: TabCloseRequest) => {
    log(BrowserIpcChannels.tabClose, payload);
    return tabManager.closeTab(payload.tabId);
  });

  ipcMain.handle(BrowserIpcChannels.tabActivate, (_event, payload: TabActivateRequest) => {
    log(BrowserIpcChannels.tabActivate, payload);
    return tabManager.activateTab(payload.tabId);
  });

  ipcMain.handle(BrowserIpcChannels.navigate, (_event, payload: NavigateRequest) => {
    log(BrowserIpcChannels.navigate, payload);
    return tabManager.navigate(payload);
  });

  ipcMain.handle(BrowserIpcChannels.goBack, (_event, payload: TabActionRequest = {}) => {
    log(BrowserIpcChannels.goBack, payload);
    return tabManager.goBack(payload);
  });

  ipcMain.handle(BrowserIpcChannels.goForward, (_event, payload: TabActionRequest = {}) => {
    log(BrowserIpcChannels.goForward, payload);
    return tabManager.goForward(payload);
  });

  ipcMain.handle(BrowserIpcChannels.reload, (_event, payload: TabActionRequest = {}) => {
    log(BrowserIpcChannels.reload, payload);
    return tabManager.reload(payload);
  });

  ipcMain.handle(BrowserIpcChannels.openDevTools, (_event, payload: TabActionRequest = {}) => {
    log(BrowserIpcChannels.openDevTools, payload);
    tabManager.openDevTools(payload);
  });

  ipcMain.handle(
    BrowserIpcChannels.setViewportBounds,
    (_event, payload: ViewportBounds) => {
      log(BrowserIpcChannels.setViewportBounds, payload);
      tabManager.setViewportBounds(payload);
    }
  );

  ipcMain.handle(
    BrowserIpcChannels.overlaySetState,
    (_event, payload: ExternalOverlayState) => {
      log(BrowserIpcChannels.overlaySetState, payload);
      onOverlaySetState(payload);
    }
  );

  ipcMain.handle(BrowserIpcChannels.overlayClear, () => {
    log(BrowserIpcChannels.overlayClear);
    onOverlayClear();
  });

  ipcMain.on(BrowserIpcChannels.overlayEvent, (_event, payload) => {
    if (!debug) return;
    log(BrowserIpcChannels.overlayEvent, payload);
  });
}

