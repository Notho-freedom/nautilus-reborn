import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { app, BrowserWindow, session } from 'electron';
import { BrowserIpcChannels } from '../../shared/browser-contract';
import { registerBrowserIpc } from './ipc/browser-ipc';
import { registerDownloadIpc } from './ipc/download-ipc';
import { registerGitIpc } from './ipc/git-ipc';
import { registerWindowIpc } from './ipc/window-ipc';
import { DownloadManager } from './download-manager';
import { GitManager } from './git-manager';
import { NetworkLayer } from './network-layer';
import { TabManager } from './tab-manager';
import { createMainWindow } from './window-manager';

const DEBUG_IPC = process.env.NOTILUS_DEBUG_IPC === '1';
const INITIAL_URL = 'notilus://speed-dial';

let mainWindow: BrowserWindow | null = null;
let tabManager: TabManager | null = null;
let downloadManager: DownloadManager | null = null;
let gitManager: GitManager | null = null;

function resolvePreloadPath(): string {
  const mjsPath = join(__dirname, '../preload/index.mjs');
  if (existsSync(mjsPath)) return mjsPath;
  return join(__dirname, '../preload/index.js');
}

function broadcastState() {
  if (!mainWindow || mainWindow.isDestroyed() || !tabManager) return;
  mainWindow.webContents.send(BrowserIpcChannels.stateChanged, tabManager.getSnapshot());
}

function createDesktopWindow() {
  const preloadPath = resolvePreloadPath();
  mainWindow = createMainWindow({ preloadPath });

  const networkLayer = new NetworkLayer(session.defaultSession, DEBUG_IPC);
  networkLayer.setup();

  tabManager = new TabManager({
    window: mainWindow,
    preloadPath,
    debug: DEBUG_IPC,
    onStateChanged: snapshot => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      mainWindow.webContents.send(BrowserIpcChannels.stateChanged, snapshot);
    },
  });

  downloadManager = new DownloadManager(
    session.defaultSession,
    snapshot => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      mainWindow.webContents.send(BrowserIpcChannels.downloadsStateChanged, snapshot);
    },
    DEBUG_IPC
  );
  downloadManager.setup();

  registerBrowserIpc({ tabManager, debug: DEBUG_IPC });
  registerDownloadIpc({ downloadManager, debug: DEBUG_IPC });
  registerWindowIpc(mainWindow, DEBUG_IPC);
  gitManager = new GitManager(DEBUG_IPC);
  registerGitIpc({
    gitManager,
    debug: DEBUG_IPC,
    onStateChanged: snapshot => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      mainWindow.webContents.send(BrowserIpcChannels.gitStateChanged, snapshot);
    },
  });
  tabManager.createTab(INITIAL_URL);

  mainWindow.webContents.on('did-finish-load', () => {
    broadcastState();
    if (downloadManager && !mainWindow?.isDestroyed()) {
      mainWindow.webContents.send(
        BrowserIpcChannels.downloadsStateChanged,
        downloadManager.getSnapshot()
      );
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(BrowserIpcChannels.windowStateChanged, {
        isMaximized: mainWindow.isMaximized(),
      });
    }
    if (gitManager && mainWindow && !mainWindow.isDestroyed()) {
      void gitManager.refresh().then(snapshot => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        mainWindow.webContents.send(BrowserIpcChannels.gitStateChanged, snapshot);
      });
    }
  });
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.notilus.reborn');

  createDesktopWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createDesktopWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
