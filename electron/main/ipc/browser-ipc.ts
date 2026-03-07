import { ipcMain } from 'electron';
import type {
  DevToolsDockWidthRequest,
  NavigateRequest,
  SetPinnedTabsRequest,
  TabActivateRequest,
  TabActionRequest,
  TabRuntimeUpdateRequest,
  TabWebContentsBindRequest,
  TabWebContentsUnbindRequest,
  TabCloseRequest,
  TabCreateRequest,
} from '../../../shared/browser-contract';
import { BrowserIpcChannels } from '../../../shared/browser-contract';
import { TabManager } from '../tab-manager';

interface RegisterBrowserIpcOptions {
  tabManager: TabManager;
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
  ipcMain.removeHandler(BrowserIpcChannels.closeDevTools);
  ipcMain.removeHandler(BrowserIpcChannels.setDevToolsDockWidth);
  ipcMain.removeHandler(BrowserIpcChannels.getDevToolsDockState);
  ipcMain.removeHandler(BrowserIpcChannels.setPinnedTabs);
  ipcMain.removeHandler(BrowserIpcChannels.tabBindWebContents);
  ipcMain.removeHandler(BrowserIpcChannels.tabUnbindWebContents);
  ipcMain.removeHandler(BrowserIpcChannels.tabRuntimeUpdate);
}

export function registerBrowserIpc({
  tabManager,
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

  ipcMain.handle(BrowserIpcChannels.closeDevTools, (_event, payload: TabActionRequest = {}) => {
    log(BrowserIpcChannels.closeDevTools, payload);
    tabManager.closeDevTools(payload);
  });

  ipcMain.handle(
    BrowserIpcChannels.setDevToolsDockWidth,
    (_event, payload: DevToolsDockWidthRequest) => {
      log(BrowserIpcChannels.setDevToolsDockWidth, payload);
      return tabManager.setDevToolsDockWidth(payload.width);
    }
  );

  ipcMain.handle(BrowserIpcChannels.getDevToolsDockState, () => {
    log(BrowserIpcChannels.getDevToolsDockState);
    return tabManager.getDevToolsDockState();
  });

  ipcMain.handle(
    BrowserIpcChannels.setPinnedTabs,
    (_event, payload: SetPinnedTabsRequest) => {
      log(BrowserIpcChannels.setPinnedTabs, payload);
      tabManager.setPinnedTabs(payload.tabIds);
    }
  );

  ipcMain.handle(
    BrowserIpcChannels.tabBindWebContents,
    (_event, payload: TabWebContentsBindRequest) => {
      log(BrowserIpcChannels.tabBindWebContents, payload);
      tabManager.bindWebContents(payload.tabId, payload.webContentsId);
    }
  );

  ipcMain.handle(
    BrowserIpcChannels.tabUnbindWebContents,
    (_event, payload: TabWebContentsUnbindRequest) => {
      log(BrowserIpcChannels.tabUnbindWebContents, payload);
      tabManager.unbindWebContents(payload.tabId);
    }
  );

  ipcMain.handle(
    BrowserIpcChannels.tabRuntimeUpdate,
    (_event, payload: TabRuntimeUpdateRequest) => {
      log(BrowserIpcChannels.tabRuntimeUpdate, payload);
      return tabManager.updateTabRuntime(payload);
    }
  );
}

