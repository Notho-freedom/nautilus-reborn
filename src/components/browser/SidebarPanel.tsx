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
import { SystemStats } from '@/hooks/useSystemMonitor';

interface SidebarPanelProps {
  panel: string | null;
  stats: SystemStats;
}

export function SidebarPanel({ panel, stats }: SidebarPanelProps) {
  if (!panel) return null;

  return (
    <div className="w-60 h-full border-r border-border bg-card overflow-hidden flex flex-col">
      {panel === 'monitor' && <SystemMonitor stats={stats} />}
      {panel === 'terminal' && <TerminalPanel />}
      {panel === 'lighthouse' && <LighthousePanel />}
      {panel === 'settings' && <SettingsPanel />}
      {panel === 'git' && <GitPanel />}
      {panel === 'api-docs' && <ApiDocsPanel />}
      {panel === 'bookmarks' && <BookmarksPanel />}
      {panel === 'history' && <HistoryPanel />}
      {panel === 'downloads' && <DownloadsPanel />}
      {panel === 'widgets' && <WidgetsPanel />}
      {panel === 'extensions' && <ExtensionsPanel />}
      {panel === 'docs' && <DocumentationPanel />}
      {panel === 'mosaic' && <MosaicPanel />}
      {panel === 'vscode' && (
        <div className="p-3">
          <h3 className="text-xs font-mono font-semibold text-primary uppercase tracking-wider mb-3">VS Code</h3>
          <p className="text-xs text-muted-foreground">Open your project in VS Code for advanced editing.</p>
          <button className="mt-3 w-full h-8 rounded bg-primary/15 text-primary text-xs font-mono hover:bg-primary/25 transition-colors">
            Launch VS Code
          </button>
        </div>
      )}
      {panel === 'home' && (
        <div className="p-3">
          <h3 className="text-xs font-mono font-semibold text-primary uppercase tracking-wider mb-3">Home</h3>
          <p className="text-xs text-muted-foreground">Navigate to Speed Dial homepage.</p>
        </div>
      )}
    </div>
  );
}
