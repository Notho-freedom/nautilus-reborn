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
      openTabsBatch: vi.fn().mockResolvedValue({
        createdTabIds: [],
        pinnedTabIds: [],
        activeTabId: initialSnapshot.activeTabId,
      }),
      openWindowWithTabs: vi.fn().mockResolvedValue(undefined),
      closeTab: vi.fn().mockResolvedValue(initialSnapshot),
      activateTab: vi.fn().mockResolvedValue(initialSnapshot),
      navigate: vi.fn().mockResolvedValue(initialSnapshot),
      goBack: vi.fn().mockResolvedValue(initialSnapshot),
      goForward: vi.fn().mockResolvedValue(initialSnapshot),
      reload: vi.fn().mockResolvedValue(initialSnapshot),
      openDevTools: vi.fn().mockResolvedValue(undefined),
      closeDevTools: vi.fn().mockResolvedValue(undefined),
      setDevToolsDockWidth: vi.fn().mockResolvedValue({
        isOpen: false,
        width: 560,
        minWidth: 360,
        maxWidth: 920,
      }),
      getDevToolsDockState: vi.fn().mockResolvedValue({
        isOpen: false,
        width: 560,
        minWidth: 360,
        maxWidth: 920,
      }),
      setPinnedTabs: vi.fn().mockResolvedValue(undefined),
      setRenderPolicy: vi.fn().mockResolvedValue(undefined),
      bindTabWebContents: vi.fn().mockResolvedValue(undefined),
      unbindTabWebContents: vi.fn().mockResolvedValue(undefined),
      updateTabRuntime: vi.fn().mockResolvedValue(initialSnapshot),
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
      getGitState: vi.fn().mockResolvedValue({
        repositoryPath: null,
        branch: '-',
        ahead: 0,
        behind: 0,
        staged: [],
        unstaged: [],
        recentCommits: [],
        updatedAt: new Date().toISOString(),
        error: null,
      }),
      refreshGitState: vi.fn().mockResolvedValue({
        repositoryPath: null,
        branch: '-',
        ahead: 0,
        behind: 0,
        staged: [],
        unstaged: [],
        recentCommits: [],
        updatedAt: new Date().toISOString(),
        error: null,
      }),
      commitGit: vi.fn().mockResolvedValue({
        repositoryPath: null,
        branch: '-',
        ahead: 0,
        behind: 0,
        staged: [],
        unstaged: [],
        recentCommits: [],
        updatedAt: new Date().toISOString(),
        error: null,
      }),
      stageGitFile: vi.fn().mockResolvedValue({
        repositoryPath: null,
        branch: '-',
        ahead: 0,
        behind: 0,
        staged: [],
        unstaged: [],
        recentCommits: [],
        updatedAt: new Date().toISOString(),
        error: null,
      }),
      unstageGitFile: vi.fn().mockResolvedValue({
        repositoryPath: null,
        branch: '-',
        ahead: 0,
        behind: 0,
        staged: [],
        unstaged: [],
        recentCommits: [],
        updatedAt: new Date().toISOString(),
        error: null,
      }),
      discardGitFile: vi.fn().mockResolvedValue({
        repositoryPath: null,
        branch: '-',
        ahead: 0,
        behind: 0,
        staged: [],
        unstaged: [],
        recentCommits: [],
        updatedAt: new Date().toISOString(),
        error: null,
      }),
      studioResizeWindow: vi.fn().mockResolvedValue(undefined),
      studioCaptureViewport: vi.fn().mockResolvedValue({
        filePath: 'C:/tmp/capture.png',
        capturedAt: new Date().toISOString(),
        mode: 'viewport',
      }),
      studioCaptureFullPage: vi.fn().mockResolvedValue({
        filePath: 'C:/tmp/capture-full.png',
        capturedAt: new Date().toISOString(),
        mode: 'fullpage',
      }),
      studioApplyCss: vi.fn().mockResolvedValue(undefined),
      studioClearCss: vi.fn().mockResolvedValue(undefined),
      studioRunScript: vi.fn().mockResolvedValue({ output: 'ok' }),
      studioStartRecording: vi.fn().mockResolvedValue({
        isRecording: true,
        startedAt: new Date().toISOString(),
        events: [],
      }),
      studioStopRecording: vi.fn().mockResolvedValue({
        isRecording: false,
        startedAt: new Date().toISOString(),
        events: [],
      }),
      studioGetRecording: vi.fn().mockResolvedValue({
        isRecording: false,
        startedAt: null,
        events: [],
      }),
      onStateChanged: vi.fn(listener => {
        stateListener = listener;
        return () => {
          stateListener = null;
        };
      }),
      onDevToolsDockStateChanged: vi.fn(() => () => {}),
      onWindowStateChanged: vi.fn(() => () => {}),
      onDownloadsChanged: vi.fn(() => () => {}),
      onGitStateChanged: vi.fn(() => () => {}),
      listImportProfiles: vi.fn().mockResolvedValue({
        profiles: [],
        warnings: [],
      }),
      previewImport: vi.fn().mockResolvedValue({
        profile: null,
        counts: { history: 0, bookmarks: 0 },
        warnings: [],
      }),
      runImport: vi.fn().mockResolvedValue({
        profile: null,
        history: [],
        bookmarks: [],
        counts: { history: 0, bookmarks: 0 },
        warnings: [],
      }),
      getBackendLabState: vi.fn().mockResolvedValue({
        isRunning: false, isStarting: false, isStopping: false, error: null,
        backendPath: null, healthUrl: '', port: 0, logs: [],
        lastHealthyAt: null, restartAttempts: 0,
      }),
      startBackendLab: vi.fn().mockResolvedValue({
        isRunning: false, isStarting: false, isStopping: false, error: null,
        backendPath: null, healthUrl: '', port: 0, logs: [],
        lastHealthyAt: null, restartAttempts: 0,
      }),
      stopBackendLab: vi.fn().mockResolvedValue({
        isRunning: false, isStarting: false, isStopping: false, error: null,
        backendPath: null, healthUrl: '', port: 0, logs: [],
        lastHealthyAt: null, restartAttempts: 0,
      }),
      restartBackendLab: vi.fn().mockResolvedValue({
        isRunning: false, isStarting: false, isStopping: false, error: null,
        backendPath: null, healthUrl: '', port: 0, logs: [],
        lastHealthyAt: null, restartAttempts: 0,
      }),
      enqueueBackendLabJob: vi.fn().mockResolvedValue({ jobId: 'test-job' }),
      getBackendLabJob: vi.fn().mockResolvedValue({ jobId: 'test-job', status: 'completed', result: null, error: null }),
      onBackendLabStateChanged: vi.fn(() => () => {}),
      getSystemMetrics: vi.fn().mockResolvedValue({
        cpu: 0, ram: 0, gpu: 0, gpuTemp: null,
        networkUp: 0, networkDown: 0, battery: null, batteryCharging: false,
      }),
      subscribeSystemMetrics: vi.fn().mockResolvedValue(undefined),
      unsubscribeSystemMetrics: vi.fn().mockResolvedValue(undefined),
      onSystemMetricsChanged: vi.fn(() => () => {}),
      studioSetWebviewViewport: vi.fn().mockResolvedValue(undefined),
      studioGetWebviewViewport: vi.fn().mockResolvedValue(null),
      onStudioWebviewViewportChanged: vi.fn(() => () => {}),
      openTerminalSession: vi.fn().mockResolvedValue({ sessionId: 'test-session' }),
      sendTerminalInput: vi.fn().mockResolvedValue(undefined),
      resizeTerminalSession: vi.fn().mockResolvedValue(undefined),
      closeTerminalSession: vi.fn().mockResolvedValue(undefined),
      onTerminalData: vi.fn(() => () => {}),
      onTerminalExit: vi.fn(() => () => {}),
      moveTab: vi.fn().mockResolvedValue(initialSnapshot),
      setTabRenderMode: vi.fn().mockResolvedValue(initialSnapshot),
      setViewportBounds: vi.fn().mockResolvedValue(undefined),
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
    expect(bridge.setPinnedTabs).toHaveBeenCalledWith({ tabIds: [] });

    await act(async () => {
      result.current.navigateTo('https://react.dev');
    });

    expect(bridge.navigate).toHaveBeenCalledWith({
      tabId: 'tab-desktop-1',
      url: 'https://react.dev',
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
          renderMode: 'native',
          renderModeReason: 'blocked',
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
    expect(result.current.tabs[0]?.renderModeReason).toBe('blocked');
  });
});
