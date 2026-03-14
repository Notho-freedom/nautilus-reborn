export type AccentThemeId = 'red' | 'blue' | 'green' | 'purple' | 'orange' | 'pink';
export type HomePageStyleId =
  | 'modern'
  | 'notilus_dev'
  | 'frontend'
  | 'backend'
  | 'devops'
  | 'data_science'
  | 'minimal'
  | 'customizable';
export type SearchEngineId = 'duckduckgo' | 'google' | 'brave';
export type TerminalTypeId = 'native' | 'xterm';
export type DevToolsPositionId = 'bottom' | 'right' | 'detached';
export type AiModelId = 'llama-3.3-70b' | 'mixtral-8x7b' | 'gemma-2-9b';
export type RenderingProfileId = 'flow' | 'balance' | 'isolate';

export const WEB_SERVICE_IDS = [
  'youtubeMusic',
  'youtube',
  'chatgpt',
  'deepseek',
  'whatsapp',
  'telegram',
] as const;

export type WebServiceId = (typeof WEB_SERVICE_IDS)[number];

export interface BrowserSettings {
  darkMode: boolean;
  accentTheme: AccentThemeId;
  adBlock: boolean;
  trackerProtection: boolean;
  saveHistory: boolean;
  acceptCookies: boolean;
  restoreTabs: boolean;
  renderingProfile: RenderingProfileId;
  nativeSwapDelayMinutes: number;
  homePageStyle: HomePageStyleId;
  terminalType: TerminalTypeId;
  terminalFontSize: 12 | 13 | 14 | 16;
  devToolsPosition: DevToolsPositionId;
  aiModel: AiModelId;
  searchEngine: SearchEngineId;
  notificationsEnabled: boolean;
  enabledWebServices: WebServiceId[];
  wallpaperInterval: number;
  panelCloseOnOutsideClick: boolean;
}

const SETTINGS_KEY = 'notilus_settings';
const SETTINGS_UPDATED_EVENT = 'notilus:settings-updated';

const DEFAULT_SETTINGS: BrowserSettings = {
  darkMode: true,
  accentTheme: 'red',
  adBlock: true,
  trackerProtection: true,
  saveHistory: true,
  acceptCookies: true,
  restoreTabs: true,
  renderingProfile: 'balance',
  nativeSwapDelayMinutes: 5,
  homePageStyle: 'modern',
  terminalType: 'xterm',
  terminalFontSize: 13,
  devToolsPosition: 'bottom',
  aiModel: 'llama-3.3-70b',
  searchEngine: 'duckduckgo',
  notificationsEnabled: true,
  enabledWebServices: [...WEB_SERVICE_IDS],
  wallpaperInterval: 30,
  panelCloseOnOutsideClick: false,
};

