import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { BrowserWindow, shell } from 'electron';

interface CreateMainWindowOptions {
  preloadPath: string;
}

function resolveWindowIconPath(): string | undefined {
  const iconPath = join(process.cwd(), 'public', 'notilus-logo.png');
  return existsSync(iconPath) ? iconPath : undefined;
}

export function createMainWindow({ preloadPath }: CreateMainWindowOptions): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: false,
    icon: resolveWindowIconPath(),
    backgroundColor: '#09090B',
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true,
      webviewTag: true,
      devTools: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return mainWindow;
}
