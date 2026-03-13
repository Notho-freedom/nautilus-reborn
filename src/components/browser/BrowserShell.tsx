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
  desktopStudioGetWebviewViewport,
  onDesktopStudioWebviewViewportChanged,
} from '@/lib/electronBridge';
import { toast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { getGitSnapshot, subscribeToGitUpdates } from '@/lib/git';
import { useMosaicState } from '@/hooks/useMosaicState';

export function BrowserShell() {
  const browser = useBrowserState();
  const stats = useSystemMonitor();
  const auth = useAuth();
  const handledGitHubOAuthUrlRef = useRef(new Set<string>());
  const [activeWebService, setActiveWebService] = useState<WebServiceItem | null>(null);
  const [activeTabBookmarked, setActiveTabBookmarked] = useState(false);
  const [adBlockEnabled, setAdBlockEnabled] = useState(() => getSettings().adBlock);
  const [isDockResizing, setIsDockResizing] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [notilusDevToolsOpen, setNotilusDevToolsOpen] = useState(false);
  const [notilusMiniDevToolsOpen, setNotilusMiniDevToolsOpen] = useState(false);
  const [notilusDevToolsDetached, setNotilusDevToolsDetached] = useState(false);
  const [notilusDevToolsHeight, setNotilusDevToolsHeight] = useState(250);
  const [gitBranch, setGitBranch] = useState(() => getGitSnapshot().branch);
  const mosaic = useMosaicState();
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
      setAdBlockEnabled(getSettings().adBlock);
    };

    refreshSettingsState();
    return subscribeToSettingsUpdates(refreshSettingsState);
  }, []);

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

  const handleOpenWebServiceInTab = (url: string, label: string) => {
    browser.addTab(url, label);
  };

  const handleCloseSidebarPanel = () => {
    browser.setSidebarOpen(false);
    browser.setSidebarPanel(null);
  };

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

  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
    if (browser.isDesktopMode) {
      const activeWebview = document.querySelector(
        'webview[data-active="true"]'
      ) as (HTMLElement & { setZoomFactor?: (factor: number) => void }) | null;
      activeWebview?.setZoomFactor?.(Math.max(0.25, Math.min(5, newZoom / 100)));
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
      />

      <div className="flex flex-1 overflow-hidden relative">
        <DevToolsSidebar
          isOpen={browser.sidebarOpen}
          activePanel={browser.sidebarPanel}
          onToggle={handleSidebarToggle}
          onOpenWebPanel={handleOpenWebPanel}
          activeWebServiceUrl={activeWebService?.url ?? null}
        />
        {browser.sidebarOpen && (
          <div className="absolute left-11 top-0 bottom-0 z-40">
            <SidebarPanel
              panel={browser.sidebarPanel}
              stats={stats}
              webService={activeWebService}
              onWidthChange={() => {}}
              onOpenWebServiceInTab={handleOpenWebServiceInTab}
              onClosePanel={handleCloseSidebarPanel}
              onNavigate={browser.navigateTo}
              onOpenPanel={handleOpenPanel}
              onCreateTab={browser.addTab}
              githubToken={auth.credentials.token}
              githubUsername={auth.credentials.username}
              isGitHubOAuth={auth.isSupabaseGitHubSession}
              onSaveGitHubCredentials={auth.saveCredentials}
              onSignInWithGitHub={handleSignInWithGitHub}
            />
          </div>
        )}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {browser.isDesktopMode && browser.isExternalActiveTab && browser.devToolsDockState.isOpen && (
            <div
              onMouseDown={beginDockResize}
              className="absolute right-0 top-0 bottom-0 z-50 w-1 cursor-col-resize hover:bg-primary/30 transition-colors"
              data-testid="devtools-dock-splitter"
              style={{ backgroundColor: isDockResizing ? 'hsl(var(--primary) / 0.35)' : undefined }}
            />
          )}
          <div className="flex-1 flex overflow-hidden" data-content-area>
            <ContentArea
              url={browser.activeTab?.url || 'notilus://speed-dial'}
              onNavigate={browser.navigateTo}
              isDesktopMode={browser.isDesktopMode}
              tabs={browser.tabs}
              activeTabId={browser.activeTabId}
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
    </div>
  );
}
