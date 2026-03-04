import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { BrowserWindow, shell } from 'electron';

interface CreateChromeWindowOptions {
  preloadPath: string;
}

interface CreateContentWindowOptions {
  parentWindow: BrowserWindow;
}

function resolveWindowIconPath(): string | undefined {
  const iconPath = join(process.cwd(), 'public', 'notilus-logo.png');
  return existsSync(iconPath) ? iconPath : undefined;
}

function loadRenderer(window: BrowserWindow): void {
  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

export function createChromeWindow({ preloadPath }: CreateChromeWindowOptions): BrowserWindow {
  const chromeWindow = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: 'hidden',
    icon: resolveWindowIconPath(),
    backgroundColor: '#09090B',
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true,
    },
  });

  chromeWindow.on('ready-to-show', () => {
    chromeWindow.show();
  });

  chromeWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  loadRenderer(chromeWindow);
  return chromeWindow;
}

export function createContentWindow({
  parentWindow,
}: CreateContentWindowOptions): BrowserWindow {
  const contentWindow = new BrowserWindow({
    width: 1200,
    height: 700,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    skipTaskbar: true,
    autoHideMenuBar: true,
    hasShadow: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    focusable: true,
    parent: parentWindow,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });

  contentWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  void contentWindow.loadURL('about:blank');
  return contentWindow;
}
