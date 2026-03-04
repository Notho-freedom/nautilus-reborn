export type FlouEntryType = 'page' | 'note';

export interface FlouEntry {
  id: string;
  type: FlouEntryType;
  title: string;
  text: string;
  url: string;
  createdAt: string;
}

const FLOU_KEY = 'notilus_flou_entries';
const FLOU_UPDATED_EVENT = 'notilus:flou-updated';

function createFlouId(): string {
  return `flou-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function dispatchFlouUpdated() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(FLOU_UPDATED_EVENT));
}

function isFlouEntry(value: unknown): value is FlouEntry {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<FlouEntry>;
  return Boolean(
    typeof candidate.id === 'string' &&
      (candidate.type === 'page' || candidate.type === 'note') &&
      typeof candidate.title === 'string' &&
      typeof candidate.text === 'string' &&
      typeof candidate.url === 'string' &&
      typeof candidate.createdAt === 'string'
  );
}

function parseFlouEntries(value: string | null): FlouEntry[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isFlouEntry)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } catch {
    return [];
  }
}

function readFlouEntries(): FlouEntry[] {
  if (typeof window === 'undefined') return [];
  return parseFlouEntries(window.localStorage.getItem(FLOU_KEY));
}

function writeFlouEntries(entries: FlouEntry[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(FLOU_KEY, JSON.stringify(entries));
  dispatchFlouUpdated();
}

export function getFlouEntries(): FlouEntry[] {
  return readFlouEntries();
}

export function addFlouPage(input: { title: string; url: string }): FlouEntry {
  const entry: FlouEntry = {
    id: createFlouId(),
    type: 'page',
    title: input.title.trim() || 'Untitled page',
    text: input.url.trim(),
    url: input.url.trim(),
    createdAt: new Date().toISOString(),
  };
  const entries = [...readFlouEntries(), entry];
  writeFlouEntries(entries);
  return entry;
}

export function addFlouNote(text: string): FlouEntry | null {
  const content = text.trim();
  if (!content) return null;
  const entry: FlouEntry = {
    id: createFlouId(),
    type: 'note',
    title: 'Note',
    text: content,
    url: '',
    createdAt: new Date().toISOString(),
  };
  const entries = [...readFlouEntries(), entry];
  writeFlouEntries(entries);
  return entry;
}

export function removeFlouEntry(id: string): void {
  const entries = readFlouEntries().filter(entry => entry.id !== id);
  writeFlouEntries(entries);
}

export function clearFlouEntries(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(FLOU_KEY);
  dispatchFlouUpdated();
}

export function subscribeToFlouUpdates(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(FLOU_UPDATED_EVENT, listener);
  return () => {
    window.removeEventListener(FLOU_UPDATED_EVENT, listener);
  };
}
