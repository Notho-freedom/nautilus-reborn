import { BrowserWindow, ipcMain } from 'electron';
import { BrowserIpcChannels, type WindowState } from '../../../shared/browser-contract';
import type { RuntimeMode } from '../../../shared/viewport-contract';

function removeExistingHandlers() {
  ipcMain.removeHandler(BrowserIpcChannels.windowMinimize);
  ipcMain.removeHandler(BrowserIpcChannels.windowToggleMaximize);
  ipcMain.removeHandler(BrowserIpcChannels.windowClose);
  ipcMain.removeHandler(BrowserIpcChannels.windowGetState);
  ipcMain.removeHandler(BrowserIpcChannels.windowGetRuntimeMode);
}

function getWindowState(window: BrowserWindow): WindowState {
  return { isMaximized: window.isMaximized() };
}

interface RegisterWindowIpcOptions {
  window: BrowserWindow;
  debug: boolean;
  getRuntimeMode: () => RuntimeMode;
  onRuntimeModeChanged?: (listener: (mode: RuntimeMode) => void) => () => void;
}

export function registerWindowIpc({
  window,
  debug,
  getRuntimeMode,
  onRuntimeModeChanged,
}: RegisterWindowIpcOptions) {
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

  ipcMain.handle(BrowserIpcChannels.windowGetRuntimeMode, () => {
    log(BrowserIpcChannels.windowGetRuntimeMode);
    return getRuntimeMode();
  });

  window.on('maximize', emitState);
  window.on('unmaximize', emitState);
  window.on('enter-full-screen', emitState);
  window.on('leave-full-screen', emitState);

  if (onRuntimeModeChanged) {
    onRuntimeModeChanged(mode => {
      if (window.isDestroyed()) return;
      window.webContents.send(BrowserIpcChannels.windowRuntimeModeChanged, mode);
    });
  }
}
