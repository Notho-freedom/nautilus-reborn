import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { playBookmark } from '@/lib/sounds';
import { useBrowserState } from '@/hooks/useBrowserState';
import { useSystemMonitor } from '@/hooks/useSystemMonitor';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAuth } from '@/hooks/useAuth';
import { TopChromeBar } from './TopChromeBar';
import { NavigationBar } from './NavigationBar';
import { DevToolsSidebar } from './DevToolsSidebar';
import { SidebarPanel } from './SidebarPanel';
import { ContentArea } from './ContentArea';
import { AIAssistant } from './AIAssistant';
import { StatusBar } from './StatusBar';
import { DevToolsPanel } from './DevToolsPanel';
import { NotilusMiniDevToolsPanel } from './NotilusMiniDevToolsPanel';
import type { WebServiceItem } from './DevToolsSidebar';
import { getSettings, initializeSettings, subscribeToSettingsUpdates, updateSettings } from '@/lib/settings';
import {
  isBookmarked,
  subscribeToBookmarksUpdates,
  toggleBookmark,
} from '@/lib/bookmarks';
import { addFlouPage } from '@/lib/flou';
import { studioCaptureFullPage, studioCaptureViewport } from '@/lib/studio';
import {
  desktopSetViewportBounds,
  desktopSetRenderPolicy,
  desktopStudioGetWebviewViewport,
  onDesktopStudioWebviewViewportChanged,
} from '@/lib/electronBridge';
import { toast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { getGitSnapshot, subscribeToGitUpdates } from '@/lib/git';
import { useMosaicState } from '@/hooks/useMosaicState';
import { webSurfaceManagerApi } from '@/lib/webSurfaceManager';
import { addWorkspace, type WorkspaceTab } from '@/lib/workspaces';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function BrowserShell() {
  const browser = useBrowserState();
  const stats = useSystemMonitor();
  const auth = useAuth();
  const handledGitHubOAuthUrlRef = useRef(new Set<string>());
  const nativeAuthToastKeysRef = useRef(new Set<string>());
  const [activeWebService, setActiveWebService] = useState<WebServiceItem | null>(null);
  const [activeTabBookmarked, setActiveTabBookmarked] = useState(false);
  const [adBlockEnabled, setAdBlockEnabled] = useState(() => getSettings().adBlock);
  const [panelCloseOnOutsideClick, setPanelCloseOnOutsideClick] = useState(
    () => getSettings().panelCloseOnOutsideClick
  );
  const [isDockResizing, setIsDockResizing] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [notilusDevToolsOpen, setNotilusDevToolsOpen] = useState(false);
  const [notilusMiniDevToolsOpen, setNotilusMiniDevToolsOpen] = useState(false);
  const [notilusDevToolsDetached, setNotilusDevToolsDetached] = useState(false);
  const [notilusDevToolsHeight, setNotilusDevToolsHeight] = useState(250);
  const [workspaceDialogOpen, setWorkspaceDialogOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [gitBranch, setGitBranch] = useState(() => getGitSnapshot().branch);
  const mosaic = useMosaicState();
  const contentAreaRef = useRef<HTMLDivElement | null>(null);
  const sidebarPanelRef = useRef<HTMLDivElement | null>(null);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const [studioWebviewViewport, setStudioWebviewViewport] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const dockInset =
    browser.isDesktopMode && browser.isExternalActiveTab && browser.devToolsDockState.isOpen
      ? browser.devToolsDockState.width
      : 0;

  useEffect(() => {
    initializeSettings();
  }, []);

  useEffect(() => {
    const refreshSettingsState = () => {
      const settings = getSettings();
      setAdBlockEnabled(settings.adBlock);
      setPanelCloseOnOutsideClick(settings.panelCloseOnOutsideClick);
      if (browser.isDesktopMode) {
        void desktopSetRenderPolicy({
          profile: settings.renderingProfile,
          nativeSwapDelayMs: settings.nativeSwapDelayMinutes * 60_000,
          hibernateDelayMs: 0,
        });
      }
    };

    refreshSettingsState();
    return subscribeToSettingsUpdates(refreshSettingsState);
  }, [browser.isDesktopMode]);

  useEffect(() => {
    const refreshBookmarkState = () => {
      const activeUrl = browser.activeTab?.url ?? '';
      setActiveTabBookmarked(isBookmarked(activeUrl));
    };

    refreshBookmarkState();
    return subscribeToBookmarksUpdates(refreshBookmarkState);
  }, [browser.activeTab?.url]);

  useEffect(() => {
    const refresh = () => {
      const branch = getGitSnapshot().branch;
      setGitBranch(branch && branch !== '-' ? branch : '');
    };
    refresh();
    return subscribeToGitUpdates(refresh);
  }, []);

  useEffect(() => {
    if (!browser.isDesktopMode) return;
    let mounted = true;
    void desktopStudioGetWebviewViewport().then(payload => {
      if (!mounted) return;
      setStudioWebviewViewport(payload);
    });
    const unsubscribe = onDesktopStudioWebviewViewportChanged(payload => {
      if (!mounted) return;
      setStudioWebviewViewport(payload);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [browser.isDesktopMode]);

  useEffect(() => {
    if (!browser.isDesktopMode) return;

    if (browser.activeTab?.renderMode !== 'native') {
      void desktopSetViewportBounds({ x: 0, y: 0, width: 0, height: 0 });
      return;
    }

    const target = contentAreaRef.current;
    if (!target) return;

    const computeBounds = () => {
      const rect = target.getBoundingClientRect();
      let left = rect.left;
      let top = rect.top;
      let width = rect.width;
      let height = rect.height;

      if (browser.sidebarOpen && sidebarPanelRef.current) {
        const panelRect = sidebarPanelRef.current.getBoundingClientRect();
        const adjustedLeft = Math.max(left, panelRect.right);
        width = Math.max(0, rect.right - adjustedLeft);
        left = adjustedLeft;
      }

      if (notilusDevToolsOpen && !notilusDevToolsDetached) {
        height = Math.max(0, height - notilusDevToolsHeight);
      }

      if (studioWebviewViewport) {
        const desiredWidth = Math.min(width, studioWebviewViewport.width);
        const desiredHeight = Math.min(height, studioWebviewViewport.height);
        left = left + (width - desiredWidth) / 2;
        top = top + (height - desiredHeight) / 2;
        width = desiredWidth;
        height = desiredHeight;
      }

      void desktopSetViewportBounds({
        x: Math.round(left),
        y: Math.round(top),
        width: Math.round(width),
        height: Math.round(height),
      });
    };

    computeBounds();
    const observer = new ResizeObserver(computeBounds);
    observer.observe(target);
    window.addEventListener('resize', computeBounds);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', computeBounds);
    };
  }, [
    browser.isDesktopMode,
    browser.activeTab?.renderMode,
    browser.activeTabId,
    browser.sidebarOpen,
    browser.devToolsDockState.isOpen,
    browser.devToolsDockState.width,
    notilusDevToolsOpen,
    notilusDevToolsDetached,
    notilusDevToolsHeight,
    studioWebviewViewport?.width,
    studioWebviewViewport?.height,
  ]);

  const toggleDevToolsPanel = useCallback(() => {
    const externalDesktopMode = browser.isDesktopMode && browser.isExternalActiveTab;
    if (externalDesktopMode) {
      if (browser.devToolsDockState.isOpen) {
        browser.closeNativeDevTools();
      } else {
        browser.openNativeDevTools();
      }
      return;
    }
    browser.toggleDevTools();
  }, [
    browser.closeNativeDevTools,
    browser.devToolsDockState.isOpen,
    browser.openNativeDevTools,
    browser.isDesktopMode,
    browser.isExternalActiveTab,
    browser.toggleDevTools,
  ]);

  const closeNotilusDevTools = useCallback(() => {
    setNotilusDevToolsOpen(false);
  }, []);

  const closeMiniDevTools = useCallback(() => {
    setNotilusMiniDevToolsOpen(false);
  }, []);

  const toggleNotilusDevTools = useCallback(() => {
    if (notilusDevToolsDetached) {
      setNotilusMiniDevToolsOpen(prev => !prev);
      return;
    }
    setNotilusDevToolsOpen(prev => !prev);
  }, [notilusDevToolsDetached]);

  const handleDetachNotilusDevTools = useCallback(() => {
    setNotilusDevToolsDetached(true);
    setNotilusDevToolsOpen(false);
    setNotilusMiniDevToolsOpen(true);
  }, []);

  const handleAttachNotilusDevTools = useCallback(() => {
    setNotilusDevToolsDetached(false);
    setNotilusMiniDevToolsOpen(false);
    setNotilusDevToolsOpen(true);
  }, []);

  const shortcuts = useMemo(() => ({
    newTab: () => browser.addTab(),
    closeTab: () => browser.closeTab(browser.activeTabId),
    nextTab: browser.nextTab,
    prevTab: browser.prevTab,
    toggleDevTools: toggleDevToolsPanel,
    openHistory: () => browser.toggleSidebar('history'),
    openDownloads: () => browser.toggleSidebar('downloads'),
    openSettings: () => browser.toggleSidebar('settings'),
    focusUrlBar: () => {
      const el = document.querySelector<HTMLInputElement>('[data-url-input]');
      el?.focus();
    },
    addBookmark: () => {
      if (browser.activeTab) {
        const next = toggleBookmark(browser.activeTab.url, browser.activeTab.title);
        setActiveTabBookmarked(next);
      }
      browser.toggleSidebar('bookmarks');
    },
  }), [browser, toggleDevToolsPanel]);

  useKeyboardShortcuts(shortcuts);

  useEffect(() => {
    if (!browser.isDesktopMode || !browser.devToolsDockState.isOpen) return;
    if (!browser.isExternalActiveTab) {
      browser.closeNativeDevTools();
      return;
    }
    browser.openNativeDevTools();
  }, [
    browser.closeNativeDevTools,
    browser.devToolsDockState.isOpen,
    browser.openNativeDevTools,
    browser.isDesktopMode,
    browser.isExternalActiveTab,
  ]);

  const beginDockResize = useCallback((event: { preventDefault: () => void; clientX: number }) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = browser.devToolsDockState.width;
    setIsDockResizing(true);
    document.body.style.cursor = 'col-resize';

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX;
      browser.setDevToolsDockWidth(startWidth + delta);
    };

    const onMouseUp = () => {
      setIsDockResizing(false);
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [browser]);

  const handleSidebarToggle = (panel?: string) => {
    if (panel === 'devtools-panel') {
      toggleDevToolsPanel();
      return;
    }
    browser.toggleSidebar(panel);
  };

  const handleOpenWebPanel = (service: WebServiceItem) => {
    setActiveWebService(service);
    browser.setSidebarPanel('web-service');
    browser.setSidebarOpen(true);
  };

  const handleOpenWebPanelInTab = useCallback(
    (service: WebServiceItem) => {
      if (browser.isDesktopMode) {
        webSurfaceManagerApi.requestPanelToTabTransfer(service.id, service.url);
      }
      browser.addTab(service.url, service.label);
      browser.setSidebarOpen(false);
      browser.setSidebarPanel(null);
    },
    [browser]
  );

  const handleCloseSidebarPanel = () => {
    browser.setSidebarOpen(false);
    browser.setSidebarPanel(null);
  };

  useEffect(() => {
    if (!browser.isDesktopMode) return;
    if (browser.sidebarPanel !== 'web-service' || !browser.sidebarOpen || !activeWebService) return;
    const result = webSurfaceManagerApi.ensurePanelSurface(activeWebService.id, activeWebService.url);
    if (result.closeTabId) {
      browser.closeTab(result.closeTabId);
    }
  }, [
    browser.isDesktopMode,
    browser.sidebarOpen,
    browser.sidebarPanel,
    activeWebService?.id,
    activeWebService?.url,
    browser.closeTab,
  ]);

  useEffect(() => {
    if (!panelCloseOnOutsideClick || !browser.sidebarOpen) return;
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (sidebarPanelRef.current?.contains(target)) return;
      if (sidebarRef.current?.contains(target)) return;
      browser.setSidebarOpen(false);
      browser.setSidebarPanel(null);
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [panelCloseOnOutsideClick, browser.sidebarOpen, browser.setSidebarOpen, browser.setSidebarPanel]);

  const showCaptureToast = (filePath: string) => {
    toast({
      title: 'Capture saved',
      description: filePath,
      action: (
        <ToastAction
          altText="Copy path"
          onClick={() => {
            if (!navigator.clipboard) return;
            void navigator.clipboard.writeText(filePath);
          }}
        >
          Copy path
        </ToastAction>
      ),
    });
  };

  const handleSnapshotVisible = async () => {
    const capture = await studioCaptureViewport();
    if (!capture) {
      toast({
        title: 'Capture unavailable',
        description: 'Snapshot is available in desktop mode only.',
      });
      return;
    }
    showCaptureToast(capture.filePath);
  };

  const handleSnapshotFullPage = async () => {
    const capture = await studioCaptureFullPage();
    if (!capture) {
      toast({
        title: 'Capture unavailable',
        description: 'Full-page snapshot is available in desktop mode only.',
      });
      return;
    }
    showCaptureToast(capture.filePath);
  };

  const handleSendToFlou = () => {
    if (!browser.activeTab) return;
    addFlouPage({
      title: browser.activeTab.title,
      url: browser.activeTab.url,
    });
    browser.setSidebarPanel('flou');
    browser.setSidebarOpen(true);
    toast({
      title: 'Added to flou',
      description: browser.activeTab.title,
    });
  };

  const handleToggleAdBlock = () => {
    const next = updateSettings(current => ({ adBlock: !current.adBlock }));
    setAdBlockEnabled(next.adBlock);
  };

  const handleSignInWithGitHub = useCallback(() => {
    void auth.signInWithGitHub({
      openInNautilusTab: browser.isDesktopMode,
      openAuthInTab: url => {
        browser.addTab(url, 'GitHub Auth');
      },
    });
  }, [auth.signInWithGitHub, browser.addTab, browser.isDesktopMode]);

  useEffect(() => {
    if (!auth.isGitHubAuthFlowPending) {
      handledGitHubOAuthUrlRef.current.clear();
    }
  }, [auth.isGitHubAuthFlowPending]);

  useEffect(() => {
    for (const tab of browser.tabs) {
      if (tab.kind !== 'external') continue;
      if (tab.renderMode !== 'native' || tab.renderModeReason !== 'blocked') continue;

      const key = `${tab.id}|${tab.url}`;
      if (nativeAuthToastKeysRef.current.has(key)) continue;
      nativeAuthToastKeysRef.current.add(key);

      toast({
        title: 'Secure sign-in opened in native mode',
        description: 'Nautilus switched this tab to the native engine for a compatible sign-in flow.',
      });
    }
  }, [browser.tabs]);

  useEffect(() => {
    if (!browser.isDesktopMode || !auth.isGitHubAuthFlowPending) return;

    let cancelled = false;

    const processGitHubCallbackTabs = async () => {
      for (const tab of browser.tabs) {
        if (cancelled || tab.kind !== 'external') continue;
        const tabUrl = tab.url?.trim();
        if (!tabUrl) continue;

        const seenKey = `${tab.id}|${tabUrl}`;
        if (handledGitHubOAuthUrlRef.current.has(seenKey)) continue;
        handledGitHubOAuthUrlRef.current.add(seenKey);

        const result = await auth.completeGitHubOAuthFromUrl(tabUrl);
        if (cancelled || !result.handled) continue;

        if (result.success) {
          browser.closeTab(tab.id);
          toast({
            title: 'GitHub connected',
            description: auth.credentials.username
              ? `Connected as ${auth.credentials.username}`
              : 'Authentication successful.',
          });
        }
        return;
      }
    };

    void processGitHubCallbackTabs();

    return () => {
      cancelled = true;
    };
  }, [
    auth.completeGitHubOAuthFromUrl,
    auth.isGitHubAuthFlowPending,
    browser.closeTab,
    browser.isDesktopMode,
    browser.tabs,
    auth.credentials.username,
  ]);

  const handleOpenPanel = useCallback((panel: string) => {
    browser.toggleSidebar(panel);
  }, [browser]);

  const handleOpenUrlsInCurrentWindow = useCallback(
    (tabs: WorkspaceTab[]) => {
      browser.openUrlsInCurrentWindow(tabs);
    },
    [browser]
  );

  const handleOpenUrlsInNewWindow = useCallback(
    (tabs: WorkspaceTab[]) => {
      browser.openUrlsInNewWindow(tabs);
    },
    [browser]
  );

  const collectWorkspaceTabs = useCallback((): WorkspaceTab[] => {
    return browser.tabs
      .filter(tab => !tab.isPrivate)
      .map(tab => ({
        url: tab.url,
        title: tab.title,
        pinned: tab.isPinned,
      }));
  }, [browser.tabs]);

  const openSaveWorkspaceDialog = useCallback(() => {
    const defaultName = `Session ${new Date().toLocaleDateString()}`;
    setWorkspaceName(defaultName);
    setWorkspaceDialogOpen(true);
  }, []);

  const handleSaveWorkspace = useCallback(() => {
    const tabs = collectWorkspaceTabs();
    if (tabs.length === 0) {
      toast({
        title: 'No tabs to save',
        description: 'Open at least one non-private tab to create a workspace.',
      });
      return;
    }
    const created = addWorkspace(workspaceName || `Session ${new Date().toLocaleDateString()}`, tabs);
    if (created) {
      toast({
        title: 'Workspace saved',
        description: created.name,
      });
    }
    setWorkspaceDialogOpen(false);
  }, [collectWorkspaceTabs, workspaceName]);

  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
    if (browser.isDesktopMode) {
      webSurfaceManagerApi.setZoom(newZoom);
      return;
    }
    // In web mode apply CSS zoom
    if (!browser.isDesktopMode) {
      const contentEl = document.querySelector('[data-content-area]') as HTMLElement | null;
      if (contentEl) {
        (contentEl.style as any).zoom = `${newZoom / 100}`;
      }
    }
  }, [browser.isDesktopMode]);

  return (
    <div
      className="flex h-screen flex-col overflow-hidden bg-background"
      style={{ width: dockInset > 0 ? `calc(100vw - ${dockInset}px)` : '100vw' }}
    >
      <TopChromeBar
        tabs={browser.tabs}
        activeTabId={browser.activeTabId}
        onSelectTab={browser.setActiveTabId}
        onCloseTab={browser.closeTab}
        onAddTab={() => browser.addTab()}
        onAddPrivateTab={() => browser.addPrivateTab()}
        onDuplicateTab={(id) => {
          const tab = browser.tabs.find(t => t.id === id);
          if (tab) browser.addTab(tab.url, tab.title);
        }}
        onTogglePinTab={browser.togglePinTab}
        onReorderTabs={browser.reorderTabs}
        onMoveTabToIndex={browser.moveTabToIndex}
        recentlyClosedTabs={browser.recentlyClosedTabs}
        onReopenClosedTab={browser.reopenClosedTab}
        onClearClosedTabs={browser.clearClosedTabs}
        onSaveWorkspace={openSaveWorkspaceDialog}
      />
      <NavigationBar
        url={browser.activeTab?.url || ''}
        onNavigate={browser.navigateTo}
        onHome={() => browser.navigateTo('notilus://speed-dial')}
        onBack={browser.goBack}
        onForward={browser.goForward}
        onReload={browser.reload}
        canGoBack={browser.canGoBack}
        canGoForward={browser.canGoForward}
        isLoading={browser.isLoading}
        isBookmarked={activeTabBookmarked}
        onToggleBookmark={() => {
          if (!browser.activeTab) return;
          const nextState = toggleBookmark(browser.activeTab.url, browser.activeTab.title);
          playBookmark();
          setActiveTabBookmarked(nextState);
        }}
        onTogglePin={() => {
          if (!browser.activeTabId) return;
          browser.togglePinTab(browser.activeTabId);
        }}
        isPinned={browser.isPinned}
        onSnapshotVisible={handleSnapshotVisible}
        onSnapshotFullPage={handleSnapshotFullPage}
        onSendToFlou={handleSendToFlou}
        adBlockEnabled={adBlockEnabled}
        onToggleAdBlock={handleToggleAdBlock}
        onOpenDownloads={() => browser.toggleSidebar('downloads')}
        onOpenExtensions={() => browser.toggleSidebar('extensions')}
        onOpenSettings={() => browser.toggleSidebar('settings')}
        onToggleAI={browser.toggleAiPanel}
        isGitHubConnected={auth.isConnected}
        isGitHubOAuth={auth.isSupabaseGitHubSession}
        githubUsername={auth.credentials.username}
        githubAvatarUrl={auth.githubAvatarUrl}
        onOpenGitHub={() => browser.toggleSidebar('github')}
        onDisconnectGitHub={auth.disconnect}
        onSignInWithGitHub={handleSignInWithGitHub}
        openTabs={browser.tabs}
        activeTabId={browser.activeTabId}
        onSwitchToTab={browser.setActiveTabId}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <div ref={sidebarRef} className="relative z-40">
          <DevToolsSidebar
            isOpen={browser.sidebarOpen}
            activePanel={browser.sidebarPanel}
            onToggle={handleSidebarToggle}
            onOpenWebPanel={handleOpenWebPanel}
            activeWebServiceUrl={activeWebService?.url ?? null}
          />
        </div>
        <div
          className="absolute left-11 top-0 bottom-0 z-40"
          ref={sidebarPanelRef}
          style={{ pointerEvents: browser.sidebarOpen ? 'auto' : 'none' }}
        >
          <SidebarPanel
            panel={browser.sidebarPanel}
            stats={stats}
            webService={activeWebService}
            currentTabs={browser.tabs}
            onWidthChange={() => {}}
            onOpenWebServiceInTab={handleOpenWebPanelInTab}
            onClosePanel={handleCloseSidebarPanel}
            onNavigate={browser.navigateTo}
            onOpenPanel={handleOpenPanel}
            onCreateTab={browser.addTab}
            onOpenUrlsInCurrentWindow={handleOpenUrlsInCurrentWindow}
            onOpenUrlsInNewWindow={handleOpenUrlsInNewWindow}
            onSaveWorkspace={openSaveWorkspaceDialog}
            githubToken={auth.credentials.token}
            githubUsername={auth.credentials.username}
            isGitHubOAuth={auth.isSupabaseGitHubSession}
            onSaveGitHubCredentials={auth.saveCredentials}
            onSignInWithGitHub={handleSignInWithGitHub}
          />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {browser.isDesktopMode && browser.isExternalActiveTab && browser.devToolsDockState.isOpen && (
            <div
              onMouseDown={beginDockResize}
              className="absolute right-0 top-0 bottom-0 z-50 w-1 cursor-col-resize hover:bg-primary/30 transition-colors"
              data-testid="devtools-dock-splitter"
              style={{ backgroundColor: isDockResizing ? 'hsl(var(--primary) / 0.35)' : undefined }}
            />
          )}
          <div className="flex-1 flex overflow-hidden" data-content-area ref={contentAreaRef}>
            <ContentArea
              url={browser.activeTab?.url || 'notilus://speed-dial'}
              onNavigate={browser.navigateTo}
              isDesktopMode={browser.isDesktopMode}
              tabs={browser.tabs}
              activeTabId={browser.activeTabId}
              onSwitchToTab={browser.setActiveTabId}
              onCreateTab={browser.addTab}
              zoom={zoom}
              studioViewport={studioWebviewViewport}
              mosaicState={mosaic.state}
              mosaicRootTile={mosaic.activeWorkspace?.rootTile ?? null}
            />
          </div>
          {/* Notilus DevTools as overlay */}
          {notilusDevToolsOpen && !notilusDevToolsDetached && (
            <div className="absolute bottom-0 left-0 right-0 z-40">
              <DevToolsPanel
                isOpen={true}
                onClose={closeNotilusDevTools}
                height={notilusDevToolsHeight}
                onHeightChange={setNotilusDevToolsHeight}
                onDetach={handleDetachNotilusDevTools}
                onAttach={handleAttachNotilusDevTools}
                isDetached={notilusDevToolsDetached}
                onOpenSettings={() => browser.toggleSidebar('settings')}
              />
            </div>
          )}
          {/* Native DevTools panel (non-desktop internal) — also overlay */}
          {browser.devToolsOpen && !(browser.isDesktopMode && browser.isExternalActiveTab) && !notilusDevToolsOpen && (
            <div className="absolute bottom-0 left-0 right-0 z-40">
              <DevToolsPanel
                isOpen={true}
                onClose={toggleDevToolsPanel}
                height={browser.devToolsHeight}
                onHeightChange={browser.setDevToolsHeight}
                onOpenSettings={() => browser.toggleSidebar('settings')}
              />
            </div>
          )}
          <NotilusMiniDevToolsPanel
            isOpen={notilusMiniDevToolsOpen}
            onClose={closeMiniDevTools}
            onExpand={handleAttachNotilusDevTools}
            onOpenNative={toggleDevToolsPanel}
          />
        </div>
        <AIAssistant isOpen={browser.aiPanelOpen} onClose={browser.toggleAiPanel} />
      </div>

      <StatusBar
        stats={stats}
        tabCount={browser.tabs.length}
        activeTabUrl={browser.activeTab?.url || ''}
        gitBranch={gitBranch}
        zoom={zoom}
        onZoomChange={handleZoomChange}
        onOpenPanel={handleOpenPanel}
        onToggleNotilusDevTools={toggleNotilusDevTools}
      />

      <Dialog open={workspaceDialogOpen} onOpenChange={setWorkspaceDialogOpen}>
        <DialogContent className="sm:max-w-sm glass border-border">
          <DialogHeader>
            <DialogTitle className="text-sm font-display tracking-wider uppercase">
              Save workspace
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <input
              value={workspaceName}
              onChange={event => setWorkspaceName(event.target.value)}
              placeholder="Workspace name"
              className="w-full h-9 rounded-md bg-notilus-surface-1 border border-border px-3 text-sm font-body text-foreground outline-none focus:border-primary/50"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setWorkspaceDialogOpen(false)}
                className="h-8 px-3 rounded-md text-xs font-body text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveWorkspace}
                className="h-8 px-3 rounded-md text-xs font-body text-primary-foreground notilus-gradient"
              >
                Save
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
