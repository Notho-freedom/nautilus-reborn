import { BrowserWindow, WebContentsView, screen, type View, type WebContents } from 'electron';
import type { DevToolsDockState } from '../../shared/browser-contract';

interface DevToolsDockManagerOptions {
  getMainWindow: () => BrowserWindow | null;
  onStateChanged?: (state: DevToolsDockState) => void;
  debug: boolean;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

const DEFAULT_MIN_WIDTH = 360;
const DEFAULT_MAX_WIDTH = 920;
const DEFAULT_WIDTH = 560;
const MIN_SHELL_WIDTH = 780;

export class DevToolsDockManager {
  private hostView: WebContentsView | null = null;
  private targetWebContentsId: number | null = null;
  private isOpen = false;
  private preferredWidth: number;
  private readonly minWidth: number;
  private readonly maxWidth: number;

  constructor(private readonly options: DevToolsDockManagerOptions) {
    this.minWidth = Math.max(260, options.minWidth ?? DEFAULT_MIN_WIDTH);
    this.maxWidth = Math.max(this.minWidth, options.maxWidth ?? DEFAULT_MAX_WIDTH);
    this.preferredWidth = this.clampWidth(options.defaultWidth ?? DEFAULT_WIDTH);
  }

  getState(): DevToolsDockState {
    return {
      isOpen: this.isOpen,
      width: this.preferredWidth,
      minWidth: this.minWidth,
      maxWidth: this.maxWidth,
    };
  }

  setWidth(rawWidth: number): DevToolsDockState {
    const width = this.clampWidth(rawWidth);
    if (this.preferredWidth === width) return this.getState();
    this.preferredWidth = width;
    if (this.isOpen) {
      const mounted = this.layout('set-width');
      if (!mounted) {
        this.close();
      }
    }
    this.emitStateChanged();
    return this.getState();
  }

  openFor(target: WebContents): boolean {
    const mainWindow = this.resolveMainWindow();
    if (!mainWindow) return false;

    const hostView = this.ensureHostView();
    if (!hostView) return false;

    this.isOpen = true;
    this.targetWebContentsId = target.id;

    this.tryExpandMainWindow(mainWindow);

    const mounted = this.layout('open');
    if (!mounted) {
      this.log('open-fallback', 'layout failed');
      this.close();
      return false;
    }

    try {
      target.setDevToolsWebContents(hostView.webContents);
    } catch (error) {
      this.log('attach-target-error', String(error));
      this.close();
      return false;
    }

    target.once('devtools-closed', () => {
      if (this.targetWebContentsId !== target.id) return;
      this.close();
    });

    this.emitStateChanged();
    return true;
  }

  close(): void {
    if (!this.isOpen && !this.hostView) return;

    const mainWindow = this.resolveMainWindow();
    const shellView = mainWindow ? this.resolveShellView(mainWindow) : null;

    if (mainWindow && shellView) {
      const [contentWidth, contentHeight] = mainWindow.getContentSize();
      shellView.setBounds({
        x: 0,
        y: 0,
        width: Math.max(0, contentWidth),
        height: Math.max(0, contentHeight),
      });
    }

    this.detachHostView();
    this.isOpen = false;
    this.targetWebContentsId = null;
    this.emitStateChanged();
  }

  syncLayout(): void {
    if (!this.isOpen) return;
    const mounted = this.layout('sync');
    if (!mounted) {
      this.close();
    }
  }

