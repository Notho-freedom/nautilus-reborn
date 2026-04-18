import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { app, BrowserWindow, session } from 'electron';
import { BrowserIpcChannels, type OpenWindowWithTabsRequest } from '../../shared/browser-contract';
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
import { BackendLabQueueManager } from './backend-lab-queue-manager';
import { BrowserImportManager } from './browser-import-manager';
import { GitManager } from './git-manager';
import { NetworkLayer } from './network-layer';
import { StudioManager } from './studio-manager';
import { SystemMetricsManager } from './system-metrics-manager';
import { TabManager } from './tab-manager';
import { TerminalManager } from './terminal-manager';
import { createMainWindow } from './window-manager';
import { buildChromeUserAgent, ensureUserAgentCompatForSession } from './user-agent-compat';
import { TabSessionStore } from './session-store';

const DEBUG_IPC = process.env.NOTILUS_DEBUG_IPC === '1';
const INITIAL_URL = 'notilus://speed-dial';
const SHARED_WEBVIEW_PARTITION = 'persist:notilus-default';
const IS_DEV = !app.isPackaged;
const SINGLE_INSTANCE_LOCK = app.requestSingleInstanceLock();

app.commandLine.appendSwitch('disable-features', 'UserAgentClientHint,UserAgentReduction');
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');

function configureUserAgent() {
  const ua = buildChromeUserAgent();
  if (!ua) return;
  app.userAgentFallback = ua;

  app.on('web-contents-created', (_event, contents) => {
    downloadManager?.registerSession(contents.session);

    const type = contents.getType();
    if (type === 'webview' || (type as string) === 'webContentsView') {
      contents.setUserAgent(app.userAgentFallback);
    }
  });
}

let mainWindow: BrowserWindow | null = null;
let tabManager: TabManager | null = null;
let downloadManager: DownloadManager | null = null;
let gitManager: GitManager | null = null;
let browserImportManager: BrowserImportManager | null = null;
let backendLabManager: BackendSidecarManager | null = null;
let backendLabQueueManager: BackendLabQueueManager | null = null;
let studioManager: StudioManager | null = null;
let systemMetricsManager: SystemMetricsManager | null = null;
let terminalManager: TerminalManager | null = null;
let tabSessionStore: TabSessionStore | null = null;
const windowControllers = new Map<number, { window: BrowserWindow; tabManager: TabManager; isPrimary: boolean }>();
const windows = new Set<BrowserWindow>();
const focusedWindows = new Set<number>();

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

function broadcast(channel: string, payload?: unknown) {
  for (const win of windows) {
    if (win.isDestroyed()) continue;
    win.webContents.send(channel, payload);
  }
}

function getControllerForSender(senderId: number) {
  const direct = windowControllers.get(senderId);
  if (direct) return direct;
  if (mainWindow && !mainWindow.isDestroyed()) {
    return windowControllers.get(mainWindow.webContents.id) ?? null;
  }
  return null;
}

function attachWindowStateEvents(window: BrowserWindow) {
  const emitState = () => {
    if (window.isDestroyed()) return;
    window.webContents.send(BrowserIpcChannels.windowStateChanged, {
      isMaximized: window.isMaximized(),
    });
  };

  window.on('maximize', emitState);
  window.on('unmaximize', emitState);
  window.on('enter-full-screen', emitState);
  window.on('leave-full-screen', emitState);
}

function configureWebviewSecurity(window: BrowserWindow, externalPreloadPath: string) {
  window.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    const sourceUrl = typeof params.src === 'string' ? params.src.trim() : '';
    const requestedPartition = typeof params.partition === 'string' ? params.partition : '';
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
    if (requestedPartition.startsWith('private:')) {
      webPreferences.partition = requestedPartition;
    } else {
      webPreferences.partition = SHARED_WEBVIEW_PARTITION;
    }
    const targetSession = session.fromPartition(webPreferences.partition);
    ensureUserAgentCompatForSession(targetSession);
    downloadManager?.registerSession(targetSession);
  });
}

function updateBackgroundState() {
  if (!systemMetricsManager) return;
  systemMetricsManager.setBackground(focusedWindows.size === 0);
}

let networkLayerReady = false;

function ensureNetworkLayer() {
  if (networkLayerReady) return;
  ensureUserAgentCompatForSession(session.defaultSession);
  const networkLayer = new NetworkLayer(session.defaultSession, DEBUG_IPC);
  networkLayer.setup();
  const webviewSession = session.fromPartition(SHARED_WEBVIEW_PARTITION);
  if (webviewSession !== session.defaultSession) {
    ensureUserAgentCompatForSession(webviewSession);
    const webviewNetworkLayer = new NetworkLayer(webviewSession, DEBUG_IPC);
    webviewNetworkLayer.setup();
  }
  networkLayerReady = true;
}

