import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const electronMocks = vi.hoisted(() => ({
  buildFromTemplate: vi.fn((template: unknown) => ({
    popup: vi.fn(),
    template,
  })),
  writeClipboard: vi.fn(),
  fromId: vi.fn(),
}));

vi.mock('electron', () => ({
  Menu: {
    buildFromTemplate: electronMocks.buildFromTemplate,
  },
  clipboard: {
    writeText: electronMocks.writeClipboard,
  },
  webContents: {
    fromId: electronMocks.fromId,
  },
}));

import { TabManager } from '../../electron/main/tab-manager';

class FakeWebContents extends EventEmitter {
  id: number;
  private currentUrl: string;

  constructor(id: number, url: string) {
    super();
    this.id = id;
    this.currentUrl = url;
  }

  isDestroyed() {
    return false;
  }

  getURL() {
    return this.currentUrl;
  }

  getTitle() {
    return 'example.com';
  }

  isLoading() {
    return false;
  }

  canGoBack() {
    return true;
  }

  canGoForward() {
    return false;
  }

  reload() {}

  goBack() {}

  goForward() {}

  openDevTools() {}

  isDevToolsOpened() {
    return false;
  }

  inspectElement() {}
}

describe('TabManager context-menu integration', () => {
  beforeEach(() => {
    electronMocks.buildFromTemplate.mockClear();
    electronMocks.writeClipboard.mockClear();
    electronMocks.fromId.mockClear();
  });

  it('adds standard context menu and opens clicked link in a new tab', () => {
    const manager = new TabManager({
      debug: false,
      onStateChanged: () => {},
    });
    manager.createTab('https://example.com');
    const tabId = manager.getSnapshot().activeTabId as string;
    const guest = new FakeWebContents(101, 'https://example.com');
    electronMocks.fromId.mockReturnValue(guest);

    manager.bindWebContents(tabId, guest.id);

    guest.emit('context-menu', {}, {
      x: 10,
      y: 20,
      isEditable: false,
      selectionText: '',
      linkURL: 'https://open.example/path',
      editFlags: {
        canUndo: false,
        canRedo: false,
        canCut: false,
        canCopy: false,
        canPaste: false,
        canDelete: false,
        canSelectAll: false,
      },
    });

    expect(electronMocks.buildFromTemplate).toHaveBeenCalledTimes(1);
    const template = electronMocks.buildFromTemplate.mock.calls[0]?.[0] as Array<{
      label?: string;
      click?: () => void;
    }>;
    const openInNewTab = template.find(item => item.label === 'Open Link in New Tab');
    expect(openInNewTab).toBeDefined();

    openInNewTab?.click?.();

    const snapshot = manager.getSnapshot();
    expect(snapshot.tabs.some(tab => tab.url === 'https://open.example/path')).toBe(true);
  });

  it('cleans up context-menu listener on unbind', () => {
    const manager = new TabManager({
      debug: false,
      onStateChanged: () => {},
    });
    manager.createTab('https://example.com');
    const tabId = manager.getSnapshot().activeTabId as string;
    const guest = new FakeWebContents(102, 'https://example.com');
    electronMocks.fromId.mockReturnValue(guest);

    manager.bindWebContents(tabId, guest.id);
    expect(guest.listenerCount('context-menu')).toBe(1);

    manager.unbindWebContents(tabId);
    expect(guest.listenerCount('context-menu')).toBe(0);
  });
});
