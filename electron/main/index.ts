import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { app, BrowserWindow, session } from 'electron';
import { BrowserIpcChannels } from '../../shared/browser-contract';
import { registerBrowserIpc } from './ipc/browser-ipc';
import { NetworkLayer } from './network-layer';
import { TabManager } from './tab-manager';
import { createMainWindow } from './window-manager';

const DEBUG_IPC = process.env.NOTILUS_DEBUG_IPC === '1';
const INITIAL_URL = 'notilus://speed-dial';

let mainWindow: BrowserWindow | null = null;
let tabManager: TabManager | null = null;

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

  registerBrowserIpc({ tabManager, debug: DEBUG_IPC });
  tabManager.createTab(INITIAL_URL);

  mainWindow.webContents.on('did-finish-load', () => {
    broadcastState();
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
