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
} as const;
