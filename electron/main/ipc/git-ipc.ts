import { ipcMain } from 'electron';
import type { GitCommitRequest, GitFileRequest } from '../../../shared/browser-contract';
import { BrowserIpcChannels } from '../../../shared/browser-contract';
import { GitManager } from '../git-manager';

interface RegisterGitIpcOptions {
  gitManager: GitManager;
  debug: boolean;
  onStateChanged: (snapshot: Awaited<ReturnType<GitManager['refresh']>>) => void;
}

function removeExistingHandlers() {
  ipcMain.removeHandler(BrowserIpcChannels.gitGetState);
  ipcMain.removeHandler(BrowserIpcChannels.gitRefresh);
  ipcMain.removeHandler(BrowserIpcChannels.gitCommit);
  ipcMain.removeHandler(BrowserIpcChannels.gitStageFile);
  ipcMain.removeHandler(BrowserIpcChannels.gitUnstageFile);
  ipcMain.removeHandler(BrowserIpcChannels.gitDiscardFile);
}

export function registerGitIpc({ gitManager, debug, onStateChanged }: RegisterGitIpcOptions) {
  const log = (channel: string, payload?: unknown) => {
    if (!debug) return;
    const serialized = payload ? JSON.stringify(payload) : '';
    console.info(`[ipc] ${channel} ${serialized}`);
  };

  removeExistingHandlers();

  const refreshAndBroadcast = async () => {
    const snapshot = await gitManager.refresh();
    onStateChanged(snapshot);
    return snapshot;
  };

  ipcMain.handle(BrowserIpcChannels.gitGetState, async () => {
    log(BrowserIpcChannels.gitGetState);
    return refreshAndBroadcast();
  });

  ipcMain.handle(BrowserIpcChannels.gitRefresh, async () => {
    log(BrowserIpcChannels.gitRefresh);
    return refreshAndBroadcast();
  });

  ipcMain.handle(BrowserIpcChannels.gitCommit, async (_event, payload: GitCommitRequest) => {
    log(BrowserIpcChannels.gitCommit, payload);
    const snapshot = await gitManager.commit(payload.message);
    onStateChanged(snapshot);
    return snapshot;
  });

  ipcMain.handle(BrowserIpcChannels.gitStageFile, async (_event, payload: GitFileRequest) => {
    log(BrowserIpcChannels.gitStageFile, payload);
    const snapshot = await gitManager.stageFile(payload.path);
    onStateChanged(snapshot);
    return snapshot;
  });

  ipcMain.handle(BrowserIpcChannels.gitUnstageFile, async (_event, payload: GitFileRequest) => {
    log(BrowserIpcChannels.gitUnstageFile, payload);
    const snapshot = await gitManager.unstageFile(payload.path);
    onStateChanged(snapshot);
    return snapshot;
  });

  ipcMain.handle(BrowserIpcChannels.gitDiscardFile, async (_event, payload: GitFileRequest) => {
    log(BrowserIpcChannels.gitDiscardFile, payload);
    const snapshot = await gitManager.discardFile(payload.path);
    onStateChanged(snapshot);
    return snapshot;
  });
}
