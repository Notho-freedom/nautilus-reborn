import { ipcMain } from 'electron';
import type {
  DevToolsDockWidthRequest,
  NavigateRequest,
  OpenWindowWithTabsRequest,
  SetPinnedTabsRequest,
  TabRenderModeRequest,
  TabActivateRequest,
  TabMoveRequest,
  TabActionRequest,
  TabRuntimeUpdateRequest,
  TabWebContentsBindRequest,
  TabWebContentsUnbindRequest,
  TabCloseRequest,
  TabCreateRequest,
  ViewportBounds,
} from '../../../shared/browser-contract';
import { BrowserIpcChannels } from '../../../shared/browser-contract';
import { TabManager } from '../tab-manager';

interface RegisterBrowserIpcOptions {
  getTabManagerForSender: (senderId: number) => TabManager | null;
  openWindowWithTabs: (payload: OpenWindowWithTabsRequest) => void;
  debug: boolean;
}

function removeExistingHandlers() {
  ipcMain.removeHandler(BrowserIpcChannels.getState);
  ipcMain.removeHandler(BrowserIpcChannels.tabCreate);
  ipcMain.removeHandler(BrowserIpcChannels.openWindowWithTabs);
  ipcMain.removeHandler(BrowserIpcChannels.tabClose);
  ipcMain.removeHandler(BrowserIpcChannels.tabActivate);
  ipcMain.removeHandler(BrowserIpcChannels.tabMove);
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
  ipcMain.removeHandler(BrowserIpcChannels.tabSetRenderMode);
  ipcMain.removeHandler(BrowserIpcChannels.setViewportBounds);
}

