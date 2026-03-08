import { isHistoryEnabled } from './settings';
import type { ImportedHistoryEntry } from '../../shared/browser-contract';

export interface HistoryItem {
  id: string;
  url: string;
  title: string;
  visitedAt: string;
}

const HISTORY_KEY = 'notilus_history';
const HISTORY_MAX_ITEMS = 1000;
const HISTORY_UPDATED_EVENT = 'notilus:history-updated';

export interface HistoryMergeResult {
  inserted: number;
  updated: number;
  skipped: number;
}

function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('notilus://')) return trimmed;

  try {
    return new URL(trimmed).toString();
  } catch {
    return trimmed;
  }
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function dispatchHistoryUpdated() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(HISTORY_UPDATED_EVENT));
}

function parseStoredHistory(value: string | null): HistoryItem[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is HistoryItem => {
        if (!item || typeof item !== 'object') return false;
        const candidate = item as Partial<HistoryItem>;
        return Boolean(
          typeof candidate.id === 'string' &&
          typeof candidate.url === 'string' &&
          typeof candidate.title === 'string' &&
          typeof candidate.visitedAt === 'string'
        );
      })
      .sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime());
  } catch {
    return [];
  }
}

function readHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  return parseStoredHistory(window.localStorage.getItem(HISTORY_KEY));
}

function writeHistory(items: HistoryItem[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, HISTORY_MAX_ITEMS)));
  dispatchHistoryUpdated();
}

export function getHistoryItems(): HistoryItem[] {
  return readHistory();
}

export function addHistoryItem(url: string, title: string) {
  const normalizedUrl = normalizeUrl(url);
  if (!normalizedUrl || normalizedUrl.startsWith('notilus://')) return;
  if (!isHistoryEnabled()) return;

  const current = readHistory().filter(item => item.url !== normalizedUrl);
  const nextItem: HistoryItem = {
    id: `history-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    url: normalizedUrl,
    title: title.trim() || getHostname(normalizedUrl) || normalizedUrl,
    visitedAt: new Date().toISOString(),
  };

  current.unshift(nextItem);
  writeHistory(current);
}

export function clearHistoryItems() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(HISTORY_KEY);
  dispatchHistoryUpdated();
}

export function removeHistoryItem(id: string) {
  const filtered = readHistory().filter(item => item.id !== id);
  writeHistory(filtered);
}

export function subscribeToHistoryUpdates(listener: () => void) {
  if (typeof window === 'undefined') return () => {};

  window.addEventListener(HISTORY_UPDATED_EVENT, listener);
  return () => {
    window.removeEventListener(HISTORY_UPDATED_EVENT, listener);
  };
}

export function mergeImportedHistory(entries: ImportedHistoryEntry[]): HistoryMergeResult {
  const result: HistoryMergeResult = {
    inserted: 0,
    updated: 0,
    skipped: 0,
  };

  if (!Array.isArray(entries) || entries.length === 0) {
    return result;
  }

  const current = readHistory();
  const byUrl = new Map<string, HistoryItem>();
  for (const item of current) {
    byUrl.set(item.url, item);
  }

  let changed = false;

  for (const entry of entries) {
    const normalizedUrl = normalizeUrl(entry.url ?? '');
    if (!normalizedUrl || normalizedUrl.startsWith('notilus://')) {
      result.skipped += 1;
      continue;
    }

    const fallbackTitle = getHostname(normalizedUrl) || normalizedUrl;
    const nextTitle = (entry.title ?? '').trim() || fallbackTitle;
    const rawVisitedAt = (entry.visitedAt ?? '').trim();
    const nextVisitedAt = Number.isNaN(new Date(rawVisitedAt).getTime())
      ? new Date().toISOString()
      : new Date(rawVisitedAt).toISOString();

    const existing = byUrl.get(normalizedUrl);
    if (!existing) {
      byUrl.set(normalizedUrl, {
        id: `history-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        url: normalizedUrl,
        title: nextTitle,
        visitedAt: nextVisitedAt,
      });
      result.inserted += 1;
      changed = true;
      continue;
    }

    const existingTime = new Date(existing.visitedAt).getTime();
    const nextTime = new Date(nextVisitedAt).getTime();

    if (nextTime > existingTime || existing.title !== nextTitle) {
      byUrl.set(normalizedUrl, {
        ...existing,
        title: nextTime >= existingTime ? nextTitle : existing.title,
        visitedAt: nextTime >= existingTime ? nextVisitedAt : existing.visitedAt,
      });
      result.updated += 1;
      changed = true;
    } else {
      result.skipped += 1;
    }
  }

  if (changed) {
    const merged = Array.from(byUrl.values()).sort(
      (a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime()
    );
    writeHistory(merged);
  }

  return result;
}
