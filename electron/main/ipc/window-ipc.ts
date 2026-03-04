import { BrowserWindow, ipcMain } from 'electron';
import { BrowserIpcChannels, type WindowState } from '../../../shared/browser-contract';

function removeExistingHandlers() {
  ipcMain.removeHandler(BrowserIpcChannels.windowMinimize);
  ipcMain.removeHandler(BrowserIpcChannels.windowToggleMaximize);
  ipcMain.removeHandler(BrowserIpcChannels.windowClose);
  ipcMain.removeHandler(BrowserIpcChannels.windowGetState);
}

function getWindowState(window: BrowserWindow): WindowState {
  return { isMaximized: window.isMaximized() };
}

export function registerWindowIpc(window: BrowserWindow, debug: boolean) {
  const log = (channel: string) => {
    if (!debug) return;
    console.info(`[ipc] ${channel}`);
  };

  const emitState = () => {
    if (window.isDestroyed()) return;
    window.webContents.send(BrowserIpcChannels.windowStateChanged, getWindowState(window));
  };

  removeExistingHandlers();

  ipcMain.handle(BrowserIpcChannels.windowMinimize, () => {
    log(BrowserIpcChannels.windowMinimize);
    window.minimize();
  });

  ipcMain.handle(BrowserIpcChannels.windowToggleMaximize, () => {
    log(BrowserIpcChannels.windowToggleMaximize);
    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }
  });

  ipcMain.handle(BrowserIpcChannels.windowClose, () => {
    log(BrowserIpcChannels.windowClose);
    window.close();
  });

  ipcMain.handle(BrowserIpcChannels.windowGetState, () => {
    log(BrowserIpcChannels.windowGetState);
    return getWindowState(window);
  });

  window.on('maximize', emitState);
  window.on('unmaximize', emitState);
  window.on('enter-full-screen', emitState);
  window.on('leave-full-screen', emitState);
}
