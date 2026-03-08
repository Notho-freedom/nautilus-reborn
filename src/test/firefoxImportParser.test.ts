import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import initSqlJs from 'sql.js/dist/sql-asm.js';
import {
  parseFirefoxBookmarks,
  parseFirefoxHistory,
} from '../../electron/main/browser-import/parsers/firefox-import-parser';

function toFirefoxMicros(iso: string): number {
  return new Date(iso).getTime() * 1000;
}

describe('firefox import parser', () => {
  it('parses history and bookmarks from places.sqlite', async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();

    db.run(`
      CREATE TABLE moz_places (
        id INTEGER PRIMARY KEY,
        url TEXT,
        title TEXT
      );
      CREATE TABLE moz_historyvisits (
        id INTEGER PRIMARY KEY,
        place_id INTEGER,
        visit_date INTEGER
      );
      CREATE TABLE moz_bookmarks (
        id INTEGER PRIMARY KEY,
        type INTEGER,
        fk INTEGER,
        parent INTEGER,
        title TEXT,
        dateAdded INTEGER,
        lastModified INTEGER
      );
    `);

    db.run(
      `INSERT INTO moz_places (id, url, title) VALUES
       (1, 'https://mozilla.org', 'Mozilla'),
       (2, 'https://react.dev', 'React'),
       (3, 'about:config', 'Internal');`
    );

    db.run(
      `INSERT INTO moz_historyvisits (place_id, visit_date) VALUES
       (1, ?),
       (2, ?),
       (3, ?);`,
      [
        toFirefoxMicros('2026-01-01T10:00:00.000Z'),
        toFirefoxMicros('2026-01-02T10:00:00.000Z'),
        toFirefoxMicros('2026-01-03T10:00:00.000Z'),
      ]
    );

    db.run(
      `INSERT INTO moz_bookmarks (id, type, fk, parent, title, dateAdded, lastModified) VALUES
       (10, 2, NULL, 0, 'Toolbar', ?, ?),
       (20, 2, NULL, 10, 'Dev', ?, ?),
       (30, 1, 1, 20, 'Mozilla Bookmark', ?, ?);`,
      [
        toFirefoxMicros('2026-01-01T00:00:00.000Z'),
        toFirefoxMicros('2026-01-01T00:00:00.000Z'),
        toFirefoxMicros('2026-01-01T00:00:00.000Z'),
        toFirefoxMicros('2026-01-01T00:00:00.000Z'),
        toFirefoxMicros('2026-01-01T00:00:00.000Z'),
        toFirefoxMicros('2026-01-02T00:00:00.000Z'),
      ]
    );

    const profilePath = mkdtempSync(join(tmpdir(), 'notilus-firefox-profile-'));
    mkdirSync(profilePath, { recursive: true });
    writeFileSync(join(profilePath, 'places.sqlite'), Buffer.from(db.export()));
    db.close();

    const history = await parseFirefoxHistory(profilePath, 'firefox:default');
    const bookmarks = await parseFirefoxBookmarks(profilePath, 'firefox:default');

    expect(history).toHaveLength(2);
    expect(history[0]?.url).toBe('https://react.dev');
    expect(history[1]?.url).toBe('https://mozilla.org');

    expect(bookmarks).toHaveLength(1);
    expect(bookmarks[0]?.url).toBe('https://mozilla.org');
    expect(bookmarks[0]?.folder).toContain('Toolbar');
    expect(bookmarks[0]?.folder).toContain('Dev');
  });
});
