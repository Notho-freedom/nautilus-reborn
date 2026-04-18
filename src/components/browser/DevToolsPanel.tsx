import { useEffect, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  Eraser,
  Eye,
  EyeOff,
  Laptop,
  Settings,
  Smartphone,
  Tablet,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DevConsole } from './devtools/DevConsole';
import { DevNetwork } from './devtools/DevNetwork';
import { DevElements } from './devtools/DevElements';
import { DevPerformance } from './devtools/DevPerformance';
import { DevApplication } from './devtools/DevApplication';
import { DevSources } from './devtools/DevSources';
import { BackendLabPanel } from './BackendLabPanel';
import { devtoolsBridge, fetchDevtoolsSnapshot, type ResponsivePresetId } from '@/lib/devtoolsBridge';
import type {
  ConsoleEntry,
  DOMNode,
  InspectedElementDetails,
  NetworkRequest,
  PerformanceMetrics,
  SourceFile,
  StorageItem,
} from '@/types/devtools';

interface DevToolsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  height: number;
  onHeightChange: (height: number) => void;
  onDetach?: () => void;
  isDetached?: boolean;
  onAttach?: () => void;
  onOpenSettings?: () => void;
}

type DevtoolsTabId =
  | 'elements'
  | 'console'
  | 'network'
  | 'resources'
  | 'performance'
  | 'application'
  | 'backend-lab';

const TABS: Array<{ id: DevtoolsTabId; label: string; shortcut: string }> = [
  { id: 'elements', label: 'Elements', shortcut: 'Ctrl+Shift+C' },
  { id: 'console', label: 'Console', shortcut: 'Ctrl+Shift+J' },
  { id: 'network', label: 'Network', shortcut: 'Ctrl+Shift+E' },
  { id: 'resources', label: 'Resources', shortcut: 'Ctrl+Shift+R' },
  { id: 'performance', label: 'Performance', shortcut: 'Ctrl+Shift+P' },
  { id: 'application', label: 'Application', shortcut: 'Ctrl+Shift+A' },
  { id: 'backend-lab', label: 'Backend Lab', shortcut: 'Ctrl+Shift+B' },
];

const MAX_CONSOLE_ENTRIES = 1000;
const MAX_NETWORK_ENTRIES = 500;

function normalizeRequests(previous: NetworkRequest[], incoming: NetworkRequest[]): NetworkRequest[] {
  if (incoming.length === 0) return previous;

  const map = new Map<string, NetworkRequest>();
  previous.forEach(request => {
    map.set(request.id, request);
  });

  incoming.forEach(request => {
    const previousRequest = map.get(request.id);
    map.set(request.id, {
      ...previousRequest,
      ...request,
    });
  });

  const merged = Array.from(map.values()).sort((a, b) => a.startTime - b.startTime);
  return merged.length > MAX_NETWORK_ENTRIES
    ? merged.slice(merged.length - MAX_NETWORK_ENTRIES)
    : merged;
}

function normalizeConsole(previous: ConsoleEntry[], incoming: ConsoleEntry[]): ConsoleEntry[] {
  if (incoming.length === 0) return previous;
  const merged = [...previous, ...incoming].sort((a, b) => a.timestamp - b.timestamp);
  return merged.length > MAX_CONSOLE_ENTRIES
    ? merged.slice(merged.length - MAX_CONSOLE_ENTRIES)
    : merged;
}

function defaultStorage(): Record<'localStorage' | 'sessionStorage' | 'cookie', StorageItem[]> {
  return {
    localStorage: [],
    sessionStorage: [],
    cookie: [],
  };
}

