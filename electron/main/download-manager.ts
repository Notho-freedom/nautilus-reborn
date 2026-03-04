import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { app, shell, type DownloadItem, type Session } from 'electron';
import type {
  DownloadDescriptor,
  DownloadStatus,
  DownloadsSnapshot,
} from '../../shared/browser-contract';

interface ManagedDownload {
  descriptor: DownloadDescriptor;
  item: DownloadItem | null;
}

function uniqueDownloadId(sequence: number): string {
  return `download-${Date.now()}-${sequence}`;
}

function stateToStatus(state: 'completed' | 'cancelled' | 'interrupted'): DownloadStatus {
  if (state === 'completed') return 'completed';
  if (state === 'cancelled') return 'cancelled';
  return 'failed';
}

export class DownloadManager {
  private readonly downloads = new Map<string, ManagedDownload>();
  private readonly order: string[] = [];
  private sequence = 1;

  constructor(
    private readonly browserSession: Session,
    private readonly onStateChanged: (snapshot: DownloadsSnapshot) => void,
    private readonly debug: boolean
  ) {}

  setup() {
    this.browserSession.on('will-download', (_event, item) => {
      this.handleWillDownload(item);
    });
  }

  getSnapshot(): DownloadsSnapshot {
    return {
      downloads: this.order
        .map(id => this.downloads.get(id)?.descriptor)
        .filter((entry): entry is DownloadDescriptor => Boolean(entry))
        .map(entry => ({ ...entry })),
    };
  }

  pause(downloadId: string): DownloadsSnapshot {
    const managed = this.downloads.get(downloadId);
    if (managed?.item && !managed.item.isPaused()) {
      managed.item.pause();
      managed.descriptor.status = 'paused';
      this.log('pause', downloadId);
      this.notifyStateChanged();
    }
    return this.getSnapshot();
  }

  resume(downloadId: string): DownloadsSnapshot {
    const managed = this.downloads.get(downloadId);
    if (managed?.item && managed.item.isPaused()) {
      managed.item.resume();
      managed.descriptor.status = 'downloading';
      this.log('resume', downloadId);
      this.notifyStateChanged();
    }
    return this.getSnapshot();
  }

  cancel(downloadId: string): DownloadsSnapshot {
    const managed = this.downloads.get(downloadId);
    if (!managed) return this.getSnapshot();

    if (managed.item && !(managed.item as any).isDestroyed?.()) {
      managed.item.cancel();
    }
    managed.descriptor.status = 'cancelled';
    managed.descriptor.endedAt = new Date().toISOString();
    this.log('cancel', downloadId);
    this.notifyStateChanged();
    return this.getSnapshot();
  }

  remove(downloadId: string): DownloadsSnapshot {
    const managed = this.downloads.get(downloadId);
    if (!managed) return this.getSnapshot();

    if (managed.item && !(managed.item as any).isDestroyed?.()) {
      managed.item.cancel();
    }

    this.downloads.delete(downloadId);
    const index = this.order.indexOf(downloadId);
    if (index >= 0) {
      this.order.splice(index, 1);
    }

    this.log('remove', downloadId);
    this.notifyStateChanged();
    return this.getSnapshot();
  }

  clearCompleted(): DownloadsSnapshot {
    const completedIds = this.order.filter(id => {
      const status = this.downloads.get(id)?.descriptor.status;
      return status === 'completed' || status === 'failed' || status === 'cancelled';
    });

    for (const id of completedIds) {
      this.downloads.delete(id);
      const index = this.order.indexOf(id);
      if (index >= 0) {
        this.order.splice(index, 1);
      }
    }

    this.log('clear-completed', `${completedIds.length}`);
    this.notifyStateChanged();
    return this.getSnapshot();
  }

  async open(downloadId: string): Promise<void> {
    const descriptor = this.downloads.get(downloadId)?.descriptor;
    if (!descriptor?.filePath) return;
    await shell.openPath(descriptor.filePath);
    this.log('open', downloadId);
  }

  showInFolder(downloadId: string): void {
    const descriptor = this.downloads.get(downloadId)?.descriptor;
    if (!descriptor?.filePath) return;
    shell.showItemInFolder(descriptor.filePath);
    this.log('show-in-folder', downloadId);
  }

  private handleWillDownload(item: DownloadItem): void {
    const id = uniqueDownloadId(this.sequence++);
    const startedAt = new Date().toISOString();
    const savePath = this.resolveSavePath(item.getFilename());

    item.setSavePath(savePath);

    const descriptor: DownloadDescriptor = {
      id,
      name: item.getFilename(),
      url: item.getURL(),
      status: 'downloading',
      totalBytes: item.getTotalBytes() > 0 ? item.getTotalBytes() : null,
      receivedBytes: item.getReceivedBytes(),
      speedBytesPerSecond: null,
      filePath: savePath,
      startedAt,
      endedAt: null,
      error: null,
    };

    this.downloads.set(id, {
      descriptor,
      item,
    });
    this.order.unshift(id);
    this.notifyStateChanged();
    this.log('create', `${id} -> ${descriptor.url}`);

    let lastReceived = item.getReceivedBytes();
    let lastTimestamp = Date.now();

    item.on('updated', (_event, state) => {
      const managed = this.downloads.get(id);
      if (!managed) return;

      const now = Date.now();
      const received = item.getReceivedBytes();
      const elapsedSeconds = Math.max(0.001, (now - lastTimestamp) / 1000);
      const speed = Math.max(0, Math.floor((received - lastReceived) / elapsedSeconds));
      lastReceived = received;
      lastTimestamp = now;

      managed.descriptor.receivedBytes = received;
      managed.descriptor.totalBytes = item.getTotalBytes() > 0 ? item.getTotalBytes() : null;
      managed.descriptor.speedBytesPerSecond = speed || null;

      if (state === 'interrupted') {
        managed.descriptor.status = 'failed';
      } else {
        managed.descriptor.status = item.isPaused() ? 'paused' : 'downloading';
      }

      this.notifyStateChanged();
    });

    item.once('done', (_event, state) => {
      const managed = this.downloads.get(id);
      if (!managed) return;

      managed.descriptor.status = stateToStatus(state);
      managed.descriptor.endedAt = new Date().toISOString();
      managed.descriptor.receivedBytes = item.getReceivedBytes();
      managed.descriptor.totalBytes = item.getTotalBytes() > 0 ? item.getTotalBytes() : null;
      managed.descriptor.speedBytesPerSecond = null;
      managed.descriptor.error = state === 'interrupted' ? 'Download interrupted' : null;
      managed.item = null;

      this.log('done', `${id} -> ${state}`);
      this.notifyStateChanged();
    });
  }

  private resolveSavePath(filename: string): string {
    const baseDir = join(app.getPath('downloads'), 'Notilus');
    mkdirSync(baseDir, { recursive: true });
    const absolutePath = join(baseDir, filename);
    mkdirSync(dirname(absolutePath), { recursive: true });
    return absolutePath;
  }

  private notifyStateChanged(): void {
    this.onStateChanged(this.getSnapshot());
  }

  private log(event: string, message: string): void {
    if (!this.debug) return;
    console.info(`[download-manager] ${event} ${message}`);
  }
}
