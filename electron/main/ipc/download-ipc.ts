import { ipcMain } from 'electron';
import type { DownloadActionRequest } from '../../../shared/browser-contract';
import { BrowserIpcChannels } from '../../../shared/browser-contract';
import { DownloadManager } from '../download-manager';

interface RegisterDownloadIpcOptions {
  downloadManager: DownloadManager;
  debug: boolean;
}

function removeExistingHandlers() {
  ipcMain.removeHandler(BrowserIpcChannels.downloadsGetState);
  ipcMain.removeHandler(BrowserIpcChannels.downloadsPause);
  ipcMain.removeHandler(BrowserIpcChannels.downloadsResume);
  ipcMain.removeHandler(BrowserIpcChannels.downloadsCancel);
  ipcMain.removeHandler(BrowserIpcChannels.downloadsRemove);
  ipcMain.removeHandler(BrowserIpcChannels.downloadsClearCompleted);
  ipcMain.removeHandler(BrowserIpcChannels.downloadsOpen);
  ipcMain.removeHandler(BrowserIpcChannels.downloadsShowInFolder);
}

export function registerDownloadIpc({ downloadManager, debug }: RegisterDownloadIpcOptions) {
  const log = (channel: string, payload?: unknown) => {
    if (!debug) return;
    const serialized = payload ? JSON.stringify(payload) : '';
    console.info(`[ipc] ${channel} ${serialized}`);
  };

  removeExistingHandlers();

  ipcMain.handle(BrowserIpcChannels.downloadsGetState, () => {
    log(BrowserIpcChannels.downloadsGetState);
    return downloadManager.getSnapshot();
  });

  ipcMain.handle(BrowserIpcChannels.downloadsPause, (_event, payload: DownloadActionRequest) => {
    log(BrowserIpcChannels.downloadsPause, payload);
    return downloadManager.pause(payload.downloadId);
  });

  ipcMain.handle(BrowserIpcChannels.downloadsResume, (_event, payload: DownloadActionRequest) => {
    log(BrowserIpcChannels.downloadsResume, payload);
    return downloadManager.resume(payload.downloadId);
  });

  ipcMain.handle(BrowserIpcChannels.downloadsCancel, (_event, payload: DownloadActionRequest) => {
    log(BrowserIpcChannels.downloadsCancel, payload);
    return downloadManager.cancel(payload.downloadId);
  });

  ipcMain.handle(BrowserIpcChannels.downloadsRemove, (_event, payload: DownloadActionRequest) => {
    log(BrowserIpcChannels.downloadsRemove, payload);
    return downloadManager.remove(payload.downloadId);
  });

  ipcMain.handle(BrowserIpcChannels.downloadsClearCompleted, () => {
    log(BrowserIpcChannels.downloadsClearCompleted);
    return downloadManager.clearCompleted();
  });

  ipcMain.handle(BrowserIpcChannels.downloadsOpen, async (_event, payload: DownloadActionRequest) => {
    log(BrowserIpcChannels.downloadsOpen, payload);
    await downloadManager.open(payload.downloadId);
  });

  ipcMain.handle(
    BrowserIpcChannels.downloadsShowInFolder,
    (_event, payload: DownloadActionRequest) => {
      log(BrowserIpcChannels.downloadsShowInFolder, payload);
      downloadManager.showInFolder(payload.downloadId);
    }
  );
}
