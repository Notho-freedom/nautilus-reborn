import { useCallback, useEffect, useRef, useState } from 'react';
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
import { FrontendLabPanel } from './FrontendLabPanel';
import { BackendLabPanel } from './BackendLabPanel';
import { SystemStats } from '@/hooks/useSystemMonitor';
import { WebServicePanel } from './WebServicePanel';
import type { WebServiceItem } from './DevToolsSidebar';

interface SidebarPanelProps {
  panel: string | null;
  stats: SystemStats;
  webService: WebServiceItem | null;
  onWidthChange?: (width: number) => void;
  onOpenWebServiceInTab: (url: string, label: string) => void;
  onClosePanel: () => void;
  onNavigate: (url: string) => void;
  onOpenPanel?: (panel: string) => void;
  onCreateTab?: (url: string, title?: string) => void;
  githubToken?: string;
  githubUsername?: string;
  isGitHubOAuth?: boolean;
  onSaveGitHubCredentials?: (token: string, username: string) => void;
  onSignInWithGitHub?: () => void;
}

type GenericPanelProps = {
  stats?: SystemStats;
  onNavigate?: (url: string) => void;
  onClose?: () => void;
  onOpenPanel?: (panel: string) => void;
  onCreateTab?: (url: string, title?: string) => void;
  githubToken?: string;
  githubUsername?: string;
  isGitHubOAuth?: boolean;
  onSaveGitHubCredentials?: (token: string, username: string) => void;
  onSignInWithGitHub?: () => void;
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
  extensions: ExtensionsPanel,
  docs: DocumentationPanel,
  mosaic: MosaicPanel,
  updates: UpdatesPanel,
  vscode: StudioPanel,
  github: GitHubReposPanel,
  flou: FlouPanel,
  'frontend-lab': FrontendLabPanel as React.ComponentType<GenericPanelProps>,
  'backend-lab': BackendLabPanel as React.ComponentType<GenericPanelProps>,
};

const PANEL_WIDTH_KEY = 'notilus_panel_width';
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 600;

function readPanelWidth(): number {
  if (typeof window === 'undefined') return DEFAULT_WIDTH;
  try {
    const raw = window.localStorage.getItem(PANEL_WIDTH_KEY);
    if (!raw) return DEFAULT_WIDTH;
    const val = Number(raw);
    if (Number.isNaN(val)) return DEFAULT_WIDTH;
    return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, val));
  } catch {
    return DEFAULT_WIDTH;
  }
}

export function SidebarPanel({
  panel,
  stats,
  webService,
  onWidthChange,
  onOpenWebServiceInTab,
  onClosePanel,
  onNavigate,
  onOpenPanel,
  onCreateTab,
  githubToken,
  githubUsername,
  isGitHubOAuth,
  onSaveGitHubCredentials,
  onSignInWithGitHub,
}: SidebarPanelProps) {
  const [width, setWidth] = useState(() => readPanelWidth());
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  useEffect(() => {
    window.localStorage.setItem(PANEL_WIDTH_KEY, String(width));
  }, [width]);

  useEffect(() => {
    if (!panel) {
      onWidthChange?.(0);
      return;
    }
    const effectiveWidth = panel === 'web-service' ? Math.max(width, 360) : width;
    onWidthChange?.(effectiveWidth);
  }, [panel, width, onWidthChange]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = width;

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = ev.clientX - startX.current;
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth.current + delta));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [width]);

  if (!panel) return null;

  if (panel === 'web-service') {
    return (
      <div
        className="h-full border-r border-border bg-card overflow-hidden flex flex-col animate-slide-in-left shadow-xl relative"
        style={{ width: `${Math.max(width, 360)}px` }}
      >
        <WebServicePanel
          service={webService}
          onOpenInTab={onOpenWebServiceInTab}
          onClose={onClosePanel}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/30 transition-colors"
          onMouseDown={handleMouseDown}
        />
      </div>
    );
  }

  const Component = PANEL_MAP[panel];
  const isBookmarksPanel = panel === 'bookmarks';
  const isHistoryPanel = panel === 'history';
  const isGitHubPanel = panel === 'github';
  const isFlouPanel = panel === 'flou';

  return (
    <div
      className="h-full border-r border-border bg-card overflow-hidden flex flex-col animate-slide-in-left shadow-xl relative"
      style={{ width: `${width}px` }}
    >
      {Component ? (
        panel === 'monitor' ? (
          <Component stats={stats} onClose={onClosePanel} />
        ) : isGitHubPanel ? (
          <Component
            onNavigate={onNavigate}
            onClose={onClosePanel}
            githubToken={githubToken}
            githubUsername={githubUsername}
            isGitHubOAuth={isGitHubOAuth}
            onSaveGitHubCredentials={onSaveGitHubCredentials}
            onSignInWithGitHub={onSignInWithGitHub}
          />
        ) : isBookmarksPanel || isHistoryPanel || isFlouPanel ? (
          <Component onNavigate={onNavigate} onClose={onClosePanel} />
        ) : (
          <Component onClose={onClosePanel} />
        )
      ) : (
        <div className="p-3">
          <h3 className="text-xs font-display font-semibold text-primary uppercase tracking-widest mb-3">{panel}</h3>
          <p className="text-xs font-body text-muted-foreground">Panel content coming soon.</p>
        </div>
      )}
      <div
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/30 transition-colors"
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}
