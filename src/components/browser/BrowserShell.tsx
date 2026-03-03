import { useBrowserState } from '@/hooks/useBrowserState';
import { useSystemMonitor } from '@/hooks/useSystemMonitor';
import { TitleBar } from './TitleBar';
import { TabBar } from './TabBar';
import { NavigationBar } from './NavigationBar';
import { DevToolsSidebar } from './DevToolsSidebar';
import { SidebarPanel } from './SidebarPanel';
import { ContentArea } from './ContentArea';
import { AIAssistant } from './AIAssistant';
import { StatusBar } from './StatusBar';

export function BrowserShell() {
  const browser = useBrowserState();
  const stats = useSystemMonitor();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      <TitleBar />
      <TabBar
        tabs={browser.tabs}
        activeTabId={browser.activeTabId}
        onSelectTab={browser.setActiveTabId}
        onCloseTab={browser.closeTab}
        onAddTab={() => browser.addTab()}
      />
      <NavigationBar
        url={browser.activeTab?.url || ''}
        onNavigate={browser.navigateTo}
        onHome={() => browser.navigateTo('notilus://speed-dial')}
        onToggleAI={browser.toggleAiPanel}
      />

      {/* Main content area with sidebar */}
      <div className="flex flex-1 overflow-hidden">
        <DevToolsSidebar
          isOpen={browser.sidebarOpen}
          activePanel={browser.sidebarPanel}
          onToggle={browser.toggleSidebar}
        />
        {browser.sidebarOpen && (
          <SidebarPanel panel={browser.sidebarPanel} stats={stats} />
        )}
        <div className="flex-1 flex overflow-hidden">
          <ContentArea
            url={browser.activeTab?.url || 'notilus://speed-dial'}
            onNavigate={browser.navigateTo}
          />
        </div>
        <AIAssistant isOpen={browser.aiPanelOpen} onClose={browser.toggleAiPanel} />
      </div>

      <StatusBar stats={stats} tabCount={browser.tabs.length} />
    </div>
  );
}
