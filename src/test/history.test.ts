import { beforeEach, describe, expect, it } from 'vitest';
import {
  addHistoryItem,
  clearHistoryItems,
  getHistoryItems,
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
});
