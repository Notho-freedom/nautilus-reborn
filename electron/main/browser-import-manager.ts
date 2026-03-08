import type {
  ExternalBrowserProfile,
  ImportDataset,
  ImportPreviewRequest,
  ImportPreviewResult,
  ImportProfilesResult,
  ImportRunRequest,
  ImportRunResult,
  ImportedBookmarkEntry,
  ImportedHistoryEntry,
} from '../../shared/browser-contract';
import { locateExternalBrowserProfiles } from './browser-import/browser-profile-locator';
import {
  parseChromiumBookmarks,
  parseChromiumHistory,
} from './browser-import/parsers/chromium-import-parser';
import {
  parseFirefoxBookmarks,
  parseFirefoxHistory,
} from './browser-import/parsers/firefox-import-parser';
import { withTimeout } from './browser-import/parsers/import-parser-utils';

const DATASET_TIMEOUT_MS = 15_000;

interface BrowserImportManagerOptions {
  debug: boolean;
}

export class BrowserImportManager {
  constructor(private readonly options: BrowserImportManagerOptions) {}

  listProfiles(): ImportProfilesResult {
    const result = locateExternalBrowserProfiles();
    this.log('listProfiles', {
      profileCount: result.profiles.length,
      warningCount: result.warnings.length,
    });
    return result;
  }

  async previewImport(payload: ImportPreviewRequest): Promise<ImportPreviewResult> {
    const profilesResult = this.listProfiles();
    const profile = profilesResult.profiles.find(candidate => candidate.id === payload.profileId) ?? null;

    if (!profile) {
      return {
        profile: null,
        counts: { history: 0, bookmarks: 0 },
        warnings: [
          ...profilesResult.warnings,
          `Selected profile was not found: ${payload.profileId}`,
        ],
      };
    }

    const extraction = await this.extractDatasets(profile, payload.datasets);
    return {
      profile,
      counts: {
        history: extraction.history.length,
        bookmarks: extraction.bookmarks.length,
      },
      warnings: [...profilesResult.warnings, ...extraction.warnings],
    };
  }

  async runImport(payload: ImportRunRequest): Promise<ImportRunResult> {
    const profilesResult = this.listProfiles();
    const profile = profilesResult.profiles.find(candidate => candidate.id === payload.profileId) ?? null;

    if (!profile) {
      return {
        profile: null,
        history: [],
        bookmarks: [],
        counts: { history: 0, bookmarks: 0 },
        warnings: [
          ...profilesResult.warnings,
          `Selected profile was not found: ${payload.profileId}`,
        ],
      };
    }

    const extraction = await this.extractDatasets(profile, payload.datasets);
    return {
      profile,
      history: extraction.history,
      bookmarks: extraction.bookmarks,
      counts: {
        history: extraction.history.length,
        bookmarks: extraction.bookmarks.length,
      },
      warnings: [...profilesResult.warnings, ...extraction.warnings],
    };
  }

  private async extractDatasets(profile: ExternalBrowserProfile, datasets: ImportDataset[]): Promise<{
    history: ImportedHistoryEntry[];
    bookmarks: ImportedBookmarkEntry[];
    warnings: string[];
  }> {
    const requested = this.normalizeRequestedDatasets(profile, datasets);
    const warnings: string[] = [];
    let history: ImportedHistoryEntry[] = [];
    let bookmarks: ImportedBookmarkEntry[] = [];

    if (requested.includes('history')) {
      try {
        history = await withTimeout(
          this.extractHistory(profile),
          DATASET_TIMEOUT_MS,
          `History extraction timed out for profile ${profile.name}`
        );
      } catch (error) {
        warnings.push(`History extraction failed for ${profile.name}: ${String(error)}`);
      }
    }

    if (requested.includes('bookmarks')) {
      try {
        bookmarks = await withTimeout(
          this.extractBookmarks(profile),
          DATASET_TIMEOUT_MS,
          `Bookmarks extraction timed out for profile ${profile.name}`
        );
      } catch (error) {
        warnings.push(`Bookmarks extraction failed for ${profile.name}: ${String(error)}`);
      }
    }

    return {
      history,
      bookmarks,
      warnings,
    };
  }

  private normalizeRequestedDatasets(
    profile: ExternalBrowserProfile,
    datasets: ImportDataset[]
  ): ImportDataset[] {
    const requested = datasets.length > 0 ? datasets : profile.availableDatasets;
    const unique = Array.from(new Set(requested));
    return unique.filter(dataset => profile.availableDatasets.includes(dataset));
  }

  private async extractHistory(profile: ExternalBrowserProfile): Promise<ImportedHistoryEntry[]> {
    if (profile.browser === 'firefox') {
      return parseFirefoxHistory(profile.profilePath, profile.id);
    }

    return parseChromiumHistory(profile.profilePath, profile.browser, profile.id);
  }

  private async extractBookmarks(profile: ExternalBrowserProfile): Promise<ImportedBookmarkEntry[]> {
    if (profile.browser === 'firefox') {
      return parseFirefoxBookmarks(profile.profilePath, profile.id);
    }

    return parseChromiumBookmarks(profile.profilePath, profile.browser, profile.id);
  }

  private log(action: string, payload?: unknown): void {
    if (!this.options.debug) return;
    const serialized = payload ? JSON.stringify(payload) : '';
    console.info(`[browser-import] ${action} ${serialized}`);
  }
}
