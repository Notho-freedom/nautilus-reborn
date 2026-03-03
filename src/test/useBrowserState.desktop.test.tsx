import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BrowserDesktopApi, BrowserSnapshot } from '../../shared/browser-contract';
import { useBrowserState } from '@/hooks/useBrowserState';

const initialSnapshot: BrowserSnapshot = {
  tabs: [
    {
      id: 'tab-desktop-1',
      title: 'example.com',
      url: 'https://example.com',
      kind: 'external',
      isLoading: false,
      canGoBack: true,
      canGoForward: false,
    },
  ],
  activeTabId: 'tab-desktop-1',
};

describe('useBrowserState desktop mode', () => {
  let bridge: BrowserDesktopApi;
  let stateListener: ((snapshot: BrowserSnapshot) => void) | null = null;

  beforeEach(() => {
    bridge = {
      getState: vi.fn().mockResolvedValue(initialSnapshot),
      createTab: vi.fn().mockResolvedValue(initialSnapshot),
      closeTab: vi.fn().mockResolvedValue(initialSnapshot),
      activateTab: vi.fn().mockResolvedValue(initialSnapshot),
      navigate: vi.fn().mockResolvedValue(initialSnapshot),
      goBack: vi.fn().mockResolvedValue(initialSnapshot),
      goForward: vi.fn().mockResolvedValue(initialSnapshot),
      reload: vi.fn().mockResolvedValue(initialSnapshot),
      openDevTools: vi.fn().mockResolvedValue(undefined),
      setViewportBounds: vi.fn().mockResolvedValue(undefined),
      minimizeWindow: vi.fn().mockResolvedValue(undefined),
      toggleMaximizeWindow: vi.fn().mockResolvedValue(undefined),
      closeWindow: vi.fn().mockResolvedValue(undefined),
      getWindowState: vi.fn().mockResolvedValue({ isMaximized: false }),
      getDownloads: vi.fn().mockResolvedValue({ downloads: [] }),
      pauseDownload: vi.fn().mockResolvedValue({ downloads: [] }),
      resumeDownload: vi.fn().mockResolvedValue({ downloads: [] }),
      cancelDownload: vi.fn().mockResolvedValue({ downloads: [] }),
      removeDownload: vi.fn().mockResolvedValue({ downloads: [] }),
      clearCompletedDownloads: vi.fn().mockResolvedValue({ downloads: [] }),
      openDownload: vi.fn().mockResolvedValue(undefined),
      showDownloadInFolder: vi.fn().mockResolvedValue(undefined),
      onStateChanged: vi.fn(listener => {
        stateListener = listener;
        return () => {
          stateListener = null;
        };
      }),
      onWindowStateChanged: vi.fn(() => () => {}),
      onDownloadsChanged: vi.fn(() => () => {}),
    };
    window.notilusDesktop = bridge;
  });

  afterEach(() => {
    delete window.notilusDesktop;
  });

  it('hydrates tabs from desktop snapshot and routes actions through IPC', async () => {
    const { result } = renderHook(() => useBrowserState());

    await waitFor(() => {
      expect(result.current.isDesktopMode).toBe(true);
      expect(result.current.activeTabId).toBe('tab-desktop-1');
    });

    expect(result.current.tabs[0]?.url).toBe('https://example.com');
    expect(result.current.canGoBack).toBe(true);
    expect(result.current.canGoForward).toBe(false);

    await act(async () => {
      result.current.navigateTo('https://react.dev');
    });

    expect(bridge.navigate).toHaveBeenCalledWith({
      tabId: 'tab-desktop-1',
      url: 'https://react.dev',
    });

    await act(async () => {
      result.current.setViewportBounds({ x: 5, y: 10, width: 600, height: 400 });
    });
    expect(bridge.setViewportBounds).toHaveBeenCalledWith({
      x: 5,
      y: 10,
      width: 600,
      height: 400,
    });
  });

  it('reacts to pushed state updates', async () => {
    const { result } = renderHook(() => useBrowserState());
    await waitFor(() => expect(result.current.activeTabId).toBe('tab-desktop-1'));

    const pushed: BrowserSnapshot = {
      tabs: [
        {
          id: 'tab-desktop-2',
          title: 'docs.electronjs.org',
          url: 'https://www.electronjs.org/docs/latest/',
          kind: 'external',
          isLoading: true,
          canGoBack: false,
          canGoForward: false,
        },
      ],
      activeTabId: 'tab-desktop-2',
    };

    await act(async () => {
      stateListener?.(pushed);
    });

    expect(result.current.activeTabId).toBe('tab-desktop-2');
    expect(result.current.isLoading).toBe(true);
    expect(result.current.tabs[0]?.title).toContain('docs.electronjs.org');
  });
});
