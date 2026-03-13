import type {
  BackendLabSidecarState,
  BackendLabJobRequest,
  BackendLabJobResponse,
  BackendLabJobStatus,
  BackendLabJobStatusRequest,
  BrowserDesktopApi,
  DevToolsDockState,
  DevToolsDockWidthRequest,
  DevToolsCloseRequest,
  DownloadActionRequest,
  DownloadsSnapshot,
  SetPinnedTabsRequest,
  TabRenderModeRequest,
  TabRuntimeUpdateRequest,
  ViewportBounds,
  TabWebContentsBindRequest,
  TabWebContentsUnbindRequest,
  GitCommitRequest,
  GitFileRequest,
  GitSnapshot,
  StudioCaptureResult,
  StudioRecordingSnapshot,
  StudioScriptResult,
  StudioWebviewViewportRequest,
  StudioViewportRequest,
  ImportPreviewRequest,
  ImportPreviewResult,
  ImportProfilesResult,
  ImportRunRequest,
  ImportRunResult,
} from '../../shared/browser-contract';
import type {
  TerminalCloseRequest,
  TerminalDataEvent,
  TerminalExitEvent,
  TerminalInputRequest,
  TerminalResizeRequest,
  TerminalSessionOpenRequest,
  TerminalSessionOpenResponse,
} from '../../shared/terminal-contract';
import type {
  BrowserSnapshot,
  NavigateRequest,
  TabActionRequest,
  TabActivateRequest,
  TabCloseRequest,
  TabCreateRequest,
  TabMoveRequest,
  WindowState,
} from '../../shared/browser-contract';
import type { SystemMetricsSnapshot } from '../../shared/system-contract';

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

export async function desktopMoveTab(
  payload: TabMoveRequest
): Promise<BrowserSnapshot | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.moveTab(payload);
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

export async function desktopCloseDevTools(
  payload: DevToolsCloseRequest = {}
): Promise<void> {
  const bridge = getDesktopBridge();
  if (!bridge) return;
  await bridge.closeDevTools(payload);
}

export async function desktopSetDevToolsDockWidth(
  payload: DevToolsDockWidthRequest
): Promise<DevToolsDockState | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.setDevToolsDockWidth(payload);
}

export async function desktopGetDevToolsDockState(): Promise<DevToolsDockState | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.getDevToolsDockState();
}

export function onDesktopDevToolsDockStateChanged(
  listener: (state: DevToolsDockState) => void
): () => void {
  const bridge = getDesktopBridge();
  if (!bridge) return () => {};
  return bridge.onDevToolsDockStateChanged(listener);
}

export async function desktopSetPinnedTabs(
  payload: SetPinnedTabsRequest
): Promise<void> {
  const bridge = getDesktopBridge();
  if (!bridge) return;
  await bridge.setPinnedTabs(payload);
}

export async function desktopSetTabRenderMode(
  payload: TabRenderModeRequest
): Promise<BrowserSnapshot | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.setTabRenderMode(payload);
}

export async function desktopBindTabWebContents(
  payload: TabWebContentsBindRequest
): Promise<void> {
  const bridge = getDesktopBridge();
  if (!bridge) return;
  await bridge.bindTabWebContents(payload);
}

export async function desktopUnbindTabWebContents(
  payload: TabWebContentsUnbindRequest
): Promise<void> {
  const bridge = getDesktopBridge();
  if (!bridge) return;
  await bridge.unbindTabWebContents(payload);
}

export async function desktopUpdateTabRuntime(
  payload: TabRuntimeUpdateRequest
): Promise<BrowserSnapshot | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.updateTabRuntime(payload);
}

export async function desktopSetViewportBounds(payload: ViewportBounds): Promise<void> {
  const bridge = getDesktopBridge();
  if (!bridge) return;
  await bridge.setViewportBounds(payload);
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

export async function desktopGetGitState(): Promise<GitSnapshot | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.getGitState();
}

export async function desktopRefreshGitState(): Promise<GitSnapshot | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.refreshGitState();
}

export async function desktopCommitGit(
  payload: GitCommitRequest
): Promise<GitSnapshot | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.commitGit(payload);
}

export async function desktopStageGitFile(
  payload: GitFileRequest
): Promise<GitSnapshot | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.stageGitFile(payload);
}

export async function desktopUnstageGitFile(
  payload: GitFileRequest
): Promise<GitSnapshot | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.unstageGitFile(payload);
}

export async function desktopDiscardGitFile(
  payload: GitFileRequest
): Promise<GitSnapshot | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.discardGitFile(payload);
}

export function onDesktopGitStateChanged(
  listener: (snapshot: GitSnapshot) => void
): () => void {
  const bridge = getDesktopBridge();
  if (!bridge) return () => {};
  return bridge.onGitStateChanged(listener);
}

export async function desktopListImportProfiles(): Promise<ImportProfilesResult | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.listImportProfiles();
}

export async function desktopPreviewImport(
  payload: ImportPreviewRequest
): Promise<ImportPreviewResult | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.previewImport(payload);
}

