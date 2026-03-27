import type { HistoryItem } from './history';
import type { BookmarkItem } from './bookmarks';
import type { BrowserTab } from '@/hooks/useBrowserState';
import type { SearchEngineId } from './settings';

export type AutocompleteSectionId = 'suggestions' | 'history' | 'bookmarks';

export interface RecentSearch {
  id: string;
  query: string;
  lastUsedAt: string;
  count: number;
}

export interface AutocompleteItem {
  id: string;
  kind: AutocompleteSectionId;
  title: string;
  url?: string;
  query?: string;
  subtitle?: string;
  openTabId?: string;
}

export interface AutocompleteSection {
  id: AutocompleteSectionId;
  title: string;
  items: AutocompleteItem[];
}

export interface AutocompleteResults {
  sections: AutocompleteSection[];
  flatItems: AutocompleteItem[];
  inlineValue?: string;
  inlineItemId?: string;
}

const RECENT_SEARCHES_KEY = 'notilus_recent_searches';
const RECENT_SEARCHES_MAX = 30;

function normalizeQuery(value: string): string {
  return value.trim();
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function sortByLastUsed(a: RecentSearch, b: RecentSearch): number {
  return new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime();
}

export function getRecentSearches(): RecentSearch[] {
  if (typeof window === 'undefined') return [];
  const parsed = safeParse<RecentSearch[]>(window.localStorage.getItem(RECENT_SEARCHES_KEY));
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(item => item && typeof item.query === 'string' && typeof item.lastUsedAt === 'string')
    .map(item => ({
      id: item.id,
      query: item.query,
      lastUsedAt: item.lastUsedAt,
      count: typeof item.count === 'number' ? item.count : 1,
    }))
    .sort(sortByLastUsed);
}

export function recordSearch(query: string): void {
  if (typeof window === 'undefined') return;
  const normalized = normalizeQuery(query);
  if (!normalized) return;

  const nowIso = new Date().toISOString();
  const current = getRecentSearches();
  const lower = normalized.toLowerCase();
  const existing = current.find(item => item.query.toLowerCase() === lower);

  let next: RecentSearch[];
  if (existing) {
    next = [
      {
        ...existing,
        lastUsedAt: nowIso,
        count: existing.count + 1,
      },
      ...current.filter(item => item !== existing),
    ];
  } else {
    next = [
      {
        id: `recent-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        query: normalized,
        lastUsedAt: nowIso,
        count: 1,
      },
      ...current,
    ];
  }

  window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next.slice(0, RECENT_SEARCHES_MAX)));
}

export function buildSearchUrl(query: string, engine: SearchEngineId): string {
  const encoded = encodeURIComponent(query);
  if (engine === 'google') return `https://www.google.com/search?q=${encoded}`;
  if (engine === 'brave') return `https://search.brave.com/search?q=${encoded}`;
  return `https://duckduckgo.com/?q=${encoded}`;
}

export function getSearchEngineLabel(engine: SearchEngineId): string {
  if (engine === 'google') return 'Google Search';
  if (engine === 'brave') return 'Brave Search';
  return 'DuckDuckGo Search';
}

export function stripUrlForDisplay(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

export function normalizeUrlForMatch(url: string): string {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.endsWith('/') && parsed.pathname !== '/'
      ? parsed.pathname.slice(0, -1)
      : parsed.pathname;
    return `${parsed.origin}${pathname}${parsed.search}`;
  } catch {
    return url.trim();
  }
}

export function isLikelyUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('notilus://')) return true;
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)) return true;
  return trimmed.includes('.');
}

function matchesQuery(value: string, query: string): boolean {
  return value.toLowerCase().includes(query);
}

function getInlineCandidateFromItems(items: AutocompleteItem[], query: string): AutocompleteItem | null {
  const lower = query.toLowerCase();
  for (const item of items) {
    if (item.url) {
      const stripped = stripUrlForDisplay(item.url).toLowerCase();
      if (stripped.startsWith(lower)) return item;
    }
  }
  return null;
}

function getInlineCandidateFromSearches(items: AutocompleteItem[], query: string): AutocompleteItem | null {
  const lower = query.toLowerCase();
  for (const item of items) {
    if (!item.query) continue;
    if (item.query.toLowerCase().startsWith(lower)) return item;
  }
  return null;
}

