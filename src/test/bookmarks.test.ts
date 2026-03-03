import { beforeEach, describe, expect, it } from 'vitest';
import {
  addBookmark,
  clearBookmarks,
  getBookmarks,
  isBookmarked,
  searchBookmarks,
  toggleBookmark,
} from '@/lib/bookmarks';

describe('bookmarks storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearBookmarks();
  });

  it('stores bookmarks and deduplicates by URL', () => {
    addBookmark({ title: 'GitHub', url: 'github.com', folder: 'Dev' });
    addBookmark({ title: 'GitHub Updated', url: 'https://github.com', folder: 'Work' });

    const bookmarks = getBookmarks();
    expect(bookmarks).toHaveLength(1);
    expect(bookmarks[0]?.title).toBe('GitHub Updated');
    expect(bookmarks[0]?.folder).toBe('Work');
  });

  it('toggles bookmark state for external urls', () => {
    const added = toggleBookmark('https://react.dev', 'React');
    expect(added).toBe(true);
    expect(isBookmarked('https://react.dev')).toBe(true);

    const removed = toggleBookmark('https://react.dev', 'React');
    expect(removed).toBe(false);
    expect(isBookmarked('https://react.dev')).toBe(false);
  });

  it('searches by title, folder and tags', () => {
    addBookmark({ title: 'TypeScript', url: 'https://typescriptlang.org', folder: 'Docs', tags: ['lang'] });
    const byFolder = searchBookmarks('docs');
    const byTag = searchBookmarks('lang');
    expect(byFolder).toHaveLength(1);
    expect(byTag).toHaveLength(1);
  });
});
