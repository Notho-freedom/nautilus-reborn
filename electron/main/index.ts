import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { app, BrowserWindow, session } from 'electron';
import { BrowserIpcChannels } from '../../shared/browser-contract';
import { registerBrowserIpc } from './ipc/browser-ipc';
import { registerBrowserImportIpc } from './ipc/browser-import-ipc';
import { registerBackendLabIpc } from './ipc/backend-lab-ipc';
import { registerDownloadIpc } from './ipc/download-ipc';
import { registerGitIpc } from './ipc/git-ipc';
import { registerStudioIpc } from './ipc/studio-ipc';
import { registerSystemIpc } from './ipc/system-ipc';
import { registerTerminalIpc } from './ipc/terminal-ipc';
import { registerWindowIpc } from './ipc/window-ipc';
import { DownloadManager } from './download-manager';
import { BackendSidecarManager } from './backend-sidecar-manager';
import { BrowserImportManager } from './browser-import-manager';
import { GitManager } from './git-manager';
import { NetworkLayer } from './network-layer';
import { StudioManager } from './studio-manager';
import { SystemMetricsManager } from './system-metrics-manager';
import { TabManager } from './tab-manager';
import { TerminalManager } from './terminal-manager';
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
let browserImportManager: BrowserImportManager | null = null;
let backendLabManager: BackendSidecarManager | null = null;
let studioManager: StudioManager | null = null;
let systemMetricsManager: SystemMetricsManager | null = null;
let terminalManager: TerminalManager | null = null;

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
    webPreferences.devTools = true;
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
    getMainWindow: () => mainWindow,
    onStateChanged: snapshot => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      mainWindow.webContents.send(BrowserIpcChannels.stateChanged, snapshot);
    },
    onDevToolsDockStateChanged: state => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      mainWindow.webContents.send(BrowserIpcChannels.devToolsDockStateChanged, state);
    },
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    const key = typeof input.key === 'string' ? input.key.toUpperCase() : '';
    const isDevToolsShortcut =
      key === 'F12' || ((input.control || input.meta) && input.shift && key === 'I');
    if (!isDevToolsShortcut) return;

    event.preventDefault();

    if (!tabManager?.hasActiveExternalTab()) {
      return;
    }

    const dockOpen = tabManager.getDevToolsDockState().isOpen;
    if (dockOpen) {
      tabManager.closeDevTools({});
    } else {
      tabManager.openDevTools({});
    }
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
  browserImportManager = new BrowserImportManager({ debug: DEBUG_IPC });
  backendLabManager = new BackendSidecarManager({
    debug: DEBUG_IPC,
    onStateChanged: state => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      mainWindow.webContents.send(BrowserIpcChannels.backendLabStateChanged, state);
    },
  });
  registerGitIpc({
    gitManager,
    debug: DEBUG_IPC,
    onStateChanged: snapshot => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      mainWindow.webContents.send(BrowserIpcChannels.gitStateChanged, snapshot);
    },
  });
  registerBrowserImportIpc({
    browserImportManager,
    debug: DEBUG_IPC,
  });
  registerBackendLabIpc({
    backendLabManager,
    debug: DEBUG_IPC,
    onStateChanged: state => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      mainWindow.webContents.send(BrowserIpcChannels.backendLabStateChanged, state);
    },
  });
  systemMetricsManager = new SystemMetricsManager({
    debug: DEBUG_IPC,
    onChanged: snapshot => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      mainWindow.webContents.send(BrowserIpcChannels.systemMetricsChanged, snapshot);
    },
  });
  registerSystemIpc({ systemMetricsManager, debug: DEBUG_IPC });
  systemMetricsManager.start();

  studioManager = new StudioManager(mainWindow, tabManager, DEBUG_IPC, payload => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send(BrowserIpcChannels.studioWebviewViewportChanged, payload);
  });
  registerStudioIpc({ studioManager, debug: DEBUG_IPC });

  terminalManager = new TerminalManager({
    debug: DEBUG_IPC,
    onData: payload => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      mainWindow.webContents.send(BrowserIpcChannels.terminalData, payload);
    },
    onExit: payload => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      mainWindow.webContents.send(BrowserIpcChannels.terminalExit, payload);
    },
  });
  registerTerminalIpc({ terminalManager, debug: DEBUG_IPC });
  tabManager.createTab(INITIAL_URL);

  mainWindow.webContents.on('did-finish-load', () => {
    broadcastState();
    if (tabManager && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(
        BrowserIpcChannels.devToolsDockStateChanged,
        tabManager.getDevToolsDockState()
      );
    }
    if (downloadManager && mainWindow && !mainWindow.isDestroyed()) {
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
    if (backendLabManager && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(
        BrowserIpcChannels.backendLabStateChanged,
        backendLabManager.getState()
      );
    }
    if (systemMetricsManager && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(
        BrowserIpcChannels.systemMetricsChanged,
        systemMetricsManager.getSnapshot()
      );
    }
    if (studioManager && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(
        BrowserIpcChannels.studioWebviewViewportChanged,
        studioManager.getWebviewViewport()
      );
    }
  });

  const syncDevToolsLayout = () => {
    tabManager?.syncDevToolsLayout();
  };

  mainWindow.on('resize', syncDevToolsLayout);
  mainWindow.on('move', syncDevToolsLayout);
  mainWindow.on('maximize', syncDevToolsLayout);
  mainWindow.on('unmaximize', syncDevToolsLayout);
  mainWindow.on('restore', syncDevToolsLayout);
  mainWindow.on('minimize', syncDevToolsLayout);
  mainWindow.on('enter-full-screen', syncDevToolsLayout);
  mainWindow.on('leave-full-screen', syncDevToolsLayout);

  mainWindow.on('closed', () => {
    systemMetricsManager?.stop();
    backendLabManager?.dispose();
    terminalManager?.dispose();
    mainWindow = null;
    tabManager = null;
    downloadManager = null;
    gitManager = null;
    browserImportManager = null;
    backendLabManager = null;
    studioManager = null;
    systemMetricsManager = null;
    terminalManager = null;
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
