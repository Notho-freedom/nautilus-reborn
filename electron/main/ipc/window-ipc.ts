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

export function registerWindowIpc(debug: boolean) {
  const log = (channel: string) => {
    if (!debug) return;
    console.info(`[ipc] ${channel}`);
  };

  removeExistingHandlers();

  ipcMain.handle(BrowserIpcChannels.windowMinimize, event => {
    log(BrowserIpcChannels.windowMinimize);
    const target = BrowserWindow.fromWebContents(event.sender);
    target?.minimize();
  });

  ipcMain.handle(BrowserIpcChannels.windowToggleMaximize, event => {
    log(BrowserIpcChannels.windowToggleMaximize);
    const target = BrowserWindow.fromWebContents(event.sender);
    if (!target) return;
    if (target.isMaximized()) {
      target.unmaximize();
    } else {
      target.maximize();
    }
  });

  ipcMain.handle(BrowserIpcChannels.windowClose, event => {
    log(BrowserIpcChannels.windowClose);
    const target = BrowserWindow.fromWebContents(event.sender);
    target?.close();
  });

  ipcMain.handle(BrowserIpcChannels.windowGetState, event => {
    log(BrowserIpcChannels.windowGetState);
    const target = BrowserWindow.fromWebContents(event.sender);
    if (!target) return { isMaximized: false };
    return getWindowState(target);
  });
}
