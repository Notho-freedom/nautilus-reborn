import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkForUpdates, getUpdatesSnapshot } from '@/lib/updates';

describe('updates service', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns fallback snapshot when no data exists', () => {
    const snapshot = getUpdatesSnapshot();
    expect(snapshot.items.length).toBeGreaterThan(0);
    expect(snapshot.currentVersion).toBeTruthy();
  });

  it('stores github releases on successful check', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 1,
          tag_name: 'v3.0.0',
          name: 'v3.0.0',
          body: 'feature release',
          published_at: '2026-03-01T10:00:00Z',
        },
      ],
    } as Response);

    const snapshot = await checkForUpdates();
    expect(snapshot.latestVersion).toBe('v3.0.0');
    expect(snapshot.items[0]?.source).toBe('github');
  });
});
