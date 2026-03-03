import type {
  BrowserDesktopApi,
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
