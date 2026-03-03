export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  tags: string[];
  folder: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookmarkInput {
  title: string;
  url: string;
  tags?: string[];
  folder?: string;
  description?: string;
}

const BOOKMARKS_KEY = 'notilus_bookmarks';
const BOOKMARKS_UPDATED_EVENT = 'notilus:bookmarks-updated';

function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('notilus://')) return trimmed;
  const hasProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed);
  const candidate = hasProtocol ? trimmed : `https://${trimmed}`;
  try {
    return new URL(candidate).toString();
  } catch {
    return candidate;
  }
}

function resolveTitle(url: string, fallback: string): string {
  if (fallback.trim()) return fallback.trim();
  if (url.startsWith('notilus://')) {
    return url.replace('notilus://', '').replace(/-/g, ' ') || 'Internal page';
  }
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function dispatchBookmarksUpdated() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(BOOKMARKS_UPDATED_EVENT));
}

function isBookmarkItem(value: unknown): value is BookmarkItem {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<BookmarkItem>;
  return Boolean(
    typeof candidate.id === 'string' &&
      typeof candidate.title === 'string' &&
      typeof candidate.url === 'string' &&
      Array.isArray(candidate.tags) &&
      typeof candidate.folder === 'string' &&
      typeof candidate.createdAt === 'string' &&
      typeof candidate.updatedAt === 'string'
  );
}

function parseBookmarks(value: string | null): BookmarkItem[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isBookmarkItem)
      .map(item => ({
        ...item,
        url: normalizeUrl(item.url),
        tags: item.tags.map(tag => String(tag).trim()).filter(Boolean),
        folder: item.folder.trim() || 'General',
      }))
      .filter(item => Boolean(item.url))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch {
    return [];
  }
}

function readBookmarks(): BookmarkItem[] {
  if (typeof window === 'undefined') return [];
  return parseBookmarks(window.localStorage.getItem(BOOKMARKS_KEY));
}

function writeBookmarks(items: BookmarkItem[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(items));
  dispatchBookmarksUpdated();
}

function createBookmarkId(): string {
  return `bookmark-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function normalizeTags(tags: string[] | undefined): string[] {
  if (!tags || tags.length === 0) return [];
  return Array.from(
    new Set(tags.map(tag => tag.trim().toLowerCase()).filter(Boolean))
  );
}

export function getBookmarks(): BookmarkItem[] {
  return readBookmarks();
}

export function searchBookmarks(query: string): BookmarkItem[] {
  const lower = query.trim().toLowerCase();
  if (!lower) return readBookmarks();
  return readBookmarks().filter(bookmark => {
    return (
      bookmark.title.toLowerCase().includes(lower) ||
      bookmark.url.toLowerCase().includes(lower) ||
      bookmark.folder.toLowerCase().includes(lower) ||
      bookmark.tags.some(tag => tag.includes(lower)) ||
      (bookmark.description ?? '').toLowerCase().includes(lower)
    );
  });
}

export function addBookmark(input: CreateBookmarkInput): BookmarkItem | null {
  const normalizedUrl = normalizeUrl(input.url);
  if (!normalizedUrl) return null;

  const now = new Date().toISOString();
  const title = resolveTitle(normalizedUrl, input.title);
  const folder = input.folder?.trim() || 'General';
  const tags = normalizeTags(input.tags);
  const bookmarks = readBookmarks();
  const existing = bookmarks.find(bookmark => bookmark.url === normalizedUrl);

  if (existing) {
    const updated: BookmarkItem = {
      ...existing,
      title,
      folder,
      tags,
      description: input.description?.trim() || existing.description,
      updatedAt: now,
    };
    writeBookmarks(
      bookmarks.map(bookmark => (bookmark.id === existing.id ? updated : bookmark))
    );
    return updated;
  }

  const created: BookmarkItem = {
    id: createBookmarkId(),
    title,
    url: normalizedUrl,
    folder,
    tags,
    description: input.description?.trim() || '',
    createdAt: now,
    updatedAt: now,
  };
  writeBookmarks([created, ...bookmarks]);
  return created;
}

export function updateBookmark(bookmark: BookmarkItem): BookmarkItem | null {
  const normalizedUrl = normalizeUrl(bookmark.url);
  if (!normalizedUrl) return null;

  const bookmarks = readBookmarks();
  const index = bookmarks.findIndex(item => item.id === bookmark.id);
  if (index === -1) return null;

  const updated: BookmarkItem = {
    ...bookmark,
    title: resolveTitle(normalizedUrl, bookmark.title),
    url: normalizedUrl,
    folder: bookmark.folder.trim() || 'General',
    tags: normalizeTags(bookmark.tags),
    updatedAt: new Date().toISOString(),
  };
  bookmarks[index] = updated;
  writeBookmarks(bookmarks);
  return updated;
}

export function removeBookmark(id: string): void {
  const next = readBookmarks().filter(bookmark => bookmark.id !== id);
  writeBookmarks(next);
}

export function clearBookmarks(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(BOOKMARKS_KEY);
  dispatchBookmarksUpdated();
}

export function isBookmarked(url: string): boolean {
  const normalizedUrl = normalizeUrl(url);
  if (!normalizedUrl || normalizedUrl.startsWith('notilus://')) return false;
  return readBookmarks().some(bookmark => bookmark.url === normalizedUrl);
}

export function toggleBookmark(
  url: string,
  title: string,
  options: Pick<CreateBookmarkInput, 'folder' | 'tags' | 'description'> = {}
): boolean {
  const normalizedUrl = normalizeUrl(url);
  if (!normalizedUrl || normalizedUrl.startsWith('notilus://')) return false;

  const bookmarks = readBookmarks();
  const existing = bookmarks.find(bookmark => bookmark.url === normalizedUrl);
  if (existing) {
    writeBookmarks(bookmarks.filter(bookmark => bookmark.id !== existing.id));
    return false;
  }

  addBookmark({
    url: normalizedUrl,
    title,
    folder: options.folder,
    tags: options.tags,
    description: options.description,
  });
  return true;
}

export function subscribeToBookmarksUpdates(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(BOOKMARKS_UPDATED_EVENT, listener);
  return () => {
    window.removeEventListener(BOOKMARKS_UPDATED_EVENT, listener);
  };
}
