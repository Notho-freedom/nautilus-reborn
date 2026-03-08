import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import initSqlJs from 'sql.js/dist/sql-asm.js';
import type { Database, QueryExecResult, SqlJsStatic } from 'sql.js';

let sqlJsPromise: Promise<SqlJsStatic> | null = null;

function getSqlJs(): Promise<SqlJsStatic> {
  if (!sqlJsPromise) {
    sqlJsPromise = initSqlJs();
  }
  return sqlJsPromise;
}

export async function withTimeout<T>(
  task: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  let timer: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      task,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(timeoutMessage));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export function isImportableWebUrl(rawUrl: string): boolean {
  if (!rawUrl) return false;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function chromiumTimeToIso(value: number | null | undefined): string | null {
  if (!Number.isFinite(value as number)) return null;
  const microseconds = Number(value);
  if (microseconds <= 0) return null;
  const unixEpochMs = microseconds / 1000 - 11644473600000;
  const date = new Date(unixEpochMs);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function firefoxTimeToIso(value: number | null | undefined): string | null {
  if (!Number.isFinite(value as number)) return null;
  const microseconds = Number(value);
  if (microseconds <= 0) return null;
  const date = new Date(microseconds / 1000);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function sqliteDateToIso(value: number | null | undefined): string | null {
  if (!Number.isFinite(value as number)) return null;
  const numeric = Number(value);
  if (numeric <= 0) return null;
  const date = new Date(numeric / 1000);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function copyLockedFileToTemp(sourcePath: string, prefix: string): string {
  if (!existsSync(sourcePath)) {
    throw new Error(`Source file does not exist: ${sourcePath}`);
  }

  const tmpRoot = mkdtempSync(join(tmpdir(), `notilus-${prefix}-`));
  const copyPath = join(tmpRoot, 'db.sqlite');
  copyFileSync(sourcePath, copyPath);
  return copyPath;
}

export function cleanupTempCopy(path: string): void {
  try {
    rmSync(path, { force: true });
  } catch {
    // Ignore cleanup failures.
  }

  try {
    rmSync(dirname(path), { recursive: true, force: true });
  } catch {
    // Ignore cleanup failures.
  }
}

export async function openSqliteDatabase(copyPath: string): Promise<Database> {
  const SQL = await getSqlJs();
  const buffer = readFileSync(copyPath);
  return new SQL.Database(buffer);
}

export function readQueryRows(
  db: Database,
  query: string
): Array<Record<string, string | number | null>> {
  const result = db.exec(query);
  if (!result || result.length === 0) return [];

  const first = result[0] as QueryExecResult;
  return first.values.map(row => {
    const mapped: Record<string, string | number | null> = {};
    first.columns.forEach((column, index) => {
      const cell = row[index] as string | number | null;
      mapped[column] = cell;
    });
    return mapped;
  });
}