let globalManagersReady = false;

function ensureGlobalManagers() {
  if (globalManagersReady) return;
  ensureNetworkLayer();

  downloadManager = new DownloadManager(
    session.defaultSession,
    snapshot => {
      broadcast(BrowserIpcChannels.downloadsStateChanged, snapshot);
    },
    DEBUG_IPC
  );
  downloadManager.setup();
  downloadManager.registerSession(session.fromPartition(SHARED_WEBVIEW_PARTITION));
  registerDownloadIpc({ downloadManager, debug: DEBUG_IPC });

  gitManager = new GitManager(DEBUG_IPC);
  registerGitIpc({
    gitManager,
    debug: DEBUG_IPC,
    onStateChanged: snapshot => {
      broadcast(BrowserIpcChannels.gitStateChanged, snapshot);
    },
  });

  browserImportManager = new BrowserImportManager({ debug: DEBUG_IPC });
  registerBrowserImportIpc({
    browserImportManager,
    debug: DEBUG_IPC,
  });

  backendLabManager = new BackendSidecarManager({
    debug: DEBUG_IPC,
    onStateChanged: state => {
      broadcast(BrowserIpcChannels.backendLabStateChanged, state);
    },
  });

  backendLabQueueManager = new BackendLabQueueManager({
    debug: DEBUG_IPC,
  });
  registerBackendLabIpc({
    backendLabManager,
    queueManager: backendLabQueueManager,
    debug: DEBUG_IPC,
    onStateChanged: state => {
      broadcast(BrowserIpcChannels.backendLabStateChanged, state);
    },
  });

  systemMetricsManager = new SystemMetricsManager({
    debug: DEBUG_IPC,
    onChanged: snapshot => {
      broadcast(BrowserIpcChannels.systemMetricsChanged, snapshot);
    },
  });
  registerSystemIpc({ systemMetricsManager, debug: DEBUG_IPC });

  terminalManager = new TerminalManager({
    debug: DEBUG_IPC,
    onData: payload => {
      broadcast(BrowserIpcChannels.terminalData, payload);
    },
    onExit: payload => {
      broadcast(BrowserIpcChannels.terminalExit, payload);
    },
  });
  registerTerminalIpc({ terminalManager, debug: DEBUG_IPC });

  tabSessionStore = new TabSessionStore();

  registerBrowserIpc({
    getTabManagerForSender: senderId => getControllerForSender(senderId)?.tabManager ?? null,
    openWindowWithTabs,
    debug: DEBUG_IPC,
  });
  registerWindowIpc(DEBUG_IPC);

  globalManagersReady = true;
}

function buildTabsInManager(
  manager: TabManager,
  tabs: OpenWindowWithTabsRequest['tabs'],
  activeIndex?: number
) {
  const createdIds: string[] = [];
  tabs.forEach(tab => {
    const snapshot = manager.createTab(tab.url);
    if (snapshot.activeTabId) {
      createdIds.push(snapshot.activeTabId);
    }
  });

  const pinnedIds = createdIds.filter((id, index) => tabs[index]?.pinned);
  if (pinnedIds.length > 0) {
    manager.setPinnedTabs(pinnedIds);
  }

  if (typeof activeIndex === 'number' && createdIds[activeIndex]) {
    manager.activateTab(createdIds[activeIndex]);
  }
}

