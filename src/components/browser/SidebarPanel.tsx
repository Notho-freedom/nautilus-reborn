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
import { FlouPanel } from './FlouPanel';
import { SystemStats } from '@/hooks/useSystemMonitor';
import { WebServicePanel } from './WebServicePanel';
import type { WebServiceItem } from './DevToolsSidebar';
import { SidePanelShell } from './panels/SidePanelShell';
import { getPanelDefaultWidth } from '@/lib/panelLayout';

interface SidebarPanelProps {
  panel: string | null;
  stats: SystemStats;
  webService: WebServiceItem | null;
  width: number;
  onWidthChange: (width: number) => void;
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
  flou: FlouPanel,
};

const PANEL_TITLES: Record<string, string> = {
  monitor: 'System Monitor',
  terminal: 'Terminal',
  lighthouse: 'Lighthouse',
  settings: 'Settings',
  git: 'Git',
  'api-docs': 'API Docs',
  bookmarks: 'Favorites',
  history: 'History',
  downloads: 'Downloads',
  widgets: 'Widgets',
  extensions: 'Extensions',
  docs: 'Documentation',
  mosaic: 'Mosaic',
  updates: 'Updates',
  vscode: 'Studio',
  github: 'GitHub',
  flou: 'Flou',
  'web-service': 'Web Service',
};

export function SidebarPanel({
  panel,
  stats,
  webService,
  width,
  onWidthChange,
  onOpenWebServiceInTab,
  onClosePanel,
  onNavigate,
}: SidebarPanelProps) {
  if (!panel) return null;

  const title = PANEL_TITLES[panel] ?? panel;

  if (panel === 'web-service') {
    return (
      <SidePanelShell
        panelId={panel}
        title={webService?.label ?? title}
        subtitle={webService?.url}
        width={width || getPanelDefaultWidth(panel)}
        minWidth={280}
        maxWidth={700}
        onClose={onClosePanel}
        onWidthChange={onWidthChange}
        quickActions={
          webService
            ? [
                {
                  id: 'open-tab',
                  label: 'Transfer to tab',
                  onClick: () => onOpenWebServiceInTab(webService.url, webService.label),
                },
              ]
            : undefined
        }
      >
        <WebServicePanel
          service={webService}
          onOpenInTab={onOpenWebServiceInTab}
          onClose={onClosePanel}
        />
      </SidePanelShell>
    );
  }

  const Component = PANEL_MAP[panel];
  const isBookmarksPanel = panel === 'bookmarks';
  const isHistoryPanel = panel === 'history';
  const isGitHubPanel = panel === 'github';
  const isFlouPanel = panel === 'flou';

  return (
    <SidePanelShell
      panelId={panel}
      title={title}
      width={width || getPanelDefaultWidth(panel)}
      minWidth={260}
      maxWidth={720}
      onClose={onClosePanel}
      onWidthChange={onWidthChange}
      quickActions={[
        {
          id: 'close',
          label: 'Close panel',
          onClick: onClosePanel,
        },
      ]}
    >
      {Component ? (
        panel === 'monitor' ? (
          <Component stats={stats} />
        ) : isBookmarksPanel || isHistoryPanel || isGitHubPanel || isFlouPanel ? (
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
    </SidePanelShell>
  );
}
