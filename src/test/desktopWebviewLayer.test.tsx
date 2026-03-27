import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DesktopWebviewLayer } from '@/components/browser/DesktopWebviewLayer';
import type { BrowserTab } from '@/hooks/useBrowserState';
import type { MosaicState } from '@/types/mosaic';

const externalTabA: BrowserTab = {
  id: 'tab-external-a',
  title: 'example.com',
  url: 'https://example.com',
  kind: 'external',
  isLoading: false,
  canGoBack: false,
  canGoForward: false,
};

const externalTabB: BrowserTab = {
  id: 'tab-external-b',
  title: 'react.dev',
  url: 'https://react.dev',
  kind: 'external',
  isLoading: false,
  canGoBack: false,
  canGoForward: false,
};

const internalTab: BrowserTab = {
  id: 'tab-internal',
  title: 'Speed Dial',
  url: 'notilus://speed-dial',
  kind: 'internal',
  isLoading: false,
  canGoBack: false,
  canGoForward: false,
};

const baseMosaicState: MosaicState = {
  isInitialized: true,
  isActive: false,
  isVisible: true,
  activeWorkspaceId: null,
  workspaces: [],
  hoveredTileId: null,
  focusedTileId: null,
  dragOverTileId: null,
  dragOverZone: null,
};

