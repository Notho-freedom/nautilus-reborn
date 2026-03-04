import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { app, BrowserWindow, session } from 'electron';
import { BrowserIpcChannels } from '../../shared/browser-contract';
import { registerBrowserIpc } from './ipc/browser-ipc';
import { registerDownloadIpc } from './ipc/download-ipc';
import { registerGitIpc } from './ipc/git-ipc';
import { registerStudioIpc } from './ipc/studio-ipc';
import { registerWindowIpc } from './ipc/window-ipc';
import { DownloadManager } from './download-manager';
import { GitManager } from './git-manager';
import { NetworkLayer } from './network-layer';
import { StudioManager } from './studio-manager';
import { TabManager } from './tab-manager';
import { createMainWindow } from './window-manager';

const DEBUG_IPC = process.env.NOTILUS_DEBUG_IPC === '1';
const INITIAL_URL = 'notilus://speed-dial';
const SHARED_WEBVIEW_PARTITION = 'persist:notilus-default';
const IS_DEV = !app.isPackaged;
const SINGLE_INSTANCE_LOCK = app.requestSingleInstanceLock();

let mainWindow: BrowserWindow | null = null;
let tabManager: TabManager | null = null;
let downloadManager: DownloadManager | null = null;
let gitManager: GitManager | null = null;
let studioManager: StudioManager | null = null;

if (!SINGLE_INSTANCE_LOCK) {
  app.quit();
  process.exit(0);
}

function configureSessionDataPath() {
  try {
    const sessionRoot = join(app.getPath('userData'), IS_DEV ? 'session-dev' : 'session');
    mkdirSync(sessionRoot, { recursive: true });
    app.setPath('sessionData', sessionRoot);
    app.commandLine.appendSwitch('disk-cache-dir', join(sessionRoot, 'disk-cache'));
    app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
  } catch (error) {
    console.error('[bootstrap] failed to configure sessionData path', error);
  }
}

function resolvePreloadPath(): string {
  const mjsPath = join(__dirname, '../preload/index.mjs');
  if (existsSync(mjsPath)) return mjsPath;
  return join(__dirname, '../preload/index.js');
}

function resolveExternalPreloadPath(): string {
  const mjsPath = join(__dirname, '../preload/external.mjs');
  if (existsSync(mjsPath)) return mjsPath;
  return join(__dirname, '../preload/external.js');
}

function broadcastState() {
  if (!mainWindow || mainWindow.isDestroyed() || !tabManager) return;
  mainWindow.webContents.send(BrowserIpcChannels.stateChanged, tabManager.getSnapshot());
}

function createDesktopWindow() {
  const preloadPath = resolvePreloadPath();
  const externalPreloadPath = resolveExternalPreloadPath();
  mainWindow = createMainWindow({ preloadPath });

  mainWindow.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    const sourceUrl = typeof params.src === 'string' ? params.src.trim() : '';
    const blocked =
      sourceUrl.startsWith('notilus://') ||
      sourceUrl.startsWith('javascript:') ||
      sourceUrl.startsWith('file://');

    if (blocked) {
      event.preventDefault();
      if (DEBUG_IPC) {
        console.info(`[webview] blocked source=${sourceUrl || '(empty)'}`);
      }
      return;
    }

    delete (webPreferences as Record<string, unknown>).preloadURL;
    webPreferences.preload = externalPreloadPath;
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;
    webPreferences.webSecurity = true;
    webPreferences.partition = SHARED_WEBVIEW_PARTITION;
  });

  const networkLayer = new NetworkLayer(session.defaultSession, DEBUG_IPC);
  networkLayer.setup();
  const webviewSession = session.fromPartition(SHARED_WEBVIEW_PARTITION);
  if (webviewSession !== session.defaultSession) {
    const webviewNetworkLayer = new NetworkLayer(webviewSession, DEBUG_IPC);
    webviewNetworkLayer.setup();
  }

  tabManager = new TabManager({
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

  registerBrowserIpc({
    tabManager,
    debug: DEBUG_IPC,
  });
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
  studioManager = new StudioManager(mainWindow, tabManager, DEBUG_IPC);
  registerStudioIpc({ studioManager, debug: DEBUG_IPC });
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

  mainWindow.on('closed', () => {
    mainWindow = null;
    tabManager = null;
    downloadManager = null;
    gitManager = null;
    studioManager = null;
  });
}


app.whenReady().then(() => {
  app.setAppUserModelId('com.notilus.reborn');

  createDesktopWindow();

  app.on('activate', () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      createDesktopWindow();
    }
  });
});

app.on('second-instance', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.focus();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

configureSessionDataPath();
