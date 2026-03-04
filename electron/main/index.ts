import { existsSync } from 'node:fs';
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
import { ViewportLayoutManager } from './viewport-layout-manager';
import { WindowStackManager } from './window-stack-manager';

const DEBUG_IPC = process.env.NOTILUS_DEBUG_IPC === '1';
const INITIAL_URL = 'notilus://speed-dial';

let mainWindow: BrowserWindow | null = null;
let windowStack: WindowStackManager | null = null;
let viewportLayoutManager: ViewportLayoutManager | null = null;
let tabManager: TabManager | null = null;
let downloadManager: DownloadManager | null = null;
let gitManager: GitManager | null = null;
let studioManager: StudioManager | null = null;

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
  windowStack = new WindowStackManager({ preloadPath, debug: DEBUG_IPC });
  mainWindow = windowStack.getChromeWindow();

  const runtimeMode = windowStack.getRuntimeMode();
  const contentWindow = windowStack.getContentWindow();
  const hostWindow = runtimeMode === 'dual-window' && contentWindow ? contentWindow : mainWindow;

  const networkLayer = new NetworkLayer(session.defaultSession, DEBUG_IPC);
  networkLayer.setup();

  tabManager = new TabManager({
    hostWindow,
    preloadPath,
    debug: DEBUG_IPC,
    onStateChanged: snapshot => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      mainWindow.webContents.send(BrowserIpcChannels.stateChanged, snapshot);
      viewportLayoutManager?.reapply();
    },
  });

  viewportLayoutManager = new ViewportLayoutManager({
    windowStack,
    tabManager,
    debug: DEBUG_IPC,
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
    onSetViewportLayout: payload => {
      viewportLayoutManager?.setLayout(payload);
    },
    debug: DEBUG_IPC,
  });
  registerDownloadIpc({ downloadManager, debug: DEBUG_IPC });
  registerWindowIpc({
    window: mainWindow,
    debug: DEBUG_IPC,
    getRuntimeMode: () => windowStack?.getRuntimeMode() ?? 'single-window-fallback',
    onRuntimeModeChanged: listener =>
      windowStack?.onRuntimeModeChanged(listener) ?? (() => {}),
  });
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
      mainWindow.webContents.send(
        BrowserIpcChannels.windowRuntimeModeChanged,
        windowStack?.getRuntimeMode() ?? 'single-window-fallback'
      );
    }
    if (gitManager && mainWindow && !mainWindow.isDestroyed()) {
      void gitManager.refresh().then(snapshot => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        mainWindow.webContents.send(BrowserIpcChannels.gitStateChanged, snapshot);
      });
    }
  });

  mainWindow.on('closed', () => {
    viewportLayoutManager?.dispose();
    viewportLayoutManager = null;
    windowStack?.destroy();
    windowStack = null;
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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
