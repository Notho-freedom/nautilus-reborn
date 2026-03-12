import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  ImportedBookmarkEntry,
  ImportedHistoryEntry,
  ImportBrowser,
} from '../../../../shared/browser-contract';
import {
  chromiumTimeToIso,
  cleanupTempCopy,
  copyLockedFileToTemp,
  isImportableWebUrl,
  openSqliteDatabase,
  readQueryRows,
} from './import-parser-utils';

const HISTORY_QUERY = `
  SELECT
    url,
    title,
    last_visit_time,
    hidden
  FROM urls
  ORDER BY last_visit_time DESC
  LIMIT 8000
`;

type BookmarkTreeNode = {
  type?: string;
  name?: string;
  url?: string;
  date_added?: string;
  date_last_used?: string;
  children?: BookmarkTreeNode[];
};

function resolveTitle(url: string, fallback?: string): string {
  if (fallback?.trim()) return fallback.trim();
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function normalizeFolderPath(parts: string[]): string {
  const normalized = parts.map(part => part.trim()).filter(Boolean);
  return normalized.length > 0 ? normalized.join(' / ') : 'Imported';
}

function dedupeHistoryByUrl(entries: ImportedHistoryEntry[]): ImportedHistoryEntry[] {
  const byUrl = new Map<string, ImportedHistoryEntry>();

  for (const entry of entries) {
    const current = byUrl.get(entry.url);
    if (!current) {
      byUrl.set(entry.url, entry);
      continue;
    }

    const currentTime = new Date(current.visitedAt).getTime();
    const nextTime = new Date(entry.visitedAt).getTime();
    if (Number.isFinite(nextTime) && nextTime > currentTime) {
      byUrl.set(entry.url, entry);
    }
  }

  return Array.from(byUrl.values()).sort(
    (a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime()
  );
}

export async function parseChromiumHistory(
  profilePath: string,
  browser: ImportBrowser,
  profileId: string
): Promise<ImportedHistoryEntry[]> {
  const historyFilePath = join(profilePath, 'History');
  if (!existsSync(historyFilePath)) return [];

  const copyPath = copyLockedFileToTemp(historyFilePath, `${browser}-history`);
  try {
    const db = await openSqliteDatabase(copyPath);
    try {
      const rows = readQueryRows(db, HISTORY_QUERY);
      const entries: ImportedHistoryEntry[] = [];

      for (const row of rows) {
        const hidden = Number(row.hidden ?? 0);
        const rawUrl = String(row.url ?? '').trim();
        if (hidden === 1 || !isImportableWebUrl(rawUrl)) continue;

        const visitedAt = chromiumTimeToIso(Number(row.last_visit_time)) ?? new Date().toISOString();
        entries.push({
          url: rawUrl,
          title: resolveTitle(rawUrl, String(row.title ?? '')),
          visitedAt,
          sourceBrowser: browser,
          sourceProfileId: profileId,
        });
      }

      return dedupeHistoryByUrl(entries);
    } finally {
      db.close();
    }
  } finally {
    cleanupTempCopy(copyPath);
  }
}

function pushBookmarkEntries(
  node: BookmarkTreeNode,
  context: {
    browser: ImportBrowser;
    profileId: string;
    entries: ImportedBookmarkEntry[];
    folderParts: string[];
  }
): void {
  if (!node || typeof node !== 'object') return;

  if (node.type === 'url') {
    const rawUrl = String(node.url ?? '').trim();
    if (!isImportableWebUrl(rawUrl)) return;

    context.entries.push({
      url: rawUrl,
      title: resolveTitle(rawUrl, String(node.name ?? '')),
      folder: normalizeFolderPath(context.folderParts),
      tags: [],
      createdAt: chromiumTimeToIso(Number(node.date_added)) ?? undefined,
      updatedAt: (chromiumTimeToIso(Number(node.date_last_used)) ?? chromiumTimeToIso(Number(node.date_added))) ?? undefined,
      sourceBrowser: context.browser,
      sourceProfileId: context.profileId,
    });
    return;
  }

  const children = Array.isArray(node.children) ? node.children : [];
  if (children.length === 0) return;

  const nextFolderParts =
    node.type === 'folder' && node.name
      ? [...context.folderParts, node.name]
      : context.folderParts;

  for (const child of children) {
    pushBookmarkEntries(child, {
      ...context,
      folderParts: nextFolderParts,
    });
  }
}

const ROOT_LABELS: Record<string, string> = {
  bookmark_bar: 'Bookmarks Bar',
  other: 'Other Bookmarks',
  synced: 'Synced Bookmarks',
};

export async function parseChromiumBookmarks(
  profilePath: string,
  browser: ImportBrowser,
  profileId: string
): Promise<ImportedBookmarkEntry[]> {
  const bookmarksPath = join(profilePath, 'Bookmarks');
  if (!existsSync(bookmarksPath)) return [];

  let payload: unknown;
  try {
    payload = JSON.parse(readFileSync(bookmarksPath, 'utf8')) as unknown;
  } catch {
    return [];
  }

  const roots = (payload as { roots?: Record<string, BookmarkTreeNode> })?.roots;
  if (!roots || typeof roots !== 'object') return [];

  const entries: ImportedBookmarkEntry[] = [];
  for (const [rootKey, rootNode] of Object.entries(roots)) {
    const rootLabel = ROOT_LABELS[rootKey] ?? rootNode?.name ?? 'Imported';
    pushBookmarkEntries(rootNode, {
      browser,
      profileId,
      entries,
      folderParts: [rootLabel],
    });
  }

  const dedupe = new Map<string, ImportedBookmarkEntry>();
  for (const entry of entries) {
    dedupe.set(entry.url, entry);
  }

  return Array.from(dedupe.values());
}
