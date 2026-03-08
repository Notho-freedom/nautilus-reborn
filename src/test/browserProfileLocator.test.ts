import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { locateExternalBrowserProfiles } from '../../electron/main/browser-import/browser-profile-locator';

const ORIGINAL_LOCALAPPDATA = process.env.LOCALAPPDATA;
const ORIGINAL_APPDATA = process.env.APPDATA;

function createFile(path: string, content = 'x') {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, content, 'utf8');
}

describe('browser profile locator', () => {
  afterEach(() => {
    if (ORIGINAL_LOCALAPPDATA == null) {
      delete process.env.LOCALAPPDATA;
    } else {
      process.env.LOCALAPPDATA = ORIGINAL_LOCALAPPDATA;
    }

    if (ORIGINAL_APPDATA == null) {
      delete process.env.APPDATA;
    } else {
      process.env.APPDATA = ORIGINAL_APPDATA;
    }
  });

  const runOnWindows = process.platform === 'win32' ? it : it.skip;

  runOnWindows('detects installed profiles for chromium and firefox', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'notilus-import-locator-'));
    const localAppData = join(sandbox, 'Local');
    const appData = join(sandbox, 'Roaming');
    process.env.LOCALAPPDATA = localAppData;
    process.env.APPDATA = appData;

    createFile(join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'History'));
    createFile(join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'Bookmarks'), '{}');
    createFile(join(localAppData, 'Microsoft', 'Edge', 'User Data', 'Profile 1', 'History'));
    createFile(join(localAppData, 'BraveSoftware', 'Brave-Browser', 'User Data', 'Default', 'Bookmarks'), '{}');

    const firefoxRoot = join(appData, 'Mozilla', 'Firefox');
    const firefoxProfile = join(firefoxRoot, 'Profiles', 'abc.default-release');
    createFile(join(firefoxProfile, 'places.sqlite'));
    createFile(
      join(firefoxRoot, 'profiles.ini'),
      [
        '[Profile0]',
        'Name=default-release',
        'IsRelative=1',
        'Path=Profiles/abc.default-release',
        'Default=1',
      ].join('\n')
    );

    const result = locateExternalBrowserProfiles();

    expect(result.warnings).toEqual([]);
    expect(result.profiles.length).toBeGreaterThanOrEqual(4);
    expect(result.profiles.some(profile => profile.browser === 'chrome')).toBe(true);
    expect(result.profiles.some(profile => profile.browser === 'edge')).toBe(true);
    expect(result.profiles.some(profile => profile.browser === 'brave')).toBe(true);
    expect(result.profiles.some(profile => profile.browser === 'firefox')).toBe(true);

    const chromeProfile = result.profiles.find(profile => profile.browser === 'chrome');
    expect(chromeProfile?.availableDatasets).toEqual(
      expect.arrayContaining(['history', 'bookmarks'])
    );

    const firefoxDetected = result.profiles.find(profile => profile.browser === 'firefox');
    expect(firefoxDetected?.isDefault).toBe(true);
  });
});
