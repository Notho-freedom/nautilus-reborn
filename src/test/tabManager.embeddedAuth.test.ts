import { beforeEach, describe, expect, it, vi } from 'vitest';

type Listener = (...args: unknown[]) => void;

class MiniEmitter {
  private listeners = new Map<string, Listener[]>();

  on(event: string, listener: Listener) {
    const current = this.listeners.get(event) ?? [];
    current.push(listener);
    this.listeners.set(event, current);
    return this;
  }

  once(event: string, listener: Listener) {
    const wrapped: Listener = (...args) => {
      this.removeListener(event, wrapped);
      listener(...args);
    };
    return this.on(event, wrapped);
  }

  removeListener(event: string, listener: Listener) {
    const current = this.listeners.get(event) ?? [];
    this.listeners.set(
      event,
      current.filter(candidate => candidate !== listener)
    );
    return this;
  }

  emit(event: string, ...args: unknown[]) {
    for (const listener of this.listeners.get(event) ?? []) {
      listener(...args);
    }
    return true;
  }
}

var createdViews: Array<{ webContents: FakeNativeWebContents }> = [];

class FakeSession {
  setUserAgent = vi.fn();
  webRequest = {
    onBeforeSendHeaders: vi.fn(),
  };
}

class FakeNativeWebContents extends MiniEmitter {
  id = 500;
  currentUrl = 'about:blank';
  destroyed = false;
  session = new FakeSession();
  setUserAgent = vi.fn();
  loadURL = vi.fn(async (url: string) => {
    this.currentUrl = url;
  });
  setWindowOpenHandler = vi.fn();

  isDestroyed() {
    return this.destroyed;
  }

  getURL() {
    return this.currentUrl;
  }

  getTitle() {
    try {
      return new URL(this.currentUrl).hostname;
    } catch {
      return this.currentUrl;
    }
  }

  isLoading() {
    return false;
  }

  canGoBack() {
    return false;
  }

  canGoForward() {
    return false;
  }

  destroy() {
    this.destroyed = true;
    this.emit('destroyed');
  }
}

vi.mock('electron', () => {
  class FakeWebContentsView {
    webContents = new FakeNativeWebContents();

    constructor() {
      createdViews.push(this);
    }

    setVisible() {}

    setBounds() {}
  }

  return {
    app: { userAgentFallback: 'MockChromeUA' },
    Menu: {
      buildFromTemplate: vi.fn(() => ({ popup: vi.fn() })),
    },
    clipboard: {
      writeText: vi.fn(),
    },
    webContents: {
      fromId: vi.fn(),
    },
    WebContentsView: FakeWebContentsView,
  };
});

vi.mock('../../electron/main/user-agent-compat', () => ({
  ensureUserAgentCompatForSession: vi.fn(),
}));

import { TabManager } from '../../electron/main/tab-manager';

describe('TabManager embedded auth routing', () => {
  beforeEach(() => {
    createdViews = [];
  });

  it('starts Google auth tabs in native mode', () => {
    const manager = new TabManager({
      debug: false,
      getMainWindow: () => null,
      onStateChanged: () => {},
    });

    const snapshot = manager.createTab('https://accounts.google.com/signin/v2/identifier');
    const tab = snapshot.tabs[0];

    expect(tab?.renderMode).toBe('native');
    expect(tab?.renderModeReason).toBe('blocked');
  });

  it('switches to native mode when navigating into Google auth', () => {
    const manager = new TabManager({
      debug: false,
      getMainWindow: () => null,
      onStateChanged: () => {},
    });

    manager.createTab('https://example.com');
    const tabId = manager.getSnapshot().activeTabId as string;

    const snapshot = manager.navigate({
      tabId,
      url: 'https://accounts.google.com/o/oauth2/v2/auth',
    });
    const tab = snapshot.tabs[0];

    expect(tab?.renderMode).toBe('native');
    expect(tab?.renderModeReason).toBe('blocked');
  });

  it('returns blocked native tabs to webview after auth redirects away', () => {
    const manager = new TabManager({
      debug: false,
      getMainWindow: () => null,
      onStateChanged: () => {},
    });

    manager.createTab('https://accounts.google.com/signin/v2/identifier');
    const createdView = createdViews[0];
    expect(createdView).toBeDefined();

    createdView.webContents.currentUrl = 'https://mail.google.com/mail/u/0/#inbox';
    createdView.webContents.emit('did-navigate');

    const tab = manager.getSnapshot().tabs[0];
    expect(tab?.url).toBe('https://mail.google.com/mail/u/0/#inbox');
    expect(tab?.renderMode).toBe('webview');
    expect(tab?.renderModeReason).toBeUndefined();
  });
});
