import { beforeEach, describe, expect, it } from 'vitest';
import {
  addBookmark,
  clearBookmarks,
  getBookmarks,
  isBookmarked,
  mergeImportedBookmarks,
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

  it('merges imported bookmarks by URL and unions tags', () => {
    addBookmark({
      title: 'GitHub',
      url: 'https://github.com',
      folder: 'Dev',
      tags: ['code'],
    });

    const result = mergeImportedBookmarks([
      {
        url: 'https://github.com',
        title: 'GitHub Updated',
        folder: 'Imported',
        tags: ['work'],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-03T00:00:00.000Z',
        sourceBrowser: 'chrome',
        sourceProfileId: 'chrome:default',
      },
      {
        url: 'https://react.dev',
        title: 'React',
        folder: 'Docs',
        tags: ['framework'],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        sourceBrowser: 'firefox',
        sourceProfileId: 'firefox:default',
      },
    ]);

    expect(result.inserted).toBe(1);
    expect(result.updated).toBe(1);

    const bookmarks = getBookmarks();
    const github = bookmarks.find(item => item.url === 'https://github.com/');
    const react = bookmarks.find(item => item.url === 'https://react.dev/');

    expect(github).toBeDefined();
    expect(github?.tags).toEqual(expect.arrayContaining(['code', 'work']));
    expect(react?.folder).toBe('Docs');
  });
});
