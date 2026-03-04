export type TabDisplayMode = 'full' | 'compact' | 'icon-close' | 'icon-only';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeTabWidth(
  availableWidth: number,
  tabCount: number,
  options: {
    addButtonWidth?: number;
    gap?: number;
    minWidth?: number;
    maxWidth?: number;
  } = {}
): number {
  const addButtonWidth = options.addButtonWidth ?? 36;
  const gap = options.gap ?? 4;
  const minWidth = options.minWidth ?? 40;
  const maxWidth = options.maxWidth ?? 220;

  if (tabCount <= 0) return maxWidth;
  const totalGap = Math.max(0, tabCount - 1) * gap;
  const raw = Math.floor((Math.max(0, availableWidth) - addButtonWidth - totalGap) / tabCount);
  return clamp(raw, minWidth, maxWidth);
}

export function getTabDisplayMode(tabWidth: number): TabDisplayMode {
  if (tabWidth >= 92) return 'full';
  if (tabWidth >= 76) return 'compact';
  if (tabWidth >= 56) return 'icon-close';
  return 'icon-only';
}

export function getTabIconSize(tabCount: number): number {
  if (tabCount <= 8) return 14;
  if (tabCount <= 14) return 12;
  return 10;
}
