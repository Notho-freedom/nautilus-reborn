import { EventEmitter } from 'node:events';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const openPath = vi.hoisted(() => vi.fn());
const showItemInFolder = vi.hoisted(() => vi.fn());

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => process.cwd()),
  },
  shell: {
    openPath,
    showItemInFolder,
  },
}));

import { DownloadManager } from '../../electron/main/download-manager';

class FakeSession extends EventEmitter {
  constructor(public readonly partition: string) {
    super();
  }
}

class FakeDownloadItem extends EventEmitter {
  private savePath: string | null = null;
  private paused = false;
  private readonly filename: string;
  private readonly url: string;
  private totalBytes: number;
  private receivedBytes: number;

  constructor(filename: string, url: string, totalBytes = 2048, receivedBytes = 0) {
    super();
    this.filename = filename;
    this.url = url;
    this.totalBytes = totalBytes;
    this.receivedBytes = receivedBytes;
  }

  getFilename() {
    return this.filename;
  }

  getURL() {
    return this.url;
  }

  getTotalBytes() {
    return this.totalBytes;
  }

  getReceivedBytes() {
    return this.receivedBytes;
  }

  setSavePath(path: string) {
    this.savePath = path;
  }

  getAssignedSavePath() {
    return this.savePath;
  }

  isPaused() {
    return this.paused;
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }
}

describe('DownloadManager', () => {
  beforeEach(() => {
    openPath.mockClear();
    showItemInFolder.mockClear();
  });

  afterEach(() => {
    rmSync(join(process.cwd(), 'Notilus'), { recursive: true, force: true });
  });

  it('captures downloads from additional registered sessions', () => {
    const defaultSession = new FakeSession('default');
    const sharedSession = new FakeSession('persist:notilus-default');
    const snapshots: number[] = [];

    const manager = new DownloadManager(
      defaultSession as never,
      snapshot => {
        snapshots.push(snapshot.downloads.length);
      },
      false
    );

    manager.setup();
    manager.registerSession(sharedSession as never);
    manager.registerSession(sharedSession as never);

    expect(defaultSession.listenerCount('will-download')).toBe(1);
    expect(sharedSession.listenerCount('will-download')).toBe(1);

    const item = new FakeDownloadItem('installer.exe', 'https://example.com/installer.exe');
    sharedSession.emit('will-download', {}, item);

    const snapshot = manager.getSnapshot();
    expect(snapshot.downloads).toHaveLength(1);
    expect(snapshot.downloads[0]).toMatchObject({
      name: 'installer.exe',
      url: 'https://example.com/installer.exe',
      status: 'downloading',
      receivedBytes: 0,
      totalBytes: 2048,
    });
    expect(item.getAssignedSavePath()).toBe(join(process.cwd(), 'Notilus', 'installer.exe'));
    expect(snapshots.at(-1)).toBe(1);
  });
});
