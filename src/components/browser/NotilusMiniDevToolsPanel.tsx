import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, LayoutPanelTop, Move, Wifi, Wrench, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { devtoolsBridge } from '@/lib/devtoolsBridge';
import type { ConsoleEntry, NetworkRequest } from '@/types/devtools';

interface NotilusMiniDevToolsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onExpand: () => void;
  onOpenNative: () => void;
}

type MiniTab = 'console' | 'network';

const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 300;
const COLLAPSED_WIDTH = 220;
const COLLAPSED_HEIGHT = 28;

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '--:--:--';
  return date.toLocaleTimeString('en-GB', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function NotilusMiniDevToolsPanel({
  isOpen,
  onClose,
  onExpand,
  onOpenNative,
}: NotilusMiniDevToolsPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<MiniTab>('console');
  const [position, setPosition] = useState({ x: 12, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 });

  const [logs, setLogs] = useState<ConsoleEntry[]>([]);
  const [requests, setRequests] = useState<NetworkRequest[]>([]);

  useEffect(() => {
    const updatePosition = () => {
      const panelHeight = collapsed ? COLLAPSED_HEIGHT : DEFAULT_HEIGHT;
      setPosition(previous => {
        const nextY = Math.max(8, window.innerHeight - panelHeight - 12);
        return { x: Math.max(8, previous.x), y: nextY };
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('resize', updatePosition);
    };
  }, [collapsed]);

  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = devtoolsBridge.subscribe(payload => {
      if (payload.logs.length > 0) {
        setLogs(previous => {
          const merged = [...previous, ...payload.logs].slice(-120);
          return merged;
        });
      }
      if (payload.requests.length > 0) {
        setRequests(previous => {
          const map = new Map<string, NetworkRequest>();
          previous.forEach(request => map.set(request.id, request));
          payload.requests.forEach(request => map.set(request.id, { ...map.get(request.id), ...request }));
          return Array.from(map.values()).sort((a, b) => a.startTime - b.startTime).slice(-120);
        });
      }
    });
    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (event: MouseEvent) => {
      const width = collapsed ? COLLAPSED_WIDTH : DEFAULT_WIDTH;
      const height = collapsed ? COLLAPSED_HEIGHT : DEFAULT_HEIGHT;
      const x = Math.max(0, Math.min(window.innerWidth - width, event.clientX - dragDelta.x));
      const y = Math.max(0, Math.min(window.innerHeight - height, event.clientY - dragDelta.y));
      setPosition({ x, y });
    };

    const handleMouseUp = () => {
      setDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [collapsed, dragDelta, dragging]);

  const visibleLogs = useMemo(() => logs.slice(-30), [logs]);
  const visibleRequests = useMemo(() => requests.slice(-30), [requests]);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'notilus-devtools-scope absolute z-50 overflow-hidden rounded-xl border border-border/35 bg-card/80 shadow-xl backdrop-blur-sm',
        dragging ? 'cursor-grabbing' : ''
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: collapsed ? COLLAPSED_WIDTH : DEFAULT_WIDTH,
        height: collapsed ? COLLAPSED_HEIGHT : DEFAULT_HEIGHT,
      }}
    >
      <div
        className="flex h-7 items-center border-b border-border/35 bg-black/20 px-2"
        onMouseDown={event => {
          setDragging(true);
          setDragDelta({ x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY });
        }}
      >
        <Move size={12} className="text-primary/70" />
        <span className="ml-2 text-[11px] uppercase tracking-wider text-primary">Nautilus Mini DevTools</span>

        {!collapsed ? (
          <div className="ml-3 flex items-center gap-1">
            <button
              type="button"
              onClick={event => {
                event.stopPropagation();
                setTab('console');
              }}
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px] transition-colors',
                tab === 'console' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Console
            </button>
            <button
              type="button"
              onClick={event => {
                event.stopPropagation();
                setTab('network');
              }}
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px] transition-colors',
                tab === 'network' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Network
            </button>
          </div>
        ) : null}

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            title={collapsed ? 'Expand' : 'Collapse'}
            onClick={event => {
              event.stopPropagation();
              setCollapsed(value => !value);
            }}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            {collapsed ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
          <button
            type="button"
            title="Attach to main panel"
            onClick={event => {
              event.stopPropagation();
              onExpand();
            }}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <LayoutPanelTop size={11} />
          </button>
          <button
            type="button"
            title="Open native Chromium DevTools"
            onClick={event => {
              event.stopPropagation();
              onOpenNative();
            }}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <Wrench size={11} />
          </button>
          <button
            type="button"
            title="Close"
            onClick={event => {
              event.stopPropagation();
              onClose();
            }}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <X size={11} />
          </button>
        </div>
      </div>

      {!collapsed ? (
        <div className="h-[calc(100%-28px)] overflow-y-auto p-2 text-[10px] font-mono scrollbar-thin">
          {tab === 'console' ? (
            <div className="space-y-1">
              {visibleLogs.length === 0 ? (
                <div className="text-muted-foreground">No console logs yet.</div>
              ) : null}
              {visibleLogs.map(entry => (
                <div
                  key={entry.id}
                  className={cn(
                    'rounded border border-border/20 px-2 py-1',
                    entry.level === 'error'
                      ? 'text-red-400'
                      : entry.level === 'warn'
                        ? 'text-yellow-400'
                        : entry.level === 'info'
                          ? 'text-blue-400'
                          : 'text-foreground'
                  )}
                >
                  <div className="mb-0.5 text-[9px] text-muted-foreground">{formatTimestamp(entry.timestamp)}</div>
                  <div className="break-all">{entry.message}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {visibleRequests.length === 0 ? (
                <div className="text-muted-foreground">No network requests yet.</div>
              ) : null}
              {visibleRequests.map(request => (
                <div key={`${request.id}-${request.statusCode}`} className="rounded border border-border/20 px-2 py-1">
                  <div className="flex items-center gap-1 text-[9px]">
                    <Wifi size={10} className="text-primary" />
                    <span className="text-primary">{request.method}</span>
                    <span className="text-muted-foreground">{request.statusCode ?? '-'}</span>
                    <span className="ml-auto text-muted-foreground">
                      {request.duration != null ? `${Math.round(request.duration)}ms` : '-'}
                    </span>
                  </div>
                  <div className="truncate text-foreground">{request.url}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