describe('DesktopWebviewLayer', () => {
  const bindTabWebContents = vi.fn().mockResolvedValue(undefined);
  const unbindTabWebContents = vi.fn().mockResolvedValue(undefined);
  const updateTabRuntime = vi.fn().mockResolvedValue(null);
  const setTabRenderMode = vi.fn().mockResolvedValue(null);
  const getWebviewElement = (tabId: string) =>
    screen.getByTestId(`desktop-webview-${tabId}`).querySelector('webview') as HTMLElement;

  beforeEach(() => {
    bindTabWebContents.mockClear();
    unbindTabWebContents.mockClear();
    updateTabRuntime.mockClear();
    setTabRenderMode.mockClear();
    window.notilusDesktop = {
      bindTabWebContents,
      unbindTabWebContents,
      updateTabRuntime,
      setTabRenderMode,
    } as any;
  });

  afterEach(() => {
    delete window.notilusDesktop;
  });

  it('renders one webview per external tab and marks active tab', () => {
    render(
      <DesktopWebviewLayer
        tabs={[externalTabA, externalTabB, internalTab]}
        activeTabId={externalTabA.id}
        onCreateTab={() => {}}
        zoom={100}
        studioViewport={null}
        mosaicState={baseMosaicState}
        mosaicRootTile={null}
      />
    );

    const first = screen.getByTestId(`desktop-webview-${externalTabA.id}`);
    const second = screen.getByTestId(`desktop-webview-${externalTabB.id}`);

    expect(first).toBeInTheDocument();
    expect(second).toBeInTheDocument();
    expect(screen.queryByTestId(`desktop-webview-${internalTab.id}`)).not.toBeInTheDocument();
    expect(first).toHaveAttribute('data-active', 'true');
    expect(second).toHaveAttribute('data-active', 'false');
  });

  it('binds webcontents and emits runtime updates on dom-ready', async () => {
    const onCreateTab = vi.fn();
    render(
      <DesktopWebviewLayer
        tabs={[externalTabA]}
        activeTabId={externalTabA.id}
        onCreateTab={onCreateTab}
        zoom={100}
        studioViewport={null}
        mosaicState={baseMosaicState}
        mosaicRootTile={null}
      />
    );

    const webview = getWebviewElement(externalTabA.id);
    webview.dispatchEvent(new Event('dom-ready'));
    webview.dispatchEvent(new Event('did-stop-loading'));

    await waitFor(() => {
      expect(bindTabWebContents).toHaveBeenCalledWith({
        tabId: externalTabA.id,
        webContentsId: 1,
      });
      expect(updateTabRuntime).toHaveBeenCalled();
    });

    webview.dispatchEvent(
      new CustomEvent('new-window', {
        detail: { url: 'https://new-tab.example' },
      })
    );
    expect(onCreateTab).toHaveBeenCalledWith('https://new-tab.example');
  });

  it('unbinds mapped webcontents on unmount', async () => {
    const tab = { ...externalTabA, id: 'tab-external-unmount' };
    const { unmount } = render(
      <DesktopWebviewLayer
        tabs={[tab]}
        activeTabId={tab.id}
        onCreateTab={() => {}}
        zoom={100}
        studioViewport={null}
        mosaicState={baseMosaicState}
        mosaicRootTile={null}
      />
    );

    getWebviewElement(tab.id).dispatchEvent(new Event('dom-ready'));
    await waitFor(() => {
      expect(bindTabWebContents).toHaveBeenCalledWith({
        tabId: tab.id,
        webContentsId: 1,
      });
    });

    unmount();

    await waitFor(() => {
      expect(unbindTabWebContents).toHaveBeenCalled();
    });
  });

  it('does not call loadURL when only active tab changes', async () => {
    const loadSpy = vi.spyOn(
      HTMLElement.prototype as { loadURL: (url: string) => Promise<void> },
      'loadURL'
    );
    const { rerender } = render(
      <DesktopWebviewLayer
        tabs={[externalTabA, externalTabB]}
        activeTabId={externalTabA.id}
        onCreateTab={() => {}}
        zoom={100}
        studioViewport={null}
        mosaicState={baseMosaicState}
        mosaicRootTile={null}
      />
    );

    const first = getWebviewElement(externalTabA.id);
    const second = getWebviewElement(externalTabB.id);
    first.dispatchEvent(new Event('dom-ready'));
    second.dispatchEvent(new Event('dom-ready'));

    const baselineCalls = loadSpy.mock.calls.length;

    rerender(
      <DesktopWebviewLayer
        tabs={[externalTabA, externalTabB]}
        activeTabId={externalTabB.id}
        onCreateTab={() => {}}
        zoom={100}
        studioViewport={null}
        mosaicState={baseMosaicState}
        mosaicRootTile={null}
      />
    );

    expect(loadSpy.mock.calls.length).toBe(baselineCalls);
    loadSpy.mockRestore();
  });

  it('keeps initial src stable and uses loadURL only when tab url changes', async () => {
    const tab = { ...externalTabA, id: 'tab-external-src' };
    const loadSpy = vi.spyOn(
      HTMLElement.prototype as { loadURL: (url: string) => Promise<void> },
      'loadURL'
    );
    const updatedTabA: BrowserTab = {
      ...tab,
      url: 'https://example.com/docs',
    };

    const { rerender } = render(
      <DesktopWebviewLayer
        tabs={[tab]}
        activeTabId={tab.id}
        onCreateTab={() => {}}
        zoom={100}
        studioViewport={null}
        mosaicState={baseMosaicState}
        mosaicRootTile={null}
      />
    );

    const webview = getWebviewElement(tab.id);
    await waitFor(() => {
      expect(webview.src).toBe('https://example.com');
    });
    webview.setAttribute('src', 'https://example.com');
    webview.dispatchEvent(new Event('dom-ready'));

    rerender(
      <DesktopWebviewLayer
        tabs={[updatedTabA]}
        activeTabId={updatedTabA.id}
        onCreateTab={() => {}}
        zoom={100}
        studioViewport={null}
        mosaicState={baseMosaicState}
        mosaicRootTile={null}
      />
    );

    await waitFor(() => {
      expect(loadSpy).toHaveBeenCalledWith('https://example.com/docs');
    });
    expect(webview.getAttribute('src')).toBe('https://example.com/docs');
    loadSpy.mockRestore();
  });

  it('switches to native mode when navigation enters Google auth', async () => {
    const tab = { ...externalTabA, id: 'tab-external-google-auth' };
    render(
      <DesktopWebviewLayer
        tabs={[tab]}
        activeTabId={tab.id}
        onCreateTab={() => {}}
        zoom={100}
        studioViewport={null}
        mosaicState={baseMosaicState}
        mosaicRootTile={null}
      />
    );

    const webview = getWebviewElement(tab.id);
    webview.dispatchEvent(new Event('dom-ready'));
    updateTabRuntime.mockClear();

    webview.setAttribute('src', 'https://accounts.google.com/signin/v2/identifier');
    webview.dispatchEvent(new Event('did-navigate'));
    webview.dispatchEvent(new Event('did-navigate'));

    await waitFor(() => {
        expect(updateTabRuntime).toHaveBeenCalledWith(
          expect.objectContaining({
            tabId: tab.id,
            url: 'https://accounts.google.com/signin/v2/identifier',
          })
        );
        expect(setTabRenderMode).toHaveBeenCalledWith({
          tabId: tab.id,
          mode: 'native',
          reason: 'blocked',
        });
    });

    expect(setTabRenderMode).toHaveBeenCalledTimes(1);
  });

  it('falls back to native mode when the webview load is blocked', async () => {
    const tab = { ...externalTabA, id: 'tab-external-blocked-load' };
    render(
      <DesktopWebviewLayer
        tabs={[tab]}
        activeTabId={tab.id}
        onCreateTab={() => {}}
        zoom={100}
        studioViewport={null}
        mosaicState={baseMosaicState}
        mosaicRootTile={null}
      />
    );

    const webview = getWebviewElement(tab.id);
    webview.dispatchEvent(new Event('dom-ready'));
    setTabRenderMode.mockClear();

    const failLoadEvent = new Event('did-fail-load') as Event & {
      errorDescription?: string;
      isMainFrame?: boolean;
    };
    failLoadEvent.errorDescription = 'ERR_BLOCKED_BY_RESPONSE';
    failLoadEvent.isMainFrame = true;
    webview.dispatchEvent(failLoadEvent);

    await waitFor(() => {
      expect(setTabRenderMode).toHaveBeenCalledWith({
        tabId: tab.id,
        mode: 'native',
        reason: 'blocked',
      });
    });
  });
});