export function buildAutocompleteResults(options: {
  query: string;
  historyItems: HistoryItem[];
  bookmarkItems: BookmarkItem[];
  recentSearches: RecentSearch[];
  searchEngine: SearchEngineId;
  openTabs?: BrowserTab[];
  activeTabId?: string;
  maxPerSection?: number;
}): AutocompleteResults {
  const {
    query,
    historyItems,
    bookmarkItems,
    recentSearches,
    searchEngine,
    openTabs = [],
    activeTabId,
    maxPerSection = 6,
  } = options;

  const normalizedQuery = normalizeQuery(query).toLowerCase();

  const suggestions = (normalizedQuery ? recentSearches.filter(item => matchesQuery(item.query, normalizedQuery)) : recentSearches)
    .sort(sortByLastUsed)
    .slice(0, maxPerSection)
    .map(item => ({
      id: item.id,
      kind: 'suggestions' as const,
      title: item.query,
      query: item.query,
      subtitle: getSearchEngineLabel(searchEngine),
    }));

  const historyMatches = normalizedQuery
    ? historyItems
        .filter(item => matchesQuery(item.title, normalizedQuery) || matchesQuery(item.url, normalizedQuery))
        .slice(0, maxPerSection)
        .map(item => ({
          id: item.id,
          kind: 'history' as const,
          title: item.title,
          url: item.url,
          subtitle: stripUrlForDisplay(item.url),
        }))
    : [];

  const bookmarkMatches = normalizedQuery
    ? bookmarkItems
        .filter(
          item =>
            matchesQuery(item.title, normalizedQuery) ||
            matchesQuery(item.url, normalizedQuery) ||
            matchesQuery(item.folder, normalizedQuery) ||
            item.tags.some(tag => matchesQuery(tag, normalizedQuery))
        )
        .slice(0, maxPerSection)
        .map(item => ({
          id: item.id,
          kind: 'bookmarks' as const,
          title: item.title,
          url: item.url,
          subtitle: stripUrlForDisplay(item.url),
        }))
    : [];

  const sections: AutocompleteSection[] = [];
  if (suggestions.length) {
    sections.push({ id: 'suggestions', title: 'Suggestions', items: suggestions });
  }
  if (historyMatches.length) {
    sections.push({ id: 'history', title: 'History', items: historyMatches });
  }
  if (bookmarkMatches.length) {
    sections.push({ id: 'bookmarks', title: 'Bookmarks', items: bookmarkMatches });
  }

  const flatItems = sections.flatMap(section => section.items);

  if (openTabs.length > 0) {
    const tabMap = new Map<string, string>();
    for (const tab of openTabs) {
      if (!tab.url) continue;
      const normalized = normalizeUrlForMatch(tab.url);
      if (!tabMap.has(normalized)) {
        tabMap.set(normalized, tab.id);
      }
    }
    for (const item of flatItems) {
      if (!item.url) continue;
      const normalized = normalizeUrlForMatch(item.url);
      const tabId = tabMap.get(normalized);
      if (tabId && tabId !== activeTabId) {
        item.openTabId = tabId;
      }
    }
  }

  let inlineItem: AutocompleteItem | null = null;
  if (normalizedQuery) {
    inlineItem = getInlineCandidateFromItems([...historyMatches, ...bookmarkMatches], normalizedQuery);
    if (!inlineItem) {
      inlineItem = getInlineCandidateFromSearches(suggestions, normalizedQuery);
    }
  }

  const inlineValue =
    inlineItem?.url ? stripUrlForDisplay(inlineItem.url) : inlineItem?.query;

  return {
    sections,
    flatItems,
    inlineValue,
    inlineItemId: inlineItem?.id,
  };
}

export function resolveSmartTarget(options: {
  query: string;
  results: AutocompleteResults;
  searchEngine: SearchEngineId;
}): { url: string; isSearch: boolean } | null {
  const trimmed = normalizeQuery(options.query);
  if (!trimmed) return null;

  const { results, searchEngine } = options;
  const preferredItem = results.flatItems.find(item => item.id === results.inlineItemId) ?? results.flatItems[0];
  if (preferredItem?.url) {
    return { url: preferredItem.url, isSearch: false };
  }

  if (isLikelyUrl(trimmed)) {
    const finalUrl = trimmed.includes('://') ? trimmed : `https://${trimmed}`;
    return { url: finalUrl, isSearch: false };
  }

  return { url: buildSearchUrl(trimmed, searchEngine), isSearch: true };
}
