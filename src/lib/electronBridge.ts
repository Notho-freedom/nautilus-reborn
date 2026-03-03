import type {
  BrowserDesktopApi,
  DownloadActionRequest,
  DownloadsSnapshot,
  BrowserSnapshot,
  NavigateRequest,
  TabActionRequest,
  TabActivateRequest,
  TabCloseRequest,
  TabCreateRequest,
  ViewportBounds,
  WindowState,
} from '../../shared/browser-contract';

export function getDesktopBridge(): BrowserDesktopApi | null {
  if (typeof window === 'undefined') return null;
  return window.notilusDesktop ?? null;
}

export function isDesktopRuntime(): boolean {
  return Boolean(getDesktopBridge());
}

export async function desktopGetState(): Promise<BrowserSnapshot | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.getState();
}

export async function desktopCreateTab(
  payload: TabCreateRequest
): Promise<BrowserSnapshot | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.createTab(payload);
}

export async function desktopCloseTab(
  payload: TabCloseRequest
): Promise<BrowserSnapshot | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.closeTab(payload);
}

export async function desktopActivateTab(
  payload: TabActivateRequest
): Promise<BrowserSnapshot | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.activateTab(payload);
}

export async function desktopNavigate(
  payload: NavigateRequest
): Promise<BrowserSnapshot | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.navigate(payload);
}

export async function desktopGoBack(
  payload: TabActionRequest = {}
): Promise<BrowserSnapshot | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.goBack(payload);
}

export async function desktopGoForward(
  payload: TabActionRequest = {}
): Promise<BrowserSnapshot | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.goForward(payload);
}

export async function desktopReload(
  payload: TabActionRequest = {}
): Promise<BrowserSnapshot | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.reload(payload);
}

export async function desktopOpenDevTools(
  payload: TabActionRequest = {}
): Promise<void> {
  const bridge = getDesktopBridge();
  if (!bridge) return;
  await bridge.openDevTools(payload);
}

export async function desktopSetViewportBounds(bounds: ViewportBounds): Promise<void> {
  const bridge = getDesktopBridge();
  if (!bridge) return;
  await bridge.setViewportBounds(bounds);
}

export function onDesktopStateChanged(
  listener: (snapshot: BrowserSnapshot) => void
): () => void {
  const bridge = getDesktopBridge();
  if (!bridge) return () => {};
  return bridge.onStateChanged(listener);
}

export async function desktopMinimizeWindow(): Promise<void> {
  const bridge = getDesktopBridge();
  if (!bridge) return;
  await bridge.minimizeWindow();
}

export async function desktopToggleMaximizeWindow(): Promise<void> {
  const bridge = getDesktopBridge();
  if (!bridge) return;
  await bridge.toggleMaximizeWindow();
}

export async function desktopCloseWindow(): Promise<void> {
  const bridge = getDesktopBridge();
  if (!bridge) return;
  await bridge.closeWindow();
}

export async function desktopGetWindowState(): Promise<WindowState | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.getWindowState();
}

export function onDesktopWindowStateChanged(
  listener: (state: WindowState) => void
): () => void {
  const bridge = getDesktopBridge();
  if (!bridge) return () => {};
  return bridge.onWindowStateChanged(listener);
}

export async function desktopGetDownloads(): Promise<DownloadsSnapshot | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.getDownloads();
}

export async function desktopPauseDownload(
  payload: DownloadActionRequest
): Promise<DownloadsSnapshot | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.pauseDownload(payload);
}

export async function desktopResumeDownload(
  payload: DownloadActionRequest
): Promise<DownloadsSnapshot | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.resumeDownload(payload);
}

export async function desktopCancelDownload(
  payload: DownloadActionRequest
): Promise<DownloadsSnapshot | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.cancelDownload(payload);
}

export async function desktopRemoveDownload(
  payload: DownloadActionRequest
): Promise<DownloadsSnapshot | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.removeDownload(payload);
}

export async function desktopClearCompletedDownloads(): Promise<DownloadsSnapshot | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.clearCompletedDownloads();
}

export async function desktopOpenDownload(payload: DownloadActionRequest): Promise<void> {
  const bridge = getDesktopBridge();
  if (!bridge) return;
  await bridge.openDownload(payload);
}

export async function desktopShowDownloadInFolder(
  payload: DownloadActionRequest
): Promise<void> {
  const bridge = getDesktopBridge();
  if (!bridge) return;
  await bridge.showDownloadInFolder(payload);
}

export function onDesktopDownloadsChanged(
  listener: (snapshot: DownloadsSnapshot) => void
): () => void {
  const bridge = getDesktopBridge();
  if (!bridge) return () => {};
  return bridge.onDownloadsChanged(listener);
}
