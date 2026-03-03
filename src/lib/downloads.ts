import type { DownloadDescriptor, DownloadStatus } from '../../shared/browser-contract';
import {
  desktopCancelDownload,
  desktopClearCompletedDownloads,
  desktopGetDownloads,
  desktopOpenDownload,
  desktopPauseDownload,
  desktopRemoveDownload,
  desktopResumeDownload,
  desktopShowDownloadInFolder,
  isDesktopRuntime,
  onDesktopDownloadsChanged,
} from './electronBridge';

const DOWNLOADS_KEY = 'notilus_downloads';
const DOWNLOADS_UPDATED_EVENT = 'notilus:downloads-updated';

function isDownloadStatus(value: string): value is DownloadStatus {
  return (
    value === 'downloading' ||
    value === 'paused' ||
    value === 'completed' ||
    value === 'failed' ||
    value === 'cancelled'
  );
}

function isDownloadDescriptor(value: unknown): value is DownloadDescriptor {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<DownloadDescriptor>;
  return Boolean(
    typeof candidate.id === 'string' &&
      typeof candidate.name === 'string' &&
      typeof candidate.url === 'string' &&
      typeof candidate.status === 'string' &&
      isDownloadStatus(candidate.status) &&
      typeof candidate.receivedBytes === 'number' &&
      typeof candidate.startedAt === 'string'
  );
}

function parseDownloads(value: string | null): DownloadDescriptor[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isDownloadDescriptor)
      .map(item => ({
        ...item,
        totalBytes: typeof item.totalBytes === 'number' ? item.totalBytes : null,
        speedBytesPerSecond:
          typeof item.speedBytesPerSecond === 'number' ? item.speedBytesPerSecond : null,
        filePath: typeof item.filePath === 'string' ? item.filePath : null,
        endedAt: typeof item.endedAt === 'string' ? item.endedAt : null,
        error: typeof item.error === 'string' ? item.error : null,
      }))
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  } catch {
    return [];
  }
}

function dispatchDownloadsUpdated() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(DOWNLOADS_UPDATED_EVENT));
}

function writeDownloads(downloads: DownloadDescriptor[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(downloads));
  dispatchDownloadsUpdated();
}

function readDownloads(): DownloadDescriptor[] {
  if (typeof window === 'undefined') return [];
  return parseDownloads(window.localStorage.getItem(DOWNLOADS_KEY));
}

export function getDownloads(): DownloadDescriptor[] {
  return readDownloads();
}

export function subscribeToDownloadsUpdates(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(DOWNLOADS_UPDATED_EVENT, listener);
  return () => {
    window.removeEventListener(DOWNLOADS_UPDATED_EVENT, listener);
  };
}

export async function initializeDownloadsBridge(): Promise<() => void> {
  if (!isDesktopRuntime()) return () => {};

  const snapshot = await desktopGetDownloads();
  if (snapshot) {
    writeDownloads(snapshot.downloads);
  }

  return onDesktopDownloadsChanged(next => {
    writeDownloads(next.downloads);
  });
}

export async function pauseDownload(downloadId: string): Promise<void> {
  if (!isDesktopRuntime()) return;
  const snapshot = await desktopPauseDownload({ downloadId });
  if (snapshot) writeDownloads(snapshot.downloads);
}

export async function resumeDownload(downloadId: string): Promise<void> {
  if (!isDesktopRuntime()) return;
  const snapshot = await desktopResumeDownload({ downloadId });
  if (snapshot) writeDownloads(snapshot.downloads);
}

export async function cancelDownload(downloadId: string): Promise<void> {
  if (!isDesktopRuntime()) {
    const next = readDownloads().map(item =>
      item.id === downloadId
        ? {
            ...item,
            status: 'cancelled' as const,
            endedAt: new Date().toISOString(),
          }
        : item
    );
    writeDownloads(next);
    return;
  }
  const snapshot = await desktopCancelDownload({ downloadId });
  if (snapshot) writeDownloads(snapshot.downloads);
}

export async function removeDownload(downloadId: string): Promise<void> {
  if (!isDesktopRuntime()) {
    writeDownloads(readDownloads().filter(item => item.id !== downloadId));
    return;
  }
  const snapshot = await desktopRemoveDownload({ downloadId });
  if (snapshot) writeDownloads(snapshot.downloads);
}

export async function clearCompletedDownloads(): Promise<void> {
  if (!isDesktopRuntime()) {
    writeDownloads(
      readDownloads().filter(
        item =>
          item.status !== 'completed' &&
          item.status !== 'failed' &&
          item.status !== 'cancelled'
      )
    );
    return;
  }
  const snapshot = await desktopClearCompletedDownloads();
  if (snapshot) writeDownloads(snapshot.downloads);
}

export async function openDownload(downloadId: string): Promise<void> {
  if (!isDesktopRuntime()) return;
  await desktopOpenDownload({ downloadId });
}

export async function showDownloadInFolder(downloadId: string): Promise<void> {
  if (!isDesktopRuntime()) return;
  await desktopShowDownloadInFolder({ downloadId });
}
