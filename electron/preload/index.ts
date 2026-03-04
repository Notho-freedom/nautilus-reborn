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
  closeDevTools: payload => ipcRenderer.invoke(BrowserIpcChannels.closeDevTools, payload),
  setPinnedTabs: payload => ipcRenderer.invoke(BrowserIpcChannels.setPinnedTabs, payload),
  bindTabWebContents: payload =>
    ipcRenderer.invoke(BrowserIpcChannels.tabBindWebContents, payload),
  unbindTabWebContents: payload =>
    ipcRenderer.invoke(BrowserIpcChannels.tabUnbindWebContents, payload),
  updateTabRuntime: payload =>
    ipcRenderer.invoke(BrowserIpcChannels.tabRuntimeUpdate, payload),
  onStateChanged: listener => {
    const handler = (_event: Electron.IpcRendererEvent, snapshot: Parameters<typeof listener>[0]) => {
      listener(snapshot);
    };
    ipcRenderer.on(BrowserIpcChannels.stateChanged, handler);
    return () => {
      ipcRenderer.removeListener(BrowserIpcChannels.stateChanged, handler);
    };
  },
  minimizeWindow: () => ipcRenderer.invoke(BrowserIpcChannels.windowMinimize),
  toggleMaximizeWindow: () => ipcRenderer.invoke(BrowserIpcChannels.windowToggleMaximize),
  closeWindow: () => ipcRenderer.invoke(BrowserIpcChannels.windowClose),
  getWindowState: () => ipcRenderer.invoke(BrowserIpcChannels.windowGetState),
  onWindowStateChanged: listener => {
    const handler = (_event: Electron.IpcRendererEvent, state: Parameters<typeof listener>[0]) => {
      listener(state);
    };
    ipcRenderer.on(BrowserIpcChannels.windowStateChanged, handler);
    return () => {
      ipcRenderer.removeListener(BrowserIpcChannels.windowStateChanged, handler);
    };
  },
  getDownloads: () => ipcRenderer.invoke(BrowserIpcChannels.downloadsGetState),
  pauseDownload: payload => ipcRenderer.invoke(BrowserIpcChannels.downloadsPause, payload),
  resumeDownload: payload =>
    ipcRenderer.invoke(BrowserIpcChannels.downloadsResume, payload),
  cancelDownload: payload =>
    ipcRenderer.invoke(BrowserIpcChannels.downloadsCancel, payload),
  removeDownload: payload =>
    ipcRenderer.invoke(BrowserIpcChannels.downloadsRemove, payload),
  clearCompletedDownloads: () =>
    ipcRenderer.invoke(BrowserIpcChannels.downloadsClearCompleted),
  openDownload: payload => ipcRenderer.invoke(BrowserIpcChannels.downloadsOpen, payload),
  showDownloadInFolder: payload =>
    ipcRenderer.invoke(BrowserIpcChannels.downloadsShowInFolder, payload),
  onDownloadsChanged: listener => {
    const handler = (_event: Electron.IpcRendererEvent, snapshot: Parameters<typeof listener>[0]) => {
      listener(snapshot);
    };
    ipcRenderer.on(BrowserIpcChannels.downloadsStateChanged, handler);
    return () => {
      ipcRenderer.removeListener(BrowserIpcChannels.downloadsStateChanged, handler);
    };
  },
  getGitState: () => ipcRenderer.invoke(BrowserIpcChannels.gitGetState),
  refreshGitState: () => ipcRenderer.invoke(BrowserIpcChannels.gitRefresh),
  commitGit: payload => ipcRenderer.invoke(BrowserIpcChannels.gitCommit, payload),
  stageGitFile: payload => ipcRenderer.invoke(BrowserIpcChannels.gitStageFile, payload),
  unstageGitFile: payload => ipcRenderer.invoke(BrowserIpcChannels.gitUnstageFile, payload),
  discardGitFile: payload => ipcRenderer.invoke(BrowserIpcChannels.gitDiscardFile, payload),
  onGitStateChanged: listener => {
    const handler = (_event: Electron.IpcRendererEvent, snapshot: Parameters<typeof listener>[0]) => {
      listener(snapshot);
    };
    ipcRenderer.on(BrowserIpcChannels.gitStateChanged, handler);
    return () => {
      ipcRenderer.removeListener(BrowserIpcChannels.gitStateChanged, handler);
    };
  },
  studioResizeWindow: payload => ipcRenderer.invoke(BrowserIpcChannels.studioResizeWindow, payload),
  studioCaptureViewport: () => ipcRenderer.invoke(BrowserIpcChannels.studioCaptureViewport),
  studioCaptureFullPage: () => ipcRenderer.invoke(BrowserIpcChannels.studioCaptureFullPage),
  studioApplyCss: payload => ipcRenderer.invoke(BrowserIpcChannels.studioApplyCss, payload),
  studioClearCss: () => ipcRenderer.invoke(BrowserIpcChannels.studioClearCss),
  studioRunScript: payload => ipcRenderer.invoke(BrowserIpcChannels.studioRunScript, payload),
  studioStartRecording: () => ipcRenderer.invoke(BrowserIpcChannels.studioStartRecording),
  studioStopRecording: () => ipcRenderer.invoke(BrowserIpcChannels.studioStopRecording),
  studioGetRecording: () => ipcRenderer.invoke(BrowserIpcChannels.studioGetRecording),
};

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('notilusDesktop', api);
} else {
  (globalThis as any).notilusDesktop = api;
}
