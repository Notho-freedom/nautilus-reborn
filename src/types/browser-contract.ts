// Re-export types needed by web components from the shared contract.
// The original shared/browser-contract.ts is not resolvable by Vite.

export type ImportBrowser = 'chrome' | 'edge' | 'brave' | 'firefox';
export type ImportDataset = 'history' | 'bookmarks';

export interface ExternalBrowserProfile {
  id: string;
  browser: ImportBrowser;
  name: string;
  profilePath: string;
  isDefault: boolean;
  availableDatasets: ImportDataset[];
}

export interface ImportedHistoryEntry {
  url: string;
  title: string;
  visitedAt: string;
  sourceBrowser: ImportBrowser;
  sourceProfileId: string;
}

export interface ImportedBookmarkEntry {
  url: string;
  title: string;
  folder: string;
  tags: string[];
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  sourceBrowser: ImportBrowser;
  sourceProfileId: string;
}

export interface ImportProfilesResult {
  profiles: ExternalBrowserProfile[];
  warnings: string[];
}

export interface ImportPreviewResult {
  profile: ExternalBrowserProfile | null;
  counts: Record<ImportDataset, number>;
  warnings: string[];
}

export interface ImportRunResult {
  profile: ExternalBrowserProfile | null;
  history: ImportedHistoryEntry[];
  bookmarks: ImportedBookmarkEntry[];
  counts: Record<ImportDataset, number>;
  warnings: string[];
}