function createWindowController(options?: {
  tabs?: OpenWindowWithTabsRequest['tabs'];
  activeIndex?: number;
  restoreSession?: boolean;
  isPrimary?: boolean;
}) {
  const preloadPath = resolvePreloadPath();
  const externalPreloadPath = resolveExternalPreloadPath();
  const window = createMainWindow({ preloadPath });
  configureWebviewSecurity(window, externalPreloadPath);
  windows.add(window);

  const isPrimary = options?.isPrimary ?? false;
  const manager = new TabManager({
    debug: DEBUG_IPC,
    getMainWindow: () => window,
    onStateChanged: snapshot => {
      if (window.isDestroyed()) return;
      window.webContents.send(BrowserIpcChannels.stateChanged, snapshot);
      if (isPrimary) {
        tabSessionStore?.schedule(manager.exportSession());
      }
    },
    onDevToolsDockStateChanged: state => {
      if (window.isDestroyed()) return;
      window.webContents.send(BrowserIpcChannels.devToolsDockStateChanged, state);
    },
  });

  if (isPrimary && !studioManager) {
    studioManager = new StudioManager(window, manager, DEBUG_IPC, payload => {
      broadcast(BrowserIpcChannels.studioWebviewViewportChanged, payload);
    });
    registerStudioIpc({ studioManager, debug: DEBUG_IPC });
  }

  window.webContents.on('before-input-event', (event, input) => {
    const key = typeof input.key === 'string' ? input.key.toUpperCase() : '';
    const isDevToolsShortcut =
      key === 'F12' || ((input.control || input.meta) && input.shift && key === 'I');
    if (!isDevToolsShortcut) return;

    event.preventDefault();

    if (!manager.hasActiveExternalTab()) {
      return;
    }

    const dockOpen = manager.getDevToolsDockState().isOpen;
    if (dockOpen) {
      manager.closeDevTools({});
    } else {
      manager.openDevTools({});
    }
  });

  windowControllers.set(window.webContents.id, { window, tabManager: manager, isPrimary });
  if (isPrimary) {
    mainWindow = window;
    tabManager = manager;
  }

  attachWindowStateEvents(window);

  const windowId = window.webContents.id;
  const markFocused = () => {
    focusedWindows.add(windowId);
    updateBackgroundState();
  };
  const markBlurred = () => {
    focusedWindows.delete(windowId);
    updateBackgroundState();
  };

  window.on('focus', markFocused);
  window.on('blur', markBlurred);
  window.on('minimize', markBlurred);
  window.on('restore', markFocused);
  window.on('show', markFocused);
  window.on('hide', markBlurred);

  if (options?.restoreSession && tabSessionStore) {
    const restored = tabSessionStore.load();
    if (restored) {
      manager.restoreSession(restored);
    } else {
      manager.createTab(INITIAL_URL);
    }
  } else if (options?.tabs && options.tabs.length > 0) {
    buildTabsInManager(manager, options.tabs, options.activeIndex);
  } else {
    manager.createTab(INITIAL_URL);
  }

  window.webContents.on('did-finish-load', () => {
    if (!window.isDestroyed()) {
      window.webContents.send(BrowserIpcChannels.stateChanged, manager.getSnapshot());
      window.webContents.send(
        BrowserIpcChannels.devToolsDockStateChanged,
        manager.getDevToolsDockState()
      );
      window.webContents.send(BrowserIpcChannels.windowStateChanged, {
        isMaximized: window.isMaximized(),
      });
      if (downloadManager) {
        window.webContents.send(
          BrowserIpcChannels.downloadsStateChanged,
          downloadManager.getSnapshot()
        );
      }
      if (gitManager) {
        void gitManager.refresh().then(snapshot => {
          if (window.isDestroyed()) return;
          window.webContents.send(BrowserIpcChannels.gitStateChanged, snapshot);
        });
      }
      if (backendLabManager) {
        window.webContents.send(
          BrowserIpcChannels.backendLabStateChanged,
          backendLabManager.getState()
        );
      }
      if (systemMetricsManager) {
        window.webContents.send(
          BrowserIpcChannels.systemMetricsChanged,
          systemMetricsManager.getSnapshot()
        );
      }
      if (studioManager) {
        window.webContents.send(
          BrowserIpcChannels.studioWebviewViewportChanged,
          studioManager.getWebviewViewport()
        );
      }
    }
  });

  const syncDevToolsLayout = () => {
    manager.syncDevToolsLayout();
  };

  window.on('resize', syncDevToolsLayout);
  window.on('move', syncDevToolsLayout);
  window.on('maximize', syncDevToolsLayout);
  window.on('unmaximize', syncDevToolsLayout);
  window.on('restore', syncDevToolsLayout);
  window.on('minimize', syncDevToolsLayout);
  window.on('enter-full-screen', syncDevToolsLayout);
  window.on('leave-full-screen', syncDevToolsLayout);

  window.on('closed', () => {
    windows.delete(window);
    windowControllers.delete(window.webContents.id);
    focusedWindows.delete(windowId);
    updateBackgroundState();

    if (isPrimary) {
      mainWindow = null;
      tabManager = null;
      studioManager = null;
    }
  });

  return { window, tabManager: manager, isPrimary };
}

function openWindowWithTabs(payload: OpenWindowWithTabsRequest) {
  createWindowController({
    tabs: payload.tabs,
    activeIndex: payload.activeIndex,
  });
}


app.whenReady().then(() => {
  app.setAppUserModelId('com.notilus.reborn');
  configureUserAgent();
  ensureGlobalManagers();
  createWindowController({ restoreSession: true, isPrimary: true });

  app.on('activate', () => {
    if (windows.size === 0) {
      createWindowController({ restoreSession: true, isPrimary: true });
    }
  });
});

app.on('second-instance', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
    return;
  }
  const anyWindow = Array.from(windows).find(win => !win.isDestroyed());
  if (anyWindow) {
    if (anyWindow.isMinimized()) {
      anyWindow.restore();
    }
    anyWindow.focus();
  }
});

app.on('before-quit', () => {
  tabSessionStore?.flush();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

configureSessionDataPath();
