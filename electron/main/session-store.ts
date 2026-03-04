import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { app } from 'electron';

const SESSION_VERSION = 1;
const MAX_SESSION_TABS = 50;

export interface PersistedTabSession {
  version: 1;
  activeTabId: string | null;
  tabs: Array<{
    id: string;
    url: string;
    title: string;
    kind: 'internal' | 'external';
  }>;
  pinnedTabIds: string[];
  updatedAt: string;
}

function resolveSessionPath(): string {
  return join(app.getPath('userData'), 'notilus', 'session-tabs.json');
}

function sanitizeSession(value: unknown): PersistedTabSession | null {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Partial<PersistedTabSession>;
  if (candidate.version !== SESSION_VERSION) return null;
  if (!Array.isArray(candidate.tabs)) return null;

  const tabs = candidate.tabs
    .filter(tab => {
      if (!tab || typeof tab !== 'object') return false;
      const next = tab as PersistedTabSession['tabs'][number];
      return (
        typeof next.id === 'string' &&
        typeof next.url === 'string' &&
        typeof next.title === 'string' &&
        (next.kind === 'internal' || next.kind === 'external')
      );
    })
    .slice(0, MAX_SESSION_TABS)
    .map(tab => ({
      id: tab.id,
      url: tab.url,
      title: tab.title,
      kind: tab.kind,
    }));

  if (!tabs.length) return null;

  const activeTabId =
    typeof candidate.activeTabId === 'string' && tabs.some(tab => tab.id === candidate.activeTabId)
      ? candidate.activeTabId
      : tabs[0].id;

  const pinnedTabIds = Array.isArray(candidate.pinnedTabIds)
    ? candidate.pinnedTabIds.filter((id): id is string => typeof id === 'string')
    : [];

  const updatedAt =
    typeof candidate.updatedAt === 'string' && candidate.updatedAt.length > 0
      ? candidate.updatedAt
      : new Date().toISOString();

  return {
    version: SESSION_VERSION,
    activeTabId,
    tabs,
    pinnedTabIds,
    updatedAt,
  };
}

export class SessionStore {
  private resolvePath(): string {
    return resolveSessionPath();
  }

  load(): PersistedTabSession | null {
    try {
      const sessionPath = this.resolvePath();
      if (!existsSync(sessionPath)) return null;
      const raw = readFileSync(sessionPath, 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      return sanitizeSession(parsed);
    } catch {
      return null;
    }
  }

  save(session: PersistedTabSession): void {
    try {
      const sessionPath = this.resolvePath();
      const next: PersistedTabSession = {
        ...session,
        version: SESSION_VERSION,
        tabs: session.tabs.slice(0, MAX_SESSION_TABS),
        pinnedTabIds: session.pinnedTabIds.filter(Boolean),
        updatedAt: new Date().toISOString(),
      };

      mkdirSync(dirname(sessionPath), { recursive: true });
      writeFileSync(sessionPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
    } catch {
      // Ignore persistence failures and keep runtime session alive.
    }
  }
}