  private layout(reason: string): boolean {
    const mainWindow = this.resolveMainWindow();
    if (!mainWindow) return false;

    const hostView = this.ensureHostView();
    const shellView = this.resolveShellView(mainWindow);
    if (!hostView) {
      this.log('layout-fallback', `reason=${reason}`);
      return false;
    }

    const [contentWidth, contentHeight] = mainWindow.getContentSize();
    if (contentWidth <= 0 || contentHeight <= 0) return false;

    let dockWidth = this.preferredWidth;
    const maxByContent = shellView
      ? Math.max(0, contentWidth - MIN_SHELL_WIDTH)
      : Math.max(0, contentWidth);
    if (dockWidth > maxByContent) {
      dockWidth = maxByContent;
    }

    if (dockWidth <= 0) {
      if (shellView) {
        shellView.setBounds({
          x: 0,
          y: 0,
          width: contentWidth,
          height: contentHeight,
        });
      }
      this.detachHostView();
      this.log('layout-collapse', `reason=${reason}`);
      return false;
    }

    const shellWidth = Math.max(0, contentWidth - dockWidth);
    if (shellView) {
      shellView.setBounds({
        x: 0,
        y: 0,
        width: shellWidth,
        height: contentHeight,
      });
    } else {
      this.log('layout-overlay-only', `reason=${reason}`);
    }

    this.attachHostView(mainWindow, hostView);
    hostView.setBounds({
      x: shellView ? shellWidth : contentWidth - dockWidth,
      y: 0,
      width: dockWidth,
      height: contentHeight,
    });
    hostView.setVisible(true);
    return true;
  }

  private tryExpandMainWindow(mainWindow: BrowserWindow): void {
    const bounds = mainWindow.getBounds();
    const display = screen.getDisplayMatching(bounds);
    const workArea = display.workArea;

    const rightLimit = workArea.x + workArea.width;
    const currentRight = bounds.x + bounds.width;
    const availableGrow = Math.max(0, rightLimit - currentRight);
    if (availableGrow <= 0) return;

    const desiredGrow = this.preferredWidth;
    const growBy = Math.min(desiredGrow, availableGrow);
    if (growBy <= 0) return;

    mainWindow.setBounds({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width + growBy,
      height: bounds.height,
    });
  }

  private ensureHostView(): WebContentsView | null {
    if (this.hostView && !this.hostView.webContents.isDestroyed()) {
      return this.hostView;
    }

    try {
      this.hostView = new WebContentsView({
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
          webSecurity: true,
        },
      });
      this.hostView.setVisible(false);
      this.hostView.webContents.on('destroyed', () => {
        this.hostView = null;
        this.targetWebContentsId = null;
        this.isOpen = false;
        this.emitStateChanged();
      });
    } catch (error) {
      this.log('host-create-error', String(error));
      this.hostView = null;
    }

    return this.hostView;
  }

  private attachHostView(mainWindow: BrowserWindow, hostView: WebContentsView): void {
    const contentView = mainWindow.contentView;
    const attached = contentView.children.includes(hostView);
    if (!attached) {
      contentView.addChildView(hostView);
    }
  }

  private detachHostView(): void {
    const mainWindow = this.resolveMainWindow();
    const hostView = this.hostView;
    if (!mainWindow || !hostView) return;
    if (mainWindow.contentView.children.includes(hostView)) {
      mainWindow.contentView.removeChildView(hostView);
    }
    hostView.setVisible(false);
  }

  private resolveShellView(mainWindow: BrowserWindow): View | null {
    const hostView = this.hostView;
    const children = mainWindow.contentView.children;
    for (const child of children) {
      if (hostView && child === hostView) continue;
      const candidate = child as View & { webContents?: WebContents };
      if (candidate.webContents?.id === mainWindow.webContents.id) {
        return child;
      }
    }
    for (const child of children) {
      if (hostView && child === hostView) continue;
      return child;
    }
    return null;
  }

  private resolveMainWindow(): BrowserWindow | null {
    const window = this.options.getMainWindow();
    if (!window || window.isDestroyed()) return null;
    return window;
  }

  private clampWidth(width: number): number {
    if (!Number.isFinite(width)) return this.preferredWidth;
    return Math.min(this.maxWidth, Math.max(this.minWidth, Math.round(width)));
  }

  private emitStateChanged(): void {
    this.options.onStateChanged?.(this.getState());
  }

  private log(event: string, detail: string): void {
    if (!this.options.debug) return;
    console.info(`[devtools-dock] ${event} ${detail}`);
  }
}
