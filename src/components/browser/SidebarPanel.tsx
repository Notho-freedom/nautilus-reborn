import { SystemMonitor } from './SystemMonitor';
import { TerminalPanel } from './TerminalPanel';
import { LighthousePanel } from './LighthousePanel';
import { SettingsPanel } from './SettingsPanel';
import { GitPanel } from './GitPanel';
import { ApiDocsPanel } from './ApiDocsPanel';
import { BookmarksPanel } from './BookmarksPanel';
import { HistoryPanel } from './HistoryPanel';
import { DownloadsPanel } from './DownloadsPanel';
import { WidgetsPanel } from './WidgetsPanel';
import { ExtensionsPanel } from './ExtensionsPanel';
import { DocumentationPanel } from './DocumentationPanel';
import { MosaicPanel } from './MosaicPanel';
import { UpdatesPanel } from './UpdatesPanel';
import { StudioPanel } from './StudioPanel';
import { GitHubReposPanel } from './GitHubReposPanel';
import { SystemStats } from '@/hooks/useSystemMonitor';
import { WebServicePanel } from './WebServicePanel';
import type { WebServiceItem } from './DevToolsSidebar';

interface SidebarPanelProps {
  panel: string | null;
  stats: SystemStats;
  webService: WebServiceItem | null;
  onOpenWebServiceInTab: (url: string, label: string) => void;
  onClosePanel: () => void;
  onNavigate: (url: string) => void;
}

type GenericPanelProps = {
  stats?: SystemStats;
  onNavigate?: (url: string) => void;
};

const PANEL_MAP: Record<string, React.ComponentType<GenericPanelProps>> = {
  monitor: SystemMonitor,
  terminal: TerminalPanel,
  lighthouse: LighthousePanel,
  settings: SettingsPanel,
  git: GitPanel,
  'api-docs': ApiDocsPanel,
  bookmarks: BookmarksPanel,
  history: HistoryPanel,
  downloads: DownloadsPanel,
  widgets: WidgetsPanel,
  extensions: ExtensionsPanel,
  docs: DocumentationPanel,
  mosaic: MosaicPanel,
  updates: UpdatesPanel,
  vscode: StudioPanel,
  github: GitHubReposPanel,
};

export function SidebarPanel({
  panel,
  stats,
  webService,
  onOpenWebServiceInTab,
  onClosePanel,
  onNavigate,
}: SidebarPanelProps) {
  if (!panel) return null;

  if (panel === 'web-service') {
    return (
      <div className="w-[420px] h-full border-r border-border bg-card overflow-hidden flex flex-col animate-slide-in-left">
        <WebServicePanel
          service={webService}
          onOpenInTab={onOpenWebServiceInTab}
          onClose={onClosePanel}
        />
      </div>
    );
  }

  const Component = PANEL_MAP[panel];
  const isBookmarksPanel = panel === 'bookmarks';
  const isHistoryPanel = panel === 'history';
  const isGitHubPanel = panel === 'github';

  return (
    <div className="w-64 h-full border-r border-border bg-card overflow-hidden flex flex-col animate-slide-in-left">
      {Component ? (
        panel === 'monitor' ? (
          <Component stats={stats} />
        ) : isBookmarksPanel || isHistoryPanel || isGitHubPanel ? (
          <Component onNavigate={onNavigate} />
        ) : (
          <Component />
        )
      ) : (
        <div className="p-3">
          <h3 className="text-xs font-display font-semibold text-primary uppercase tracking-widest mb-3">{panel}</h3>
          <p className="text-xs font-body text-muted-foreground">Panel content coming soon.</p>
        </div>
      )}
    </div>
  );
}
