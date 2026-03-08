import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import initSqlJs from 'sql.js/dist/sql-asm.js';
import {
  parseChromiumBookmarks,
  parseChromiumHistory,
} from '../../electron/main/browser-import/parsers/chromium-import-parser';

function toChromiumTimestamp(iso: string): number {
  return (new Date(iso).getTime() + 11644473600000) * 1000;
}

describe('chromium import parser', () => {
  it('parses history and bookmarks from chromium profile', async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();

    db.run(`
      CREATE TABLE urls (
        id INTEGER PRIMARY KEY,
        url TEXT,
        title TEXT,
        last_visit_time INTEGER,
        hidden INTEGER
      );
    `);

    db.run(
      `INSERT INTO urls (url, title, last_visit_time, hidden) VALUES
       ('https://example.com', 'Example', ?, 0),
       ('chrome://settings', 'Internal', ?, 0),
       ('https://example.com', 'Example Updated', ?, 0),
       ('https://react.dev', 'React', ?, 0);`,
      [
        toChromiumTimestamp('2026-01-01T10:00:00.000Z'),
        toChromiumTimestamp('2026-01-01T11:00:00.000Z'),
        toChromiumTimestamp('2026-01-02T10:00:00.000Z'),
        toChromiumTimestamp('2026-01-03T10:00:00.000Z'),
      ]
    );

    const profilePath = mkdtempSync(join(tmpdir(), 'notilus-chromium-profile-'));
    mkdirSync(profilePath, { recursive: true });
    writeFileSync(join(profilePath, 'History'), Buffer.from(db.export()));
    db.close();

    const bookmarksPayload = {
      roots: {
        bookmark_bar: {
          type: 'folder',
          name: 'Bookmarks Bar',
          children: [
            {
              type: 'url',
              name: 'GitHub',
              url: 'https://github.com',
              date_added: String(toChromiumTimestamp('2026-01-01T10:00:00.000Z')),
            },
          ],
        },
        other: {
          type: 'folder',
          name: 'Other Bookmarks',
          children: [
            {
              type: 'url',
              name: 'Invalid',
              url: 'chrome://flags',
            },
          ],
        },
      },
    };

    writeFileSync(join(profilePath, 'Bookmarks'), JSON.stringify(bookmarksPayload), 'utf8');

    const history = await parseChromiumHistory(profilePath, 'chrome', 'chrome:default');
    const bookmarks = await parseChromiumBookmarks(profilePath, 'chrome', 'chrome:default');

    expect(history).toHaveLength(2);
    expect(history[0]?.url).toBe('https://react.dev');
    expect(history[1]?.title).toBe('Example Updated');

    expect(bookmarks).toHaveLength(1);
    expect(bookmarks[0]?.url).toBe('https://github.com');
    expect(bookmarks[0]?.folder).toContain('Bookmarks Bar');
  });
});
