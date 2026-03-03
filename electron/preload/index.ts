import { contextBridge, ipcRenderer } from 'electron';
import type { BrowserDesktopApi } from '../../shared/browser-contract';
import { BrowserIpcChannels } from '../../shared/browser-contract';

const api: BrowserDesktopApi = {
  getState: () => ipcRenderer.invoke(BrowserIpcChannels.getState),
  createTab: payload => ipcRenderer.invoke(BrowserIpcChannels.tabCreate, payload),
  closeTab: payload => ipcRenderer.invoke(BrowserIpcChannels.tabClose, payload),
  activateTab: payload => ipcRenderer.invoke(BrowserIpcChannels.tabActivate, payload),
  navigate: payload => ipcRenderer.invoke(BrowserIpcChannels.navigate, payload),
  goBack: payload => ipcRenderer.invoke(BrowserIpcChannels.goBack, payload),
  goForward: payload => ipcRenderer.invoke(BrowserIpcChannels.goForward, payload),
  reload: payload => ipcRenderer.invoke(BrowserIpcChannels.reload, payload),
  openDevTools: payload => ipcRenderer.invoke(BrowserIpcChannels.openDevTools, payload),
  setViewportBounds: payload =>
    ipcRenderer.invoke(BrowserIpcChannels.setViewportBounds, payload),
  onStateChanged: listener => {
    const handler = (_event: Electron.IpcRendererEvent, snapshot: Parameters<typeof listener>[0]) => {
      listener(snapshot);
    };
    ipcRenderer.on(BrowserIpcChannels.stateChanged, handler);
    return () => {
      ipcRenderer.removeListener(BrowserIpcChannels.stateChanged, handler);
    };
  },
};

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('notilusDesktop', api);
} else {
  (window as Window & { notilusDesktop: BrowserDesktopApi }).notilusDesktop = api;
}