export async function desktopRunImport(
  payload: ImportRunRequest
): Promise<ImportRunResult | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.runImport(payload);
}

export async function desktopGetBackendLabState(): Promise<BackendLabSidecarState | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.getBackendLabState();
}

export async function desktopStartBackendLab(): Promise<BackendLabSidecarState | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.startBackendLab();
}

export async function desktopStopBackendLab(): Promise<BackendLabSidecarState | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.stopBackendLab();
}

export async function desktopRestartBackendLab(): Promise<BackendLabSidecarState | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.restartBackendLab();
}

export async function desktopEnqueueBackendLabJob(
  payload: BackendLabJobRequest
): Promise<BackendLabJobResponse | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.enqueueBackendLabJob(payload);
}

export async function desktopGetBackendLabJob(
  payload: BackendLabJobStatusRequest
): Promise<BackendLabJobStatus | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.getBackendLabJob(payload);
}

export function onDesktopBackendLabStateChanged(
  listener: (snapshot: BackendLabSidecarState) => void
): () => void {
  const bridge = getDesktopBridge();
  if (!bridge) return () => {};
  return bridge.onBackendLabStateChanged(listener);
}

export async function desktopGetSystemMetrics(): Promise<SystemMetricsSnapshot | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.getSystemMetrics();
}

export async function desktopSubscribeSystemMetrics(): Promise<void> {
  const bridge = getDesktopBridge();
  if (!bridge) return;
  await bridge.subscribeSystemMetrics();
}

export async function desktopUnsubscribeSystemMetrics(): Promise<void> {
  const bridge = getDesktopBridge();
  if (!bridge) return;
  await bridge.unsubscribeSystemMetrics();
}

export function onDesktopSystemMetricsChanged(
  listener: (snapshot: SystemMetricsSnapshot) => void
): () => void {
  const bridge = getDesktopBridge();
  if (!bridge) return () => {};
  return bridge.onSystemMetricsChanged(listener);
}

export async function desktopStudioResizeWindow(payload: StudioViewportRequest): Promise<void> {
  const bridge = getDesktopBridge();
  if (!bridge) return;
  await bridge.studioResizeWindow(payload);
}

export async function desktopStudioSetWebviewViewport(
  payload: StudioWebviewViewportRequest | null
): Promise<void> {
  const bridge = getDesktopBridge();
  if (!bridge) return;
  await bridge.studioSetWebviewViewport(payload);
}

export async function desktopStudioGetWebviewViewport(): Promise<StudioWebviewViewportRequest | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.studioGetWebviewViewport();
}

export function onDesktopStudioWebviewViewportChanged(
  listener: (payload: StudioWebviewViewportRequest | null) => void
): () => void {
  const bridge = getDesktopBridge();
  if (!bridge) return () => {};
  return bridge.onStudioWebviewViewportChanged(listener);
}

export async function desktopStudioCaptureViewport(): Promise<StudioCaptureResult | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.studioCaptureViewport();
}

export async function desktopStudioCaptureFullPage(): Promise<StudioCaptureResult | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.studioCaptureFullPage();
}

export async function desktopStudioApplyCss(css: string): Promise<void> {
  const bridge = getDesktopBridge();
  if (!bridge) return;
  await bridge.studioApplyCss({ css });
}

export async function desktopStudioClearCss(): Promise<void> {
  const bridge = getDesktopBridge();
  if (!bridge) return;
  await bridge.studioClearCss();
}

export async function desktopStudioRunScript(script: string): Promise<StudioScriptResult | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.studioRunScript({ script });
}

export async function desktopStudioStartRecording(): Promise<StudioRecordingSnapshot | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.studioStartRecording();
}

export async function desktopStudioStopRecording(): Promise<StudioRecordingSnapshot | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.studioStopRecording();
}

export async function desktopStudioGetRecording(): Promise<StudioRecordingSnapshot | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.studioGetRecording();
}

export async function desktopOpenTerminalSession(
  payload: TerminalSessionOpenRequest
): Promise<TerminalSessionOpenResponse | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.openTerminalSession(payload);
}

export async function desktopSendTerminalInput(payload: TerminalInputRequest): Promise<void> {
  const bridge = getDesktopBridge();
  if (!bridge) return;
  await bridge.sendTerminalInput(payload);
}

export async function desktopResizeTerminalSession(payload: TerminalResizeRequest): Promise<void> {
  const bridge = getDesktopBridge();
  if (!bridge) return;
  await bridge.resizeTerminalSession(payload);
}

export async function desktopCloseTerminalSession(payload: TerminalCloseRequest): Promise<void> {
  const bridge = getDesktopBridge();
  if (!bridge) return;
  await bridge.closeTerminalSession(payload);
}

export function onDesktopTerminalData(listener: (event: TerminalDataEvent) => void): () => void {
  const bridge = getDesktopBridge();
  if (!bridge) return () => {};
  return bridge.onTerminalData(listener);
}

export function onDesktopTerminalExit(listener: (event: TerminalExitEvent) => void): () => void {
  const bridge = getDesktopBridge();
  if (!bridge) return () => {};
  return bridge.onTerminalExit(listener);
}
