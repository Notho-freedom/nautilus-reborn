import { app } from 'electron';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { TabKind, TabRenderMode } from '../../shared/browser-contract';

export interface PersistedTabSession {
  version: 1;
  activeTabId: string | null;
  tabs: Array<{
    id: string;
    url: string;
    title: string;
    kind: TabKind;
    renderMode?: TabRenderMode;
    isPrivate?: boolean;
  }>;
  pinnedTabIds: string[];
  updatedAt: string;
}

const SESSION_DIR = 'notilus';
const SESSION_FILE = 'session-tabs.json';
const MAX_TABS = 50;

function resolveSessionPath() {
  const root = app.getPath('userData');
  const dir = join(root, SESSION_DIR);
  return { dir, file: join(dir, SESSION_FILE) };
}

function isValidSession(payload: unknown): payload is PersistedTabSession {
  if (!payload || typeof payload !== 'object') return false;
  const candidate = payload as Partial<PersistedTabSession>;
  if (candidate.version !== 1) return false;
  if (!Array.isArray(candidate.tabs)) return false;
  if (!Array.isArray(candidate.pinnedTabIds)) return false;
  if (typeof candidate.updatedAt !== 'string') return false;
  return true;
}

export function loadTabSession(): PersistedTabSession | null {
  try {
    const { file } = resolveSessionPath();
    const raw = readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidSession(parsed)) return null;

    const trimmedTabs = parsed.tabs
      .filter(tab => Boolean(tab && typeof tab.id === 'string' && typeof tab.url === 'string'))
      .slice(0, MAX_TABS);

    return {
      ...parsed,
      tabs: trimmedTabs,
    };
  } catch {
    return null;
  }
}

export function saveTabSession(session: PersistedTabSession): void {
  try {
    const { dir, file } = resolveSessionPath();
    mkdirSync(dir, { recursive: true });
    const payload: PersistedTabSession = {
      ...session,
      tabs: session.tabs.slice(0, MAX_TABS),
      updatedAt: new Date().toISOString(),
    };
    writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
  } catch {
    // Ignore persistence failures.
  }
}

export class TabSessionStore {
  private timer: NodeJS.Timeout | null = null;
  private latest: PersistedTabSession | null = null;

  constructor(private readonly delayMs = 250) {}

  load(): PersistedTabSession | null {
    return loadTabSession();
  }

  schedule(session: PersistedTabSession) {
    this.latest = session;
    if (this.timer) return;
    this.timer = setTimeout(() => {
      if (this.latest) {
        saveTabSession(this.latest);
      }
      this.timer = null;
    }, this.delayMs);
  }

  flush() {
    if (!this.latest) return;
    saveTabSession(this.latest);
    this.latest = null;
  }
}
