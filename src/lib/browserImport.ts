import type {
  ImportPreviewRequest,
  ImportPreviewResult,
  ImportProfilesResult,
  ImportRunRequest,
  ImportRunResult,
} from '../../shared/browser-contract';
import {
  desktopListImportProfiles,
  desktopPreviewImport,
  desktopRunImport,
  isDesktopRuntime,
} from './electronBridge';

const DESKTOP_ONLY_WARNING = 'Browser import is available in desktop runtime only.';

export function isBrowserImportSupported(): boolean {
  return isDesktopRuntime();
}

export async function listBrowserImportProfiles(): Promise<ImportProfilesResult> {
  if (!isBrowserImportSupported()) {
    return {
      profiles: [],
      warnings: [DESKTOP_ONLY_WARNING],
    };
  }

  const response = await desktopListImportProfiles();
  if (!response) {
    return {
      profiles: [],
      warnings: ['Failed to list browser profiles.'],
    };
  }

  return response;
}

export async function previewBrowserImport(
  payload: ImportPreviewRequest
): Promise<ImportPreviewResult> {
  if (!isBrowserImportSupported()) {
    return {
      profile: null,
      counts: { history: 0, bookmarks: 0 },
      warnings: [DESKTOP_ONLY_WARNING],
    };
  }

  const response = await desktopPreviewImport(payload);
  if (!response) {
    return {
      profile: null,
      counts: { history: 0, bookmarks: 0 },
      warnings: ['Failed to preview browser import.'],
    };
  }

  return response;
}

export async function runBrowserImport(payload: ImportRunRequest): Promise<ImportRunResult> {
  if (!isBrowserImportSupported()) {
    return {
      profile: null,
      history: [],
      bookmarks: [],
      counts: { history: 0, bookmarks: 0 },
      warnings: [DESKTOP_ONLY_WARNING],
    };
  }

  const response = await desktopRunImport(payload);
  if (!response) {
    return {
      profile: null,
      history: [],
      bookmarks: [],
      counts: { history: 0, bookmarks: 0 },
      warnings: ['Failed to run browser import.'],
    };
  }

  return response;
}
