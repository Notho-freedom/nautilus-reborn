import { useMemo } from 'react';
import { useBrowserState } from '@/hooks/useBrowserState';
import { useSystemMonitor } from '@/hooks/useSystemMonitor';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { TitleBar } from './TitleBar';
import { TabBar } from './TabBar';
import { NavigationBar } from './NavigationBar';
import { DevToolsSidebar } from './DevToolsSidebar';
import { SidebarPanel } from './SidebarPanel';
import { ContentArea } from './ContentArea';
import { AIAssistant } from './AIAssistant';
import { StatusBar } from './StatusBar';
import { DevToolsPanel } from './DevToolsPanel';

export function BrowserShell() {
  const browser = useBrowserState();
  const stats = useSystemMonitor();

  const shortcuts = useMemo(() => ({
    newTab: () => browser.addTab(),
    closeTab: () => browser.closeTab(browser.activeTabId),
    nextTab: browser.nextTab,
    prevTab: browser.prevTab,
    toggleDevTools: browser.toggleDevTools,
    openHistory: () => browser.toggleSidebar('history'),
    openDownloads: () => browser.toggleSidebar('downloads'),
    openSettings: () => browser.toggleSidebar('settings'),
    focusUrlBar: () => {
      const el = document.querySelector<HTMLInputElement>('[data-url-input]');
      el?.focus();
    },
    addBookmark: () => browser.toggleSidebar('bookmarks'),
  }), [browser]);

  useKeyboardShortcuts(shortcuts);

  const handleSidebarToggle = (panel?: string) => {
    if (panel === 'devtools-panel') {
      browser.toggleDevTools();
      return;
    }
    if (panel === 'home') {
      browser.navigateTo('notilus://speed-dial');
      return;
    }
    browser.toggleSidebar(panel);
  };

  const handleOpenUrl = (url: string) => {
    browser.addTab(url, new URL(url).hostname);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      <TitleBar />
      <TabBar
        tabs={browser.tabs}
        activeTabId={browser.activeTabId}
        onSelectTab={browser.setActiveTabId}
        onCloseTab={browser.closeTab}
        onAddTab={() => browser.addTab()}
        onDuplicateTab={(id) => {
          const tab = browser.tabs.find(t => t.id === id);
          if (tab) browser.addTab(tab.url, tab.title);
        }}
      />
      <NavigationBar
        url={browser.activeTab?.url || ''}
        onNavigate={browser.navigateTo}
        onHome={() => browser.navigateTo('notilus://speed-dial')}
        onToggleAI={browser.toggleAiPanel}
        adsBlocked={browser.adsBlocked}
      />

      <div className="flex flex-1 overflow-hidden">
        <DevToolsSidebar
          isOpen={browser.sidebarOpen}
          activePanel={browser.sidebarPanel}
          onToggle={handleSidebarToggle}
          onOpenUrl={handleOpenUrl}
        />
        {browser.sidebarOpen && (
          <SidebarPanel panel={browser.sidebarPanel} stats={stats} />
        )}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex overflow-hidden">
            <ContentArea
              url={browser.activeTab?.url || 'notilus://speed-dial'}
              onNavigate={browser.navigateTo}
            />
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
