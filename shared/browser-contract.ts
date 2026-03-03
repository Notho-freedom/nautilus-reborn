export type TabKind = 'internal' | 'external';

export interface TabDescriptor {
  id: string;
  title: string;
  url: string;
  kind: TabKind;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

export interface BrowserSnapshot {
  tabs: TabDescriptor[];
  activeTabId: string | null;
}

export interface ViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowState {
  isMaximized: boolean;
}

export type DownloadStatus =
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface DownloadDescriptor {
  id: string;
  name: string;
  url: string;
  status: DownloadStatus;
  totalBytes: number | null;
  receivedBytes: number;
  speedBytesPerSecond: number | null;
  filePath: string | null;
  startedAt: string;
  endedAt: string | null;
  error: string | null;
}

export interface DownloadsSnapshot {
  downloads: DownloadDescriptor[];
}

export interface TabCreateRequest {
  url?: string;
}

export interface TabCloseRequest {
  tabId: string;
}

export interface TabActivateRequest {
  tabId: string;
}

export interface NavigateRequest {
  tabId?: string;
  url: string;
}

export interface TabActionRequest {
  tabId?: string;
}

export interface DownloadActionRequest {
  downloadId: string;
}

export interface GitFileChange {
  path: string;
  stagedStatus: string;
  unstagedStatus: string;
}

export interface GitCommitEntry {
  hash: string;
  subject: string;
}

export interface GitSnapshot {
  repositoryPath: string | null;
  branch: string;
  ahead: number;
  behind: number;
  staged: GitFileChange[];
  unstaged: GitFileChange[];
  recentCommits: GitCommitEntry[];
  updatedAt: string;
  error: string | null;
}

export interface GitCommitRequest {
  message: string;
}

export interface GitFileRequest {
  path: string;
}

export interface BrowserDesktopApi {
  getState: () => Promise<BrowserSnapshot>;
  createTab: (payload: TabCreateRequest) => Promise<BrowserSnapshot>;
  closeTab: (payload: TabCloseRequest) => Promise<BrowserSnapshot>;
  activateTab: (payload: TabActivateRequest) => Promise<BrowserSnapshot>;
  navigate: (payload: NavigateRequest) => Promise<BrowserSnapshot>;
  goBack: (payload: TabActionRequest) => Promise<BrowserSnapshot>;
  goForward: (payload: TabActionRequest) => Promise<BrowserSnapshot>;
  reload: (payload: TabActionRequest) => Promise<BrowserSnapshot>;
  openDevTools: (payload: TabActionRequest) => Promise<void>;
  setViewportBounds: (payload: ViewportBounds) => Promise<void>;
  onStateChanged: (listener: (snapshot: BrowserSnapshot) => void) => () => void;
  minimizeWindow: () => Promise<void>;
  toggleMaximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  getWindowState: () => Promise<WindowState>;
  onWindowStateChanged: (listener: (state: WindowState) => void) => () => void;
  getDownloads: () => Promise<DownloadsSnapshot>;
  pauseDownload: (payload: DownloadActionRequest) => Promise<DownloadsSnapshot>;
  resumeDownload: (payload: DownloadActionRequest) => Promise<DownloadsSnapshot>;
  cancelDownload: (payload: DownloadActionRequest) => Promise<DownloadsSnapshot>;
  removeDownload: (payload: DownloadActionRequest) => Promise<DownloadsSnapshot>;
  clearCompletedDownloads: () => Promise<DownloadsSnapshot>;
  openDownload: (payload: DownloadActionRequest) => Promise<void>;
  showDownloadInFolder: (payload: DownloadActionRequest) => Promise<void>;
  onDownloadsChanged: (listener: (snapshot: DownloadsSnapshot) => void) => () => void;
  getGitState: () => Promise<GitSnapshot>;
  refreshGitState: () => Promise<GitSnapshot>;
  commitGit: (payload: GitCommitRequest) => Promise<GitSnapshot>;
  stageGitFile: (payload: GitFileRequest) => Promise<GitSnapshot>;
  unstageGitFile: (payload: GitFileRequest) => Promise<GitSnapshot>;
  discardGitFile: (payload: GitFileRequest) => Promise<GitSnapshot>;
  onGitStateChanged: (listener: (snapshot: GitSnapshot) => void) => () => void;
}

export const BrowserIpcChannels = {
  getState: 'browser:get-state',
  tabCreate: 'browser:tab-create',
  tabClose: 'browser:tab-close',
  tabActivate: 'browser:tab-activate',
  navigate: 'browser:navigate',
  goBack: 'browser:go-back',
  goForward: 'browser:go-forward',
  reload: 'browser:reload',
  openDevTools: 'browser:open-devtools',
  setViewportBounds: 'browser:set-viewport-bounds',
  stateChanged: 'browser:state-changed',
  windowMinimize: 'window:minimize',
  windowToggleMaximize: 'window:toggle-maximize',
  windowClose: 'window:close',
  windowGetState: 'window:get-state',
  windowStateChanged: 'window:state-changed',
  downloadsGetState: 'downloads:get-state',
  downloadsPause: 'downloads:pause',
  downloadsResume: 'downloads:resume',
  downloadsCancel: 'downloads:cancel',
  downloadsRemove: 'downloads:remove',
  downloadsClearCompleted: 'downloads:clear-completed',
  downloadsOpen: 'downloads:open',
  downloadsShowInFolder: 'downloads:show-in-folder',
  downloadsStateChanged: 'downloads:state-changed',
  gitGetState: 'git:get-state',
  gitRefresh: 'git:refresh',
  gitCommit: 'git:commit',
  gitStageFile: 'git:stage-file',
  gitUnstageFile: 'git:unstage-file',
  gitDiscardFile: 'git:discard-file',
  gitStateChanged: 'git:state-changed',
} as const;
