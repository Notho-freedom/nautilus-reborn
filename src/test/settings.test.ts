import { beforeEach, describe, expect, it } from 'vitest';
import { addHistoryItem, clearHistoryItems, getHistoryItems } from '@/lib/history';
import { getSettings, initializeSettings, resetSettings, updateSettings } from '@/lib/settings';

describe('settings integration', () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearHistoryItems();
    resetSettings();
    initializeSettings();
  });

  it('persists saveHistory and blocks history writes when disabled', () => {
    updateSettings({ saveHistory: false });
    addHistoryItem('https://example.com', 'Example');
    expect(getHistoryItems()).toHaveLength(0);

    updateSettings({ saveHistory: true });
    addHistoryItem('https://example.com', 'Example');
    expect(getHistoryItems()).toHaveLength(1);
  });

  it('applies accent theme variables to the document root', () => {
    updateSettings({ accentTheme: 'blue' });
    expect(getSettings().accentTheme).toBe('blue');
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('211 100% 50%');
  });
});
