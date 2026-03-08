import { beforeEach, describe, expect, it } from 'vitest';
import {
  addHistoryItem,
  clearHistoryItems,
  getHistoryItems,
  mergeImportedHistory,
  removeHistoryItem,
} from '@/lib/history';

describe('history storage', () => {
  beforeEach(() => {
    clearHistoryItems();
  });

  it('stores entries with latest first', () => {
    addHistoryItem('https://example.com', 'Example');
    addHistoryItem('https://github.com', 'GitHub');

    const items = getHistoryItems();
    expect(items).toHaveLength(2);
    expect(items[0]?.url).toContain('github.com');
    expect(items[1]?.url).toContain('example.com');
  });

  it('deduplicates entries by URL', () => {
    addHistoryItem('https://example.com', 'Example');
    addHistoryItem('https://example.com', 'Example updated');

    const items = getHistoryItems();
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe('Example updated');
  });

  it('ignores internal notilus pages', () => {
    addHistoryItem('notilus://speed-dial', 'Speed Dial');
    expect(getHistoryItems()).toHaveLength(0);
  });

  it('removes a history entry', () => {
    addHistoryItem('https://react.dev', 'React');
    const item = getHistoryItems()[0];

    expect(item).toBeDefined();
    if (!item) return;

    removeHistoryItem(item.id);
    expect(getHistoryItems()).toHaveLength(0);
  });

  it('merges imported entries and keeps newest visit per URL', () => {
    addHistoryItem('https://example.com', 'Local Example');
    const initial = getHistoryItems()[0];
    expect(initial).toBeDefined();

    const merged = mergeImportedHistory([
      {
        url: 'https://example.com',
        title: 'Imported Example',
        visitedAt: '2099-01-01T10:00:00.000Z',
        sourceBrowser: 'chrome',
        sourceProfileId: 'chrome:default',
      },
      {
        url: 'https://react.dev',
        title: 'React',
        visitedAt: '2026-01-02T10:00:00.000Z',
        sourceBrowser: 'firefox',
        sourceProfileId: 'firefox:default',
      },
    ]);

    expect(merged.inserted).toBe(1);
    expect(merged.updated).toBe(1);

    const items = getHistoryItems();
    expect(items).toHaveLength(2);
    const react = items.find(item => item.url === 'https://react.dev/');
    const example = items.find(item => item.url === 'https://example.com/');
    expect(react?.title).toBe('React');
    expect(example?.title).toBe('Imported Example');
  });
});
