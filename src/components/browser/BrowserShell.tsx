import { useEffect, useMemo, useRef, useState } from 'react';
import { useBrowserState } from '@/hooks/useBrowserState';
import { useSystemMonitor } from '@/hooks/useSystemMonitor';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { TopChromeBar } from './TopChromeBar';
import { NavigationBar } from './NavigationBar';
import { DevToolsSidebar } from './DevToolsSidebar';
import { SidebarPanel } from './SidebarPanel';
import { ContentArea } from './ContentArea';
import { AIAssistant } from './AIAssistant';
import { StatusBar } from './StatusBar';
import { DevToolsPanel } from './DevToolsPanel';
import type { WebServiceItem } from './DevToolsSidebar';
import { useViewportOcclusion } from '@/hooks/useViewportOcclusion';
import { getSettings, initializeSettings, subscribeToSettingsUpdates, updateSettings } from '@/lib/settings';
import {
  isBookmarked,
  subscribeToBookmarksUpdates,
  toggleBookmark,
} from '@/lib/bookmarks';
import { addFlouPage } from '@/lib/flou';
import { studioCaptureFullPage, studioCaptureViewport } from '@/lib/studio';
import { toast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';

export function BrowserShell() {
  const browser = useBrowserState();
  const stats = useSystemMonitor();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [activeWebService, setActiveWebService] = useState<WebServiceItem | null>(null);
  const [activeTabBookmarked, setActiveTabBookmarked] = useState(false);
  const [adBlockEnabled, setAdBlockEnabled] = useState(() => getSettings().adBlock);
  const occlusionInsets = useViewportOcclusion({
    enabled: browser.isDesktopMode,
    viewportRef,
    baseInsets: {
      left: browser.sidebarOpen ? browser.sidebarPanelWidth : 0,
    },
  });

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

  const shortcuts = useMemo(() => ({
    newTab: () => browser.addTab(),
    closeTab: () => browser.closeTab(browser.activeTabId),
    nextTab: browser.nextTab,
    prevTab: browser.prevTab,
    toggleDevTools: browser.isDesktopMode ? browser.openNativeDevTools : browser.toggleDevTools,
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
  }), [browser]);

  useKeyboardShortcuts(shortcuts);

  useEffect(() => {
    browser.setViewportOcclusionInsets(occlusionInsets);
  }, [browser, occlusionInsets]);

  useEffect(() => {
    if (!browser.isDesktopMode) return;
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateBounds = () => {
      const rect = viewport.getBoundingClientRect();
      const insets = browser.viewportOcclusionInsets;
      browser.setViewportBounds({
        x: Math.round(rect.left + insets.left),
        y: Math.round(rect.top + insets.top),
        width: Math.max(0, Math.round(rect.width - insets.left - insets.right)),
        height: Math.max(0, Math.round(rect.height - insets.top - insets.bottom)),
      });
    };

    updateBounds();
    const observer = new ResizeObserver(updateBounds);
    observer.observe(viewport);
    window.addEventListener('resize', updateBounds);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateBounds);
    };
  }, [browser, browser.viewportOcclusionInsets]);

  const handleSidebarToggle = (panel?: string) => {
    if (panel === 'devtools-panel') {
      browser.toggleDevTools();
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

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      <TopChromeBar
        tabs={browser.tabs}
        activeTabId={browser.activeTabId}
        onSelectTab={browser.setActiveTabId}
        onCloseTab={browser.closeTab}
        onAddTab={() => browser.addTab()}
        onDuplicateTab={(id) => {
          const tab = browser.tabs.find(t => t.id === id);
          if (tab) browser.addTab(tab.url, tab.title);
        }}
        onTogglePinTab={browser.togglePinTab}
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
        onToggleAI={browser.toggleAiPanel}
      />

      <div className="flex flex-1 overflow-hidden">
        <DevToolsSidebar
          isOpen={browser.sidebarOpen}
          activePanel={browser.sidebarPanel}
          onToggle={handleSidebarToggle}
          onOpenWebPanel={handleOpenWebPanel}
          activeWebServiceUrl={activeWebService?.url ?? null}
        />
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div className="flex-1 flex overflow-hidden relative">
            <ContentArea
              url={browser.activeTab?.url || 'notilus://speed-dial'}
              onNavigate={browser.navigateTo}
              isDesktopMode={browser.isDesktopMode}
              viewportRef={viewportRef}
            />
            {browser.sidebarOpen && (
              <div className="absolute inset-y-0 left-0 z-[60]">
                <SidebarPanel
                  panel={browser.sidebarPanel}
                  stats={stats}
                  webService={activeWebService}
                  width={browser.sidebarPanelWidth}
                  onWidthChange={browser.setSidebarPanelWidth}
                  onOpenWebServiceInTab={handleOpenWebServiceInTab}
                  onClosePanel={handleCloseSidebarPanel}
                  onNavigate={browser.navigateTo}
                />
              </div>
            )}
          </div>
          <DevToolsPanel
            isOpen={browser.devToolsOpen}
            onClose={browser.toggleDevTools}
            height={browser.devToolsHeight}
            onHeightChange={browser.setDevToolsHeight}
          />
        </div>
        <AIAssistant isOpen={browser.aiPanelOpen} onClose={browser.toggleAiPanel} />
      </div>

      <StatusBar stats={stats} tabCount={browser.tabs.length} adsBlocked={browser.adsBlocked} />
    </div>
  );
}
