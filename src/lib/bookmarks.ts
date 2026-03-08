import type { ImportedBookmarkEntry } from '../../shared/browser-contract';

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

export interface BookmarkMergeResult {
  inserted: number;
  updated: number;
  skipped: number;
}

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

function resolveTimestamp(raw: string | undefined, fallback: string): string {
  const candidate = (raw ?? '').trim();
  const parsed = new Date(candidate).getTime();
  if (Number.isNaN(parsed)) return fallback;
  return new Date(parsed).toISOString();
}

export function mergeImportedBookmarks(entries: ImportedBookmarkEntry[]): BookmarkMergeResult {
  const result: BookmarkMergeResult = {
    inserted: 0,
    updated: 0,
    skipped: 0,
  };

  if (!Array.isArray(entries) || entries.length === 0) {
    return result;
  }

  const bookmarks = readBookmarks();
  const byUrl = new Map<string, BookmarkItem>();
  for (const bookmark of bookmarks) {
    byUrl.set(bookmark.url, bookmark);
  }

  let changed = false;

  for (const entry of entries) {
    const normalizedUrl = normalizeUrl(entry.url ?? '');
    if (!normalizedUrl || normalizedUrl.startsWith('notilus://')) {
      result.skipped += 1;
      continue;
    }

    const nowIso = new Date().toISOString();
    const existing = byUrl.get(normalizedUrl);
    const incomingTags = normalizeTags(entry.tags ?? []);
    const incomingTitle = resolveTitle(normalizedUrl, entry.title ?? '');
    const incomingFolder = (entry.folder ?? '').trim() || 'Imported';
    const incomingDescription = (entry.description ?? '').trim();
    const incomingCreatedAt = resolveTimestamp(entry.createdAt, nowIso);
    const incomingUpdatedAt = resolveTimestamp(entry.updatedAt, incomingCreatedAt);

    if (!existing) {
      byUrl.set(normalizedUrl, {
        id: createBookmarkId(),
        title: incomingTitle,
        url: normalizedUrl,
        tags: incomingTags,
        folder: incomingFolder,
        description: incomingDescription,
        createdAt: incomingCreatedAt,
        updatedAt: incomingUpdatedAt,
      });
      result.inserted += 1;
      changed = true;
      continue;
    }

    const mergedTags = normalizeTags([...(existing.tags ?? []), ...incomingTags]);
    const nextUpdatedAt =
      new Date(incomingUpdatedAt).getTime() > new Date(existing.updatedAt).getTime()
        ? incomingUpdatedAt
        : existing.updatedAt;
    const nextTitle =
      new Date(incomingUpdatedAt).getTime() >= new Date(existing.updatedAt).getTime()
        ? incomingTitle
        : existing.title;

    const nextFolder =
      existing.folder && existing.folder !== 'General'
        ? existing.folder
        : incomingFolder;

    const nextDescription = incomingDescription || existing.description || '';

    const changedEntry =
      nextTitle !== existing.title ||
      nextFolder !== existing.folder ||
      nextDescription !== (existing.description ?? '') ||
      nextUpdatedAt !== existing.updatedAt ||
      mergedTags.join('|') !== (existing.tags ?? []).join('|');

    if (!changedEntry) {
      result.skipped += 1;
      continue;
    }

    byUrl.set(normalizedUrl, {
      ...existing,
      title: nextTitle,
      folder: nextFolder,
      description: nextDescription,
      tags: mergedTags,
      createdAt: existing.createdAt || incomingCreatedAt,
      updatedAt: nextUpdatedAt,
    });
    result.updated += 1;
    changed = true;
  }

  if (changed) {
    const merged = Array.from(byUrl.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    writeBookmarks(merged);
  }

  return result;
}
