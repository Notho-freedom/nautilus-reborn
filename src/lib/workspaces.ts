export interface WorkspaceTab {
  url: string;
  title: string;
  pinned?: boolean;
}

export interface WorkspaceEntry {
  id: string;
  name: string;
  createdAt: string;
  tabs: WorkspaceTab[];
}

const WORKSPACES_KEY = 'notilus_workspaces';
const WORKSPACES_UPDATED_EVENT = 'notilus:workspaces-updated';

function dispatchWorkspacesUpdated() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(WORKSPACES_UPDATED_EVENT));
}

function parseStoredWorkspaces(value: string | null): WorkspaceEntry[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((entry): entry is WorkspaceEntry => {
        if (!entry || typeof entry !== 'object') return false;
        const candidate = entry as Partial<WorkspaceEntry>;
        return Boolean(
          typeof candidate.id === 'string' &&
            typeof candidate.name === 'string' &&
            typeof candidate.createdAt === 'string' &&
            Array.isArray(candidate.tabs)
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}

function readWorkspaces(): WorkspaceEntry[] {
  if (typeof window === 'undefined') return [];
  return parseStoredWorkspaces(window.localStorage.getItem(WORKSPACES_KEY));
}

function writeWorkspaces(entries: WorkspaceEntry[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(WORKSPACES_KEY, JSON.stringify(entries));
  dispatchWorkspacesUpdated();
}

export function getWorkspaces(): WorkspaceEntry[] {
  return readWorkspaces();
}

export function addWorkspace(name: string, tabs: WorkspaceTab[]): WorkspaceEntry | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  if (!tabs || tabs.length === 0) return null;

  const nextEntry: WorkspaceEntry = {
    id: `workspace-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name: trimmed,
    createdAt: new Date().toISOString(),
    tabs,
  };

  const next = [nextEntry, ...readWorkspaces()];
  writeWorkspaces(next);
  return nextEntry;
}

export function removeWorkspace(id: string) {
  const next = readWorkspaces().filter(entry => entry.id !== id);
  writeWorkspaces(next);
}

export function renameWorkspace(id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const next = readWorkspaces().map(entry =>
    entry.id === id ? { ...entry, name: trimmed } : entry
  );
  writeWorkspaces(next);
}

export function subscribeToWorkspaceUpdates(listener: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(WORKSPACES_UPDATED_EVENT, listener);
  return () => {
    window.removeEventListener(WORKSPACES_UPDATED_EVENT, listener);
  };
}