const THEME_PRIMARY: Record<AccentThemeId, string> = {
  red: '345 100% 59%',
  blue: '211 100% 50%',
  green: '142 71% 49%',
  purple: '250 66% 60%',
  orange: '32 100% 50%',
  pink: '330 100% 60%',
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeSettings(candidate: Partial<BrowserSettings>): BrowserSettings {
  const settings: BrowserSettings = {
    ...DEFAULT_SETTINGS,
    ...candidate,
  };

  if (!Object.keys(THEME_PRIMARY).includes(settings.accentTheme)) {
    settings.accentTheme = DEFAULT_SETTINGS.accentTheme;
  }

  if (!['duckduckgo', 'google', 'brave'].includes(settings.searchEngine)) {
    settings.searchEngine = DEFAULT_SETTINGS.searchEngine;
  }

  if (!['native', 'xterm'].includes(settings.terminalType)) {
    settings.terminalType = DEFAULT_SETTINGS.terminalType;
  }

  if (!['flow', 'balance', 'isolate'].includes(settings.renderingProfile)) {
    settings.renderingProfile = DEFAULT_SETTINGS.renderingProfile;
  }

  if (
    typeof settings.nativeSwapDelayMinutes !== 'number' ||
    settings.nativeSwapDelayMinutes < 1
  ) {
    settings.nativeSwapDelayMinutes = DEFAULT_SETTINGS.nativeSwapDelayMinutes;
  }

  if (!['bottom', 'right', 'detached'].includes(settings.devToolsPosition)) {
    settings.devToolsPosition = DEFAULT_SETTINGS.devToolsPosition;
  }

  if (!['llama-3.3-70b', 'mixtral-8x7b', 'gemma-2-9b'].includes(settings.aiModel)) {
    settings.aiModel = DEFAULT_SETTINGS.aiModel;
  }

  const allowedSizes = [12, 13, 14, 16] as const;
  if (!allowedSizes.includes(settings.terminalFontSize)) {
    settings.terminalFontSize = DEFAULT_SETTINGS.terminalFontSize;
  }

  settings.enabledWebServices = Array.from(
    new Set(
      (Array.isArray(settings.enabledWebServices)
        ? settings.enabledWebServices
        : DEFAULT_SETTINGS.enabledWebServices
      ).filter((id): id is WebServiceId => WEB_SERVICE_IDS.includes(id as WebServiceId))
    )
  );
  if (settings.enabledWebServices.length === 0) {
    settings.enabledWebServices = [...DEFAULT_SETTINGS.enabledWebServices];
  }

  if (typeof settings.wallpaperInterval !== 'number' || settings.wallpaperInterval < 5) {
    settings.wallpaperInterval = DEFAULT_SETTINGS.wallpaperInterval;
  }

  if (typeof settings.panelCloseOnOutsideClick !== 'boolean') {
    settings.panelCloseOnOutsideClick = DEFAULT_SETTINGS.panelCloseOnOutsideClick;
  }

  return settings;
}

function dispatchSettingsUpdated() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(SETTINGS_UPDATED_EVENT));
}

function readSettings(): BrowserSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  const raw = window.localStorage.getItem(SETTINGS_KEY);
  if (!raw) return DEFAULT_SETTINGS;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isPlainObject(parsed)) return DEFAULT_SETTINGS;
    return sanitizeSettings(parsed as Partial<BrowserSettings>);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeSettings(next: BrowserSettings): BrowserSettings {
  if (typeof window === 'undefined') return next;
  const sanitized = sanitizeSettings(next);
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(sanitized));
  applySettingsToDocument(sanitized);
  dispatchSettingsUpdated();
  return sanitized;
}

function setCssVar(name: string, value: string) {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty(name, value);
}

export function applySettingsToDocument(settings: BrowserSettings) {
  if (typeof document === 'undefined') return;
  const color = THEME_PRIMARY[settings.accentTheme];
  setCssVar('--primary', color);
  setCssVar('--accent', color);
  setCssVar('--ring', color);
  setCssVar('--sidebar-primary', color);
}

export function initializeSettings(): BrowserSettings {
  const settings = readSettings();
  applySettingsToDocument(settings);
  return settings;
}

export function getSettings(): BrowserSettings {
  return readSettings();
}

export function updateSettings(
  partial: Partial<BrowserSettings> | ((current: BrowserSettings) => Partial<BrowserSettings>)
): BrowserSettings {
  const current = readSettings();
  const patch = typeof partial === 'function' ? partial(current) : partial;
  return writeSettings({ ...current, ...patch });
}

export function resetSettings(): BrowserSettings {
  return writeSettings(DEFAULT_SETTINGS);
}

export function isHistoryEnabled(): boolean {
  return readSettings().saveHistory;
}

export function toggleWebService(serviceId: WebServiceId, enabled: boolean): BrowserSettings {
  return updateSettings(current => {
    const next = new Set(current.enabledWebServices);
    if (enabled) {
      next.add(serviceId);
    } else {
      next.delete(serviceId);
    }
    return {
      enabledWebServices: Array.from(next).filter((id): id is WebServiceId =>
        WEB_SERVICE_IDS.includes(id as WebServiceId)
      ),
    };
  });
}

export function subscribeToSettingsUpdates(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(SETTINGS_UPDATED_EVENT, listener);
  return () => {
    window.removeEventListener(SETTINGS_UPDATED_EVENT, listener);
  };
}

export const DEFAULT_BROWSER_SETTINGS = DEFAULT_SETTINGS;
