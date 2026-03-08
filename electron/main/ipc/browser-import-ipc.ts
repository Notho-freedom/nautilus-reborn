import { ipcMain } from 'electron';
import type {
  ImportPreviewRequest,
  ImportRunRequest,
} from '../../../shared/browser-contract';
import { BrowserIpcChannels } from '../../../shared/browser-contract';
import { BrowserImportManager } from '../browser-import-manager';

interface RegisterBrowserImportIpcOptions {
  browserImportManager: BrowserImportManager;
  debug: boolean;
}

function removeExistingHandlers() {
  ipcMain.removeHandler(BrowserIpcChannels.importListProfiles);
  ipcMain.removeHandler(BrowserIpcChannels.importPreview);
  ipcMain.removeHandler(BrowserIpcChannels.importRun);
}

export function registerBrowserImportIpc({
  browserImportManager,
  debug,
}: RegisterBrowserImportIpcOptions) {
  const log = (channel: string, payload?: unknown) => {
    if (!debug) return;
    const serialized = payload ? JSON.stringify(payload) : '';
    console.info(`[ipc] ${channel} ${serialized}`);
  };

  removeExistingHandlers();

  ipcMain.handle(BrowserIpcChannels.importListProfiles, () => {
    log(BrowserIpcChannels.importListProfiles);
    return browserImportManager.listProfiles();
  });

  ipcMain.handle(BrowserIpcChannels.importPreview, (_event, payload: ImportPreviewRequest) => {
    log(BrowserIpcChannels.importPreview, payload);
    return browserImportManager.previewImport(payload);
  });

  ipcMain.handle(BrowserIpcChannels.importRun, (_event, payload: ImportRunRequest) => {
    log(BrowserIpcChannels.importRun, payload);
    return browserImportManager.runImport(payload);
  });
}
