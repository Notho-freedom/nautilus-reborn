import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, normalize } from 'node:path';
import type {
  ExternalBrowserProfile,
  ImportBrowser,
  ImportDataset,
  ImportProfilesResult,
} from '../../../shared/browser-contract';

interface ChromiumBrowserRoot {
  browser: ImportBrowser;
  rootPath: string;
}

const CHROMIUM_IGNORED_PROFILE_NAMES = new Set(['Guest Profile', 'System Profile']);

function safeReadDir(path: string): string[] {
  try {
    return readdirSync(path);
  } catch {
    return [];
  }
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function buildProfileId(browser: ImportBrowser, profilePath: string): string {
  return `${browser}:${normalize(profilePath).toLowerCase()}`;
}

function detectDatasets(browser: ImportBrowser, profilePath: string): ImportDataset[] {
  if (browser === 'firefox') {
    if (existsSync(join(profilePath, 'places.sqlite'))) {
      return ['history', 'bookmarks'];
    }
    return [];
  }

  const datasets: ImportDataset[] = [];
  if (existsSync(join(profilePath, 'History'))) {
    datasets.push('history');
  }
  if (existsSync(join(profilePath, 'Bookmarks'))) {
    datasets.push('bookmarks');
  }
  return datasets;
}

function parseProfilesIni(content: string): Array<Record<string, string>> {
  const sections: Array<Record<string, string>> = [];
  const lines = content.split(/\r?\n/);
  let current: Record<string, string> | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith(';') || line.startsWith('#')) continue;

    if (line.startsWith('[') && line.endsWith(']')) {
      current = { __section: line.slice(1, -1).trim() };
      sections.push(current);
      continue;
    }

    const splitIndex = line.indexOf('=');
    if (splitIndex === -1 || !current) continue;

    const key = line.slice(0, splitIndex).trim();
    const value = line.slice(splitIndex + 1).trim();
    current[key] = value;
  }

  return sections;
}

function locateChromiumProfiles(browserRoot: ChromiumBrowserRoot): ExternalBrowserProfile[] {
  const { browser, rootPath } = browserRoot;
  if (!existsSync(rootPath)) return [];

  const candidates = safeReadDir(rootPath)
    .map(name => ({ name, profilePath: join(rootPath, name) }))
    .filter(({ profilePath }) => isDirectory(profilePath))
    .filter(({ name }) => !CHROMIUM_IGNORED_PROFILE_NAMES.has(name))
    .filter(({ profilePath }) => detectDatasets(browser, profilePath).length > 0);

  return candidates.map(({ name, profilePath }) => ({
    id: buildProfileId(browser, profilePath),
    browser,
    name,
    profilePath,
    isDefault: name === 'Default',
    availableDatasets: detectDatasets(browser, profilePath),
  }));
}

function locateFirefoxProfiles(appDataPath: string): ExternalBrowserProfile[] {
  const firefoxRoot = join(appDataPath, 'Mozilla', 'Firefox');
  const profilesIniPath = join(firefoxRoot, 'profiles.ini');
  const profiles: ExternalBrowserProfile[] = [];

  if (existsSync(profilesIniPath)) {
    try {
      const iniContent = readFileSync(profilesIniPath, 'utf8');
      const sections = parseProfilesIni(iniContent);

      for (const section of sections) {
        if (!section.__section?.startsWith('Profile')) continue;

        const relativePath = section.Path ?? '';
        if (!relativePath) continue;

        const isRelative = section.IsRelative === '1';
        const profilePath = isRelative
          ? join(dirname(profilesIniPath), relativePath)
          : relativePath;

        if (!isDirectory(profilePath)) continue;

        const availableDatasets = detectDatasets('firefox', profilePath);
        if (availableDatasets.length === 0) continue;

        profiles.push({
          id: buildProfileId('firefox', profilePath),
          browser: 'firefox',
          name: section.Name || basename(profilePath),
          profilePath,
          isDefault: section.Default === '1',
          availableDatasets,
        });
      }
    } catch {
      // Fall through to directory scan fallback.
    }
  }

  if (profiles.length > 0) {
    return profiles;
  }

  const fallbackRoot = join(firefoxRoot, 'Profiles');
  if (!existsSync(fallbackRoot)) return [];

  return safeReadDir(fallbackRoot)
    .map(name => ({ name, profilePath: join(fallbackRoot, name) }))
    .filter(({ profilePath }) => isDirectory(profilePath))
    .map(({ name, profilePath }) => ({
      id: buildProfileId('firefox', profilePath),
      browser: 'firefox' as const,
      name,
      profilePath,
      isDefault: name.toLowerCase().includes('default'),
      availableDatasets: detectDatasets('firefox', profilePath),
    }))
    .filter(profile => profile.availableDatasets.length > 0);
}

export function locateExternalBrowserProfiles(): ImportProfilesResult {
  if (process.platform !== 'win32') {
    return {
      profiles: [],
      warnings: ['Browser import is currently supported on Windows only.'],
    };
  }

  const localAppData = process.env.LOCALAPPDATA;
  const appData = process.env.APPDATA;
  const warnings: string[] = [];

  if (!localAppData) {
    warnings.push('LOCALAPPDATA is not defined. Chromium profiles could not be scanned.');
  }
  if (!appData) {
    warnings.push('APPDATA is not defined. Firefox profiles could not be scanned.');
  }

  const chromiumRoots: ChromiumBrowserRoot[] = [];
  if (localAppData) {
    chromiumRoots.push({
      browser: 'chrome',
      rootPath: join(localAppData, 'Google', 'Chrome', 'User Data'),
    });
    chromiumRoots.push({
      browser: 'edge',
      rootPath: join(localAppData, 'Microsoft', 'Edge', 'User Data'),
    });
    chromiumRoots.push({
      browser: 'brave',
      rootPath: join(localAppData, 'BraveSoftware', 'Brave-Browser', 'User Data'),
    });
  }

  const profiles = chromiumRoots.flatMap(locateChromiumProfiles);
  if (appData) {
    profiles.push(...locateFirefoxProfiles(appData));
  }

  const sorted = profiles.sort((a, b) => {
    if (a.browser !== b.browser) return a.browser.localeCompare(b.browser);
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return {
    profiles: sorted,
    warnings,
  };
}
