const PANEL_WIDTH_KEY_PREFIX = 'notilus_panel_width:';
const MIN_PANEL_WIDTH = 260;
const MAX_PANEL_WIDTH = 720;

const PANEL_DEFAULT_WIDTHS: Record<string, number> = {
  'web-service': 420,
  settings: 360,
  history: 340,
  bookmarks: 340,
  downloads: 360,
  docs: 420,
  'api-docs': 420,
  github: 420,
  flou: 360,
};

export function getPanelDefaultWidth(panelId: string): number {
  return PANEL_DEFAULT_WIDTHS[panelId] ?? 320;
}

export function clampPanelWidth(width: number): number {
  if (!Number.isFinite(width)) return 320;
  return Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, Math.round(width)));
}

export function readPanelWidth(panelId: string): number {
  if (typeof window === 'undefined') return getPanelDefaultWidth(panelId);
  try {
    const raw = window.localStorage.getItem(`${PANEL_WIDTH_KEY_PREFIX}${panelId}`);
    if (!raw) return getPanelDefaultWidth(panelId);
    const parsed = Number.parseInt(raw, 10);
    return clampPanelWidth(parsed);
  } catch {
    return getPanelDefaultWidth(panelId);
  }
}

export function writePanelWidth(panelId: string, width: number): number {
  const clamped = clampPanelWidth(width);
  if (typeof window === 'undefined') return clamped;

  try {
    window.localStorage.setItem(`${PANEL_WIDTH_KEY_PREFIX}${panelId}`, String(clamped));
  } catch {
    // Ignore persistence failures.
  }

  return clamped;
}
