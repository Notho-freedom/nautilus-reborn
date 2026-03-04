import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addFlouNote,
  addFlouPage,
  clearFlouEntries,
  getFlouEntries,
  removeFlouEntry,
  subscribeToFlouUpdates,
} from '@/lib/flou';

describe('flou store', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('supports CRUD operations with local persistence', () => {
    expect(getFlouEntries()).toHaveLength(0);

    const page = addFlouPage({ title: 'React', url: 'https://react.dev' });
    const note = addFlouNote('Remember to check hydration');

    expect(page.type).toBe('page');
    expect(note?.type).toBe('note');
    expect(getFlouEntries()).toHaveLength(2);

    removeFlouEntry(page.id);
    const remaining = getFlouEntries();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.type).toBe('note');

    clearFlouEntries();
    expect(getFlouEntries()).toHaveLength(0);
  });

  it('notifies subscribers when entries change', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToFlouUpdates(listener);

    addFlouPage({ title: 'Docs', url: 'https://www.electronjs.org' });
    addFlouNote('Wire snapshot shortcuts');
    clearFlouEntries();

    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
  });
});