export function registerBrowserIpc({
  getTabManagerForSender,
  openWindowWithTabs,
  debug,
}: RegisterBrowserIpcOptions) {
  const log = (channel: string, payload?: unknown) => {
    if (!debug) return;
    const serialized = payload ? JSON.stringify(payload) : '';
    console.info(`[ipc] ${channel} ${serialized}`);
  };

  removeExistingHandlers();

  ipcMain.handle(BrowserIpcChannels.getState, event => {
    log(BrowserIpcChannels.getState);
    const tabManager = getTabManagerForSender(event.sender.id);
    return tabManager?.getSnapshot() ?? { tabs: [], activeTabId: null };
  });

  ipcMain.handle(BrowserIpcChannels.tabCreate, (event, payload: TabCreateRequest = {}) => {
    log(BrowserIpcChannels.tabCreate, payload);
    const tabManager = getTabManagerForSender(event.sender.id);
    if (!tabManager) return { tabs: [], activeTabId: null };
    return tabManager.createTab(payload.url, { isPrivate: payload.isPrivate });
  });

  ipcMain.handle(BrowserIpcChannels.openWindowWithTabs, (_event, payload: OpenWindowWithTabsRequest) => {
    log(BrowserIpcChannels.openWindowWithTabs, payload);
    openWindowWithTabs(payload);
  });

  ipcMain.handle(BrowserIpcChannels.tabClose, (event, payload: TabCloseRequest) => {
    log(BrowserIpcChannels.tabClose, payload);
    const tabManager = getTabManagerForSender(event.sender.id);
    if (!tabManager) return { tabs: [], activeTabId: null };
    return tabManager.closeTab(payload.tabId);
  });

  ipcMain.handle(BrowserIpcChannels.tabActivate, (event, payload: TabActivateRequest) => {
    log(BrowserIpcChannels.tabActivate, payload);
    const tabManager = getTabManagerForSender(event.sender.id);
    if (!tabManager) return { tabs: [], activeTabId: null };
    return tabManager.activateTab(payload.tabId);
  });

  ipcMain.handle(BrowserIpcChannels.tabMove, (event, payload: TabMoveRequest) => {
    log(BrowserIpcChannels.tabMove, payload);
    const tabManager = getTabManagerForSender(event.sender.id);
    if (!tabManager) return { tabs: [], activeTabId: null };
    return tabManager.moveTab(payload.tabId, payload.toIndex);
  });

  ipcMain.handle(BrowserIpcChannels.navigate, (event, payload: NavigateRequest) => {
    log(BrowserIpcChannels.navigate, payload);
    const tabManager = getTabManagerForSender(event.sender.id);
    if (!tabManager) return { tabs: [], activeTabId: null };
    return tabManager.navigate(payload);
  });

  ipcMain.handle(BrowserIpcChannels.goBack, (event, payload: TabActionRequest = {}) => {
    log(BrowserIpcChannels.goBack, payload);
    const tabManager = getTabManagerForSender(event.sender.id);
    if (!tabManager) return { tabs: [], activeTabId: null };
    return tabManager.goBack(payload);
  });

  ipcMain.handle(BrowserIpcChannels.goForward, (event, payload: TabActionRequest = {}) => {
    log(BrowserIpcChannels.goForward, payload);
    const tabManager = getTabManagerForSender(event.sender.id);
    if (!tabManager) return { tabs: [], activeTabId: null };
    return tabManager.goForward(payload);
  });

  ipcMain.handle(BrowserIpcChannels.reload, (event, payload: TabActionRequest = {}) => {
    log(BrowserIpcChannels.reload, payload);
    const tabManager = getTabManagerForSender(event.sender.id);
    if (!tabManager) return { tabs: [], activeTabId: null };
    return tabManager.reload(payload);
  });

  ipcMain.handle(BrowserIpcChannels.openDevTools, (event, payload: TabActionRequest = {}) => {
    log(BrowserIpcChannels.openDevTools, payload);
    const tabManager = getTabManagerForSender(event.sender.id);
    if (!tabManager) return;
    tabManager.openDevTools(payload);
  });

  ipcMain.handle(BrowserIpcChannels.closeDevTools, (event, payload: TabActionRequest = {}) => {
    log(BrowserIpcChannels.closeDevTools, payload);
    const tabManager = getTabManagerForSender(event.sender.id);
    if (!tabManager) return;
    tabManager.closeDevTools(payload);
  });

  ipcMain.handle(
    BrowserIpcChannels.setDevToolsDockWidth,
    (event, payload: DevToolsDockWidthRequest) => {
      log(BrowserIpcChannels.setDevToolsDockWidth, payload);
      const tabManager = getTabManagerForSender(event.sender.id);
      if (!tabManager) return null;
      return tabManager.setDevToolsDockWidth(payload.width);
    }
  );

  ipcMain.handle(BrowserIpcChannels.getDevToolsDockState, event => {
    log(BrowserIpcChannels.getDevToolsDockState);
    const tabManager = getTabManagerForSender(event.sender.id);
    if (!tabManager) return null;
    return tabManager.getDevToolsDockState();
  });

  ipcMain.handle(
    BrowserIpcChannels.setPinnedTabs,
    (event, payload: SetPinnedTabsRequest) => {
      log(BrowserIpcChannels.setPinnedTabs, payload);
      const tabManager = getTabManagerForSender(event.sender.id);
      if (!tabManager) return;
      tabManager.setPinnedTabs(payload.tabIds);
    }
  );

  ipcMain.handle(
    BrowserIpcChannels.tabBindWebContents,
    (event, payload: TabWebContentsBindRequest) => {
      log(BrowserIpcChannels.tabBindWebContents, payload);
      const tabManager = getTabManagerForSender(event.sender.id);
      if (!tabManager) return;
      tabManager.bindWebContents(payload.tabId, payload.webContentsId);
    }
  );

  ipcMain.handle(
    BrowserIpcChannels.tabUnbindWebContents,
    (event, payload: TabWebContentsUnbindRequest) => {
      log(BrowserIpcChannels.tabUnbindWebContents, payload);
      const tabManager = getTabManagerForSender(event.sender.id);
      if (!tabManager) return;
      tabManager.unbindWebContents(payload.tabId);
    }
  );

  ipcMain.handle(
    BrowserIpcChannels.tabRuntimeUpdate,
    (event, payload: TabRuntimeUpdateRequest) => {
      log(BrowserIpcChannels.tabRuntimeUpdate, payload);
      const tabManager = getTabManagerForSender(event.sender.id);
      if (!tabManager) return { tabs: [], activeTabId: null };
      return tabManager.updateTabRuntime(payload);
    }
  );

  ipcMain.handle(
    BrowserIpcChannels.tabSetRenderMode,
    (event, payload: TabRenderModeRequest) => {
      log(BrowserIpcChannels.tabSetRenderMode, payload);
      const tabManager = getTabManagerForSender(event.sender.id);
      if (!tabManager) return { tabs: [], activeTabId: null };
      return tabManager.setTabRenderMode(payload.tabId, payload.mode);
    }
  );

  ipcMain.handle(
    BrowserIpcChannels.setViewportBounds,
    (event, payload: ViewportBounds) => {
      log(BrowserIpcChannels.setViewportBounds, payload);
      const tabManager = getTabManagerForSender(event.sender.id);
      if (!tabManager) return;
      tabManager.setViewportBounds(payload);
    }
  );
}