export function DevToolsPanel({
  isOpen,
  onClose,
  height,
  onHeightChange,
  onDetach,
  isDetached = false,
  onAttach,
  onOpenSettings,
}: DevToolsPanelProps) {
  const [activeTab, setActiveTab] = useState<DevtoolsTabId>('elements');
  const [isDragging, setIsDragging] = useState(false);
  const [inspectMode, setInspectMode] = useState(false);
  const [responsivePreset, setResponsivePreset] = useState<ResponsivePresetId>('reset');

  const [consoleLogs, setConsoleLogs] = useState<ConsoleEntry[]>([]);
  const [networkRequests, setNetworkRequests] = useState<NetworkRequest[]>([]);
  const [domTree, setDomTree] = useState<DOMNode | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [storageItems, setStorageItems] = useState<Record<'localStorage' | 'sessionStorage' | 'cookie', StorageItem[]>>(defaultStorage);
  const [sources, setSources] = useState<SourceFile[]>([]);
  const [inspectedElement, setInspectedElement] = useState<InspectedElementDetails | null>(null);

  const refreshInFlight = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = devtoolsBridge.subscribe(payload => {
      if (payload.logs.length > 0) {
        setConsoleLogs(previous => normalizeConsole(previous, payload.logs));
      }
      if (payload.requests.length > 0) {
        setNetworkRequests(previous => normalizeRequests(previous, payload.requests));
      }
      if (payload.inspectedElement) {
        setInspectedElement(payload.inspectedElement);
      }
    });

    void (async () => {
      const snapshot = await fetchDevtoolsSnapshot();
      setDomTree(snapshot.domTree);
      setPerformanceMetrics(snapshot.performance);
      setSources(snapshot.sources);
      setStorageItems(snapshot.storage);
    })();

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (inspectMode) {
          setInspectMode(false);
          void devtoolsBridge.setInspectMode(false);
        } else {
          onClose();
        }
        return;
      }

      if (!event.ctrlKey || !event.shiftKey) return;
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest('input, textarea, [contenteditable="true"]')
      ) {
        return;
      }

      const key = event.key.toUpperCase();
      let nextTab: DevtoolsTabId | null = null;
      if (key === 'C') nextTab = 'elements';
      if (key === 'J') nextTab = 'console';
      if (key === 'E') nextTab = 'network';
      if (key === 'R') nextTab = 'resources';
      if (key === 'P') nextTab = 'performance';
      if (key === 'A') nextTab = 'application';
      if (key === 'B') nextTab = 'backend-lab';

      if (nextTab) {
        event.preventDefault();
        setActiveTab(nextTab);
      }
    };

    window.addEventListener('keydown', keydown, true);
    return () => {
      window.removeEventListener('keydown', keydown, true);
    };
  }, [inspectMode, isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === 'console' || activeTab === 'network') return;
    if (refreshInFlight.current) return;

    refreshInFlight.current = true;
    const refresh = async () => {
      try {
        if (activeTab === 'elements') {
          setDomTree(await devtoolsBridge.fetchDOMTree());
          return;
        }
        if (activeTab === 'performance') {
          setPerformanceMetrics(await devtoolsBridge.fetchPerformance());
          return;
        }
        if (activeTab === 'application') {
          setStorageItems(await devtoolsBridge.fetchStorage());
          return;
        }
        if (activeTab === 'resources') {
          setSources(await devtoolsBridge.fetchSources());
        }
      } finally {
        refreshInFlight.current = false;
      }
    };

    void refresh();
  }, [activeTab, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!inspectMode) return;

    return () => {
      void devtoolsBridge.setInspectMode(false);
    };
  }, [inspectMode, isOpen]);

  if (!isOpen) return null;

  const handleMouseDown = () => {
    setIsDragging(true);
    const handleMouseMove = (event: MouseEvent) => {
      const nextHeight = window.innerHeight - event.clientY;
      onHeightChange(Math.max(150, Math.min(700, nextHeight)));
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const errorCount = consoleLogs.filter(entry => entry.level === 'error').length;
  const warningCount = consoleLogs.filter(entry => entry.level === 'warn').length;

  const clearAll = async () => {
    await devtoolsBridge.clearAll();
    setConsoleLogs([]);
    setNetworkRequests([]);
  };

  const toggleInspectMode = async () => {
    const next = !inspectMode;
    setInspectMode(next);
    await devtoolsBridge.setInspectMode(next);
  };

  const applyResponsivePreset = async (preset: ResponsivePresetId) => {
    setResponsivePreset(preset);
    await devtoolsBridge.applyResponsivePreset(preset);
  };

  return (
    <div
      className="notilus-devtools-scope flex shrink-0 flex-col border-t border-border/30 surface-chrome"
      style={{ height }}
    >
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          'h-[2px] cursor-row-resize transition-colors duration-200 hover:bg-primary/40',
          isDragging ? 'bg-primary/60' : ''
        )}
      />

      <div className="flex h-9 items-center gap-1 bg-notilus-surface-2/30 px-2 shrink-0">
        <div className="flex items-center gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              title={`${tab.label} (${tab.shortcut})`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative h-7 rounded-md px-2.5 text-[10px] uppercase tracking-[0.15em] transition-all duration-200',
                activeTab === tab.id
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-notilus-surface-2/60 hover:text-foreground'
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-2 right-2 h-[2px] rounded-t bg-primary" />
              )}
            </button>
          ))}
        </div>

        <div className="ml-3 flex items-center gap-2 text-[9px] tabular-nums">
          <span className="text-red-400/80">Err {errorCount}</span>
          <span className="text-yellow-400/80">Warn {warningCount}</span>
          <span className="text-blue-400/80">Req {networkRequests.length}</span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => {
              void toggleInspectMode();
            }}
            className={cn(
              'inline-flex h-7 items-center gap-1 rounded px-2 text-[10px] transition-colors',
              inspectMode
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
            title="Inspect mode (Ctrl+Shift+C)"
          >
            {inspectMode ? <Eye size={11} strokeWidth={1.25} /> : <EyeOff size={11} strokeWidth={1.25} />}
            Inspect
          </button>

          <button
            type="button"
            onClick={() => {
              void applyResponsivePreset('desktop');
            }}
            className={cn(
              'inline-flex h-7 items-center gap-1 rounded px-2 text-[10px] transition-colors',
              responsivePreset === 'desktop'
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
            title="Responsive desktop"
          >
            <Laptop size={11} strokeWidth={1.25} />
          </button>
          <button
            type="button"
            onClick={() => {
              void applyResponsivePreset('tablet');
            }}
            className={cn(
              'inline-flex h-7 items-center gap-1 rounded px-2 text-[10px] transition-colors',
              responsivePreset === 'tablet'
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
            title="Responsive tablet"
          >
            <Tablet size={11} strokeWidth={1.25} />
          </button>
          <button
            type="button"
            onClick={() => {
              void applyResponsivePreset('mobile');
            }}
            className={cn(
              'inline-flex h-7 items-center gap-1 rounded px-2 text-[10px] transition-colors',
              responsivePreset === 'mobile'
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
            title="Responsive mobile"
          >
            <Smartphone size={11} strokeWidth={1.25} />
          </button>
          <button
            type="button"
            onClick={() => {
              void applyResponsivePreset('reset');
            }}
            className="inline-flex h-7 items-center gap-1 rounded px-2 text-[10px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            title="Reset responsive"
          >
            Reset
          </button>

          <button
            type="button"
            onClick={() => {
              void clearAll();
            }}
            className="inline-flex h-7 items-center gap-1 rounded px-2 text-[10px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            title="Clear all"
          >
            <Eraser size={11} strokeWidth={1.25} />
            Clear
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            disabled={!onOpenSettings}
            className="inline-flex h-7 items-center gap-1 rounded px-2 text-[10px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            title="DevTools settings"
          >
            <Settings size={11} strokeWidth={1.25} />
            Settings
          </button>

          {isDetached ? (
            <button
              type="button"
              onClick={onAttach}
              className="inline-flex h-7 items-center gap-1 rounded px-2 text-[10px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              title="Attach panel"
            >
              <ArrowDownToLine size={11} strokeWidth={1.25} />
              Attach
            </button>
          ) : (
            <button
              type="button"
              onClick={onDetach}
              className="inline-flex h-7 items-center gap-1 rounded px-2 text-[10px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              title="Detach to mini panel"
            >
              <ArrowDownToLine size={11} strokeWidth={1.25} />
              Detach
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            title="Close DevTools"
          >
            <X size={12} strokeWidth={1.25} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'console' ? (
          <DevConsole
            logs={consoleLogs}
            onExecute={script => devtoolsBridge.executeScript(script)}
            onClear={() => {
              setConsoleLogs([]);
              void devtoolsBridge.clearConsole();
            }}
          />
        ) : null}

        {activeTab === 'network' ? (
          <DevNetwork
            requests={networkRequests}
            onClear={() => {
              setNetworkRequests([]);
              void devtoolsBridge.clearNetwork();
            }}
          />
        ) : null}

        {activeTab === 'elements' ? (
          <DevElements
            domTree={domTree}
            inspectedElement={inspectedElement}
            onRefresh={() => {
              void devtoolsBridge.fetchDOMTree().then(setDomTree);
            }}
            onInspectSelector={async selector => {
              const inspected = await devtoolsBridge.inspectElement(selector);
              if (inspected) {
                setInspectedElement(inspected);
              }
            }}
          />
        ) : null}

        {activeTab === 'performance' ? (
          <DevPerformance
            metrics={performanceMetrics}
            onRefresh={() => {
              void devtoolsBridge.fetchPerformance().then(setPerformanceMetrics);
            }}
          />
        ) : null}

        {activeTab === 'application' ? (
          <DevApplication
            storage={storageItems}
            onRefresh={() => {
              void devtoolsBridge.fetchStorage().then(setStorageItems);
            }}
          />
        ) : null}

        {activeTab === 'resources' ? (
          <DevSources
            sources={sources}
            onRefresh={() => {
              void devtoolsBridge.fetchSources().then(setSources);
            }}
          />
        ) : null}

        {activeTab === 'backend-lab' ? <BackendLabPanel embedded /> : null}
      </div>
    </div>
  );
}
