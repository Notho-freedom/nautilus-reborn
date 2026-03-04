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
  private devToolsOpened = false;
  openDevTools = vi.fn((options?: unknown) => {
    this.devToolsOpened = true;
    this.emit('devtools-opened');
    return options;
  });
  inspectElement = vi.fn();

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

  closeDevTools() {
    this.devToolsOpened = false;
  }

  isDevToolsOpened() {
    return this.devToolsOpened;
  }
}

describe('TabManager webview devtools only', () => {
  beforeEach(() => {
    electronMocks.buildFromTemplate.mockClear();
    electronMocks.writeClipboard.mockClear();
    electronMocks.fromId.mockClear();
  });

  it('opens devtools on the guest webcontents in detach mode', () => {
    const manager = new TabManager({
      debug: false,
      onStateChanged: () => {},
    });
    manager.createTab('https://example.com');
    const tabId = manager.getSnapshot().activeTabId as string;
    const guest = new FakeWebContents(501, 'https://example.com');

    electronMocks.fromId.mockReturnValue(guest);
    manager.bindWebContents(tabId, guest.id);

    manager.openDevTools({ tabId });

    expect(guest.openDevTools).toHaveBeenCalledWith({ mode: 'detach', activate: true });
  });

  it('inspect element opens devtools then inspects selected node', () => {
    const manager = new TabManager({
      debug: false,
      onStateChanged: () => {},
    });
    manager.createTab('https://example.com');
    const tabId = manager.getSnapshot().activeTabId as string;
    const guest = new FakeWebContents(502, 'https://example.com');

    electronMocks.fromId.mockReturnValue(guest);
    manager.bindWebContents(tabId, guest.id);

    guest.emit('context-menu', {}, {
      x: 40,
      y: 72,
      isEditable: false,
      selectionText: '',
      linkURL: '',
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

    const template = electronMocks.buildFromTemplate.mock.calls[0]?.[0] as Array<{
      label?: string;
      click?: () => void;
    }>;
    const inspectItem = template.find(item => item.label === 'Inspect Element');

    expect(inspectItem).toBeDefined();
    inspectItem?.click?.();

    expect(guest.openDevTools).toHaveBeenCalledWith({ mode: 'detach', activate: true });
    expect(guest.inspectElement).toHaveBeenCalledWith(40, 72);
  });
});
