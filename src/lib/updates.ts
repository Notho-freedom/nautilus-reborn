export type UpdateCategory = 'feature' | 'fix' | 'improvement' | 'security';

export interface UpdateItem {
  id: string;
  title: string;
  description: string;
  category: UpdateCategory;
  date: string;
  source: 'github' | 'local';
}

export interface UpdatesSnapshot {
  currentVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean;
  checkedAt: string | null;
  items: UpdateItem[];
  error: string | null;
}

const UPDATES_KEY = 'notilus_updates_snapshot';

const CURRENT_VERSION = '2.0.0-beta';
const GITHUB_REPO = 'notilus/notilus-browser';

const FALLBACK_ITEMS: UpdateItem[] = [
  {
    id: 'local-webcontentsview',
    title: 'WebContentsView Multi-tab Rendering',
    description: 'Desktop tabs now render real Chromium content with one view per tab.',
    category: 'feature',
    date: '2026-03-04',
    source: 'local',
  },
  {
    id: 'local-bookmarks-settings',
    title: 'Persistent Settings and Bookmarks',
    description: 'Bookmarks, downloads and settings panels now use persistent services.',
    category: 'improvement',
    date: '2026-03-04',
    source: 'local',
  },
];

function parseVersion(version: string): number[] {
  return version
    .replace(/^v/i, '')
    .replace(/[^0-9.]/g, '')
    .split('.')
    .map(part => Number(part || 0));
}

function compareVersions(a: string, b: string): number {
  const av = parseVersion(a);
  const bv = parseVersion(b);
  const max = Math.max(av.length, bv.length, 3);
  for (let index = 0; index < max; index += 1) {
    const ai = av[index] ?? 0;
    const bi = bv[index] ?? 0;
    if (ai > bi) return 1;
    if (ai < bi) return -1;
  }
  return 0;
}

function inferCategory(text: string): UpdateCategory {
  const lower = text.toLowerCase();
  if (lower.includes('fix') || lower.includes('bug')) return 'fix';
  if (lower.includes('security') || lower.includes('vulnerability')) return 'security';
  if (lower.includes('improve') || lower.includes('perf') || lower.includes('optimi')) {
    return 'improvement';
  }
  return 'feature';
}

function parseGitHubBody(body: string | null | undefined): string {
  if (!body) return 'No release notes provided.';
  const line = body
    .split('\n')
    .map(item => item.trim())
    .find(item => item.length > 0);
  return line ?? 'No release notes provided.';
}

function readSnapshot(): UpdatesSnapshot {
  if (typeof window === 'undefined') {
    return {
      currentVersion: CURRENT_VERSION,
      latestVersion: null,
      updateAvailable: false,
      checkedAt: null,
      items: FALLBACK_ITEMS,
      error: null,
    };
  }

  const raw = window.localStorage.getItem(UPDATES_KEY);
  if (!raw) {
    return {
      currentVersion: CURRENT_VERSION,
      latestVersion: null,
      updateAvailable: false,
      checkedAt: null,
      items: FALLBACK_ITEMS,
      error: null,
    };
  }

  try {
    const parsed = JSON.parse(raw) as UpdatesSnapshot;
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid snapshot');
    }
    return {
      currentVersion: CURRENT_VERSION,
      latestVersion: parsed.latestVersion ?? null,
      updateAvailable: Boolean(parsed.updateAvailable),
      checkedAt: parsed.checkedAt ?? null,
      items: Array.isArray(parsed.items) ? parsed.items : FALLBACK_ITEMS,
      error: parsed.error ?? null,
    };
  } catch {
    return {
      currentVersion: CURRENT_VERSION,
      latestVersion: null,
      updateAvailable: false,
      checkedAt: null,
      items: FALLBACK_ITEMS,
      error: null,
    };
  }
}

function writeSnapshot(snapshot: UpdatesSnapshot) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(UPDATES_KEY, JSON.stringify(snapshot));
}

export function getUpdatesSnapshot(): UpdatesSnapshot {
  return readSnapshot();
}

export async function checkForUpdates(): Promise<UpdatesSnapshot> {
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=8`, {
      headers: {
        Accept: 'application/vnd.github+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API ${response.status}`);
    }

    const releases = (await response.json()) as Array<{
      id: number;
      tag_name: string;
      name: string | null;
      body: string | null;
      published_at: string;
      prerelease?: boolean;
    }>;

    const items: UpdateItem[] = releases.map(release => {
      const title = release.name?.trim() || release.tag_name;
      const description = parseGitHubBody(release.body);
      return {
        id: String(release.id),
        title,
        description,
        category: inferCategory(`${title} ${description}`),
        date: release.published_at,
        source: 'github',
      };
    });

    const latest = releases[0]?.tag_name ?? null;
    const updateAvailable = latest ? compareVersions(latest, CURRENT_VERSION) > 0 : false;

    const snapshot: UpdatesSnapshot = {
      currentVersion: CURRENT_VERSION,
      latestVersion: latest,
      updateAvailable,
      checkedAt: new Date().toISOString(),
      items: items.length > 0 ? items : FALLBACK_ITEMS,
      error: null,
    };

    writeSnapshot(snapshot);
    return snapshot;
  } catch (error) {
    const previous = readSnapshot();
    const snapshot: UpdatesSnapshot = {
      ...previous,
      checkedAt: new Date().toISOString(),
      items: previous.items.length > 0 ? previous.items : FALLBACK_ITEMS,
      error: error instanceof Error ? error.message : 'Unable to check for updates',
    };
    writeSnapshot(snapshot);
    return snapshot;
  }
}
