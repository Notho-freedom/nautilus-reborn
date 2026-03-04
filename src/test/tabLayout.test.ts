import { describe, expect, it } from 'vitest';
import { computeTabWidth, getTabDisplayMode, getTabIconSize } from '@/lib/tabLayout';

describe('tab layout helper', () => {
  it('clamps tab width between min and max values', () => {
    expect(computeTabWidth(1800, 1)).toBe(220);
    expect(computeTabWidth(120, 20)).toBe(40);
  });

  it('computes proportional tab width from available area and tab count', () => {
    const width = computeTabWidth(900, 6, { addButtonWidth: 34, gap: 4, minWidth: 40, maxWidth: 220 });
    expect(width).toBe(141);
  });

  it('resolves display modes from tab width thresholds', () => {
    expect(getTabDisplayMode(100)).toBe('full');
    expect(getTabDisplayMode(88)).toBe('compact');
    expect(getTabDisplayMode(60)).toBe('icon-close');
    expect(getTabDisplayMode(45)).toBe('icon-only');
  });

  it('shrinks favicon size as tab count grows', () => {
    expect(getTabIconSize(4)).toBe(14);
    expect(getTabIconSize(12)).toBe(12);
    expect(getTabIconSize(20)).toBe(10);
  });
});
