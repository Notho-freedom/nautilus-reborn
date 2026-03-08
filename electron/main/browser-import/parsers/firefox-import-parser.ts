import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type {
  ImportedBookmarkEntry,
  ImportedHistoryEntry,
} from '../../../../shared/browser-contract';
import {
  cleanupTempCopy,
  copyLockedFileToTemp,
  firefoxTimeToIso,
  isImportableWebUrl,
  openSqliteDatabase,
  readQueryRows,
  sqliteDateToIso,
} from './import-parser-utils';

const FIREFOX_HISTORY_QUERY = `
  SELECT
    p.url AS url,
    p.title AS title,
    h.visit_date AS visit_date
  FROM moz_historyvisits h
  JOIN moz_places p ON p.id = h.place_id
  ORDER BY h.visit_date DESC
  LIMIT 8000
`;

const FIREFOX_FOLDERS_QUERY = `
  SELECT
    id,
    parent,
    title
  FROM moz_bookmarks
  WHERE type = 2
`;

const FIREFOX_BOOKMARKS_QUERY = `
  SELECT
    b.id AS id,
    b.parent AS parent,
    b.title AS title,
    b.dateAdded AS dateAdded,
    b.lastModified AS lastModified,
    p.url AS url
  FROM moz_bookmarks b
  JOIN moz_places p ON p.id = b.fk
  WHERE b.type = 1
  ORDER BY b.lastModified DESC
  LIMIT 8000
`;

function resolveTitle(url: string, fallback?: string): string {
  if (fallback?.trim()) return fallback.trim();
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
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

function buildFolderResolver(
  rows: Array<Record<string, string | number | null>>
): (folderId: number | null | undefined) => string {
  const folderMap = new Map<number, { parent: number | null; title: string }>();

  for (const row of rows) {
    const id = Number(row.id);
    if (!Number.isFinite(id)) continue;
    folderMap.set(id, {
      parent: Number.isFinite(Number(row.parent)) ? Number(row.parent) : null,
      title: String(row.title ?? '').trim(),
    });
  }

  return (folderId: number | null | undefined): string => {
    if (!Number.isFinite(folderId as number)) return 'Imported';

    const parts: string[] = [];
    const seen = new Set<number>();
    let current = Number(folderId);

    while (Number.isFinite(current) && !seen.has(current)) {
      seen.add(current);
      const folder = folderMap.get(current);
      if (!folder) break;
      if (folder.title) {
        parts.unshift(folder.title);
      }
      if (!Number.isFinite(folder.parent as number)) break;
      current = Number(folder.parent);
    }

    if (parts.length === 0) return 'Imported';
    return parts.join(' / ');
  };
}

export async function parseFirefoxHistory(
  profilePath: string,
  profileId: string
): Promise<ImportedHistoryEntry[]> {
  const placesPath = join(profilePath, 'places.sqlite');
  if (!existsSync(placesPath)) return [];

  const copyPath = copyLockedFileToTemp(placesPath, 'firefox-history');
  try {
    const db = await openSqliteDatabase(copyPath);
    try {
      const rows = readQueryRows(db, FIREFOX_HISTORY_QUERY);
      const entries: ImportedHistoryEntry[] = [];

      for (const row of rows) {
        const rawUrl = String(row.url ?? '').trim();
        if (!isImportableWebUrl(rawUrl)) continue;

        entries.push({
          url: rawUrl,
          title: resolveTitle(rawUrl, String(row.title ?? '')),
          visitedAt: firefoxTimeToIso(Number(row.visit_date)) ?? new Date().toISOString(),
          sourceBrowser: 'firefox',
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

export async function parseFirefoxBookmarks(
  profilePath: string,
  profileId: string
): Promise<ImportedBookmarkEntry[]> {
  const placesPath = join(profilePath, 'places.sqlite');
  if (!existsSync(placesPath)) return [];

  const copyPath = copyLockedFileToTemp(placesPath, 'firefox-bookmarks');
  try {
    const db = await openSqliteDatabase(copyPath);
    try {
      const folderRows = readQueryRows(db, FIREFOX_FOLDERS_QUERY);
      const folderPathForId = buildFolderResolver(folderRows);
      const bookmarkRows = readQueryRows(db, FIREFOX_BOOKMARKS_QUERY);

      const entries: ImportedBookmarkEntry[] = [];
      for (const row of bookmarkRows) {
        const rawUrl = String(row.url ?? '').trim();
        if (!isImportableWebUrl(rawUrl)) continue;

        const parentId = Number(row.parent);
        entries.push({
          url: rawUrl,
          title: resolveTitle(rawUrl, String(row.title ?? '')),
          folder: folderPathForId(parentId),
          tags: [],
          createdAt: sqliteDateToIso(Number(row.dateAdded)),
          updatedAt: sqliteDateToIso(Number(row.lastModified)),
          sourceBrowser: 'firefox',
          sourceProfileId: profileId,
        });
      }

      const deduped = new Map<string, ImportedBookmarkEntry>();
      for (const entry of entries) {
        deduped.set(entry.url, entry);
      }
      return Array.from(deduped.values());
    } finally {
      db.close();
    }
  } finally {
    cleanupTempCopy(copyPath);
  }
}
