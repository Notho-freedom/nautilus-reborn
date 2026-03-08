import { ipcMain } from 'electron';
import { BrowserIpcChannels } from '../../../shared/browser-contract';
import { BackendSidecarManager } from '../backend-sidecar-manager';

interface RegisterBackendLabIpcOptions {
  backendLabManager: BackendSidecarManager;
  debug: boolean;
  onStateChanged: (state: ReturnType<BackendSidecarManager['getState']>) => void;
}

function removeExistingHandlers() {
  ipcMain.removeHandler(BrowserIpcChannels.backendLabGetState);
  ipcMain.removeHandler(BrowserIpcChannels.backendLabStart);
  ipcMain.removeHandler(BrowserIpcChannels.backendLabStop);
  ipcMain.removeHandler(BrowserIpcChannels.backendLabRestart);
}

export function registerBackendLabIpc({
  backendLabManager,
  debug,
  onStateChanged,
}: RegisterBackendLabIpcOptions) {
  const log = (channel: string, payload?: unknown) => {
    if (!debug) return;
    const serialized = payload ? JSON.stringify(payload) : '';
    console.info(`[ipc] ${channel} ${serialized}`);
  };

  removeExistingHandlers();

  ipcMain.handle(BrowserIpcChannels.backendLabGetState, () => {
    log(BrowserIpcChannels.backendLabGetState);
    return backendLabManager.getState();
  });

  ipcMain.handle(BrowserIpcChannels.backendLabStart, async () => {
    log(BrowserIpcChannels.backendLabStart);
    const state = await backendLabManager.start();
    onStateChanged(state);
    return state;
  });

  ipcMain.handle(BrowserIpcChannels.backendLabStop, async () => {
    log(BrowserIpcChannels.backendLabStop);
    const state = await backendLabManager.stop();
    onStateChanged(state);
    return state;
  });

  ipcMain.handle(BrowserIpcChannels.backendLabRestart, async () => {
    log(BrowserIpcChannels.backendLabRestart);
    const state = await backendLabManager.restart();
    onStateChanged(state);
    return state;
  });
}
