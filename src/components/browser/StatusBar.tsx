import {
  ChevronDown,
  Cpu,
  GitBranch,
  Gauge,
  Layers,
  Lock,
  MemoryStick,
  PlugZap,
  Search,
  Settings,
  Wifi,
  WifiOff,
  Wrench,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useMemo } from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { SystemStats } from '@/hooks/useSystemMonitor';
import { cn } from '@/lib/utils';

interface StatusBarProps {
  stats: SystemStats;
  tabCount: number;
  activeTabUrl?: string;
  gitBranch?: string;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onOpenPanel: (panel: string) => void;
  onToggleNotilusDevTools: () => void;
}

function formatMs(value: number | null): string {
  if (value === null || Number.isNaN(value)) return 'N/A';
  return `${Math.round(value)}ms`;
}

function formatMbps(value: number): string {
  return `${value.toFixed(value >= 10 ? 1 : 2)} Mbps`;
}

function StatusButton({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded px-1.5 text-[10px] text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground',
        className
      )}
    >
      {children}
    </button>
  );
}

export function StatusBar({
  stats,
  tabCount,
  activeTabUrl = '',
  gitBranch,
  zoom,
  onZoomChange,
  onOpenPanel,
  onToggleNotilusDevTools,
}: StatusBarProps) {
  const isSecure = activeTabUrl.startsWith('https://') || activeTabUrl.startsWith('notilus://');
  const networkTone = stats.networkOnline
    ? stats.networkQuality === 'excellent' || stats.networkQuality === 'good'
      ? 'text-success'
      : 'text-warning'
    : 'text-destructive';

  const networkLabel = useMemo(() => {
    if (!stats.networkOnline) return 'Offline';
    return stats.networkQuality.charAt(0).toUpperCase() + stats.networkQuality.slice(1);
  }, [stats.networkOnline, stats.networkQuality]);

  return (
    <div className="flex h-6 shrink-0 items-center justify-between border-t border-border bg-background px-1 select-none">
      <div className="flex items-center gap-0.5">
        <HoverCard openDelay={180}>
          <HoverCardTrigger asChild>
            <div className="inline-flex h-5 items-center gap-1 rounded px-1.5 text-[10px] text-muted-foreground hover:bg-primary/10">
              <Lock size={10} className={isSecure ? 'text-success' : 'text-warning'} />
              <span>{isSecure ? 'Secure' : 'Insecure'}</span>
            </div>
          </HoverCardTrigger>
          <HoverCardContent side="top" className="w-60 p-3 text-[10px]">
            <div className="space-y-1">
              <div className="text-xs font-medium text-foreground">Connection security</div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Protocol</span>
                <span className="text-foreground">{isSecure ? 'HTTPS/TLS' : 'HTTP'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Page type</span>
                <span className="text-foreground">
                  {activeTabUrl.startsWith('notilus://') ? 'Internal' : 'External'}
                </span>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>

        <HoverCard openDelay={180}>
          <HoverCardTrigger asChild>
            <div
              className={cn(
                'inline-flex h-5 items-center gap-1 rounded px-1.5 text-[10px] text-muted-foreground hover:bg-primary/10',
                networkTone
              )}
            >
              {stats.networkOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
              <span>{networkLabel}</span>
            </div>
          </HoverCardTrigger>
          <HoverCardContent side="top" className="w-64 p-3 text-[10px]">
            <div className="space-y-1">
              <div className="text-xs font-medium text-foreground">Network quality</div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className={networkTone}>{stats.networkOnline ? 'Connected' : 'Offline'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Downlink</span>
                <span className="text-foreground">{formatMbps(stats.networkDown)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Uplink</span>
                <span className="text-foreground">{formatMbps(stats.networkUp)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Latency</span>
                <span className="text-foreground">{formatMs(stats.networkLatency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Jitter</span>
                <span className="text-foreground">{formatMs(stats.networkJitter)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Packet loss</span>
                <span className="text-foreground">
                  {stats.networkPacketLoss === null ? 'N/A' : `${stats.networkPacketLoss.toFixed(2)}%`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Interface</span>
                <span className="truncate text-foreground">{stats.networkInterface ?? 'N/A'}</span>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>

        <HoverCard openDelay={180}>
          <HoverCardTrigger asChild>
            <div className="inline-flex h-5 items-center gap-1 rounded px-1.5 text-[10px] text-muted-foreground hover:bg-primary/10">
              <Cpu size={10} />
              <span>{stats.cpu}%</span>
              <MemoryStick size={10} />
              <span>{stats.ram}%</span>
            </div>
          </HoverCardTrigger>
          <HoverCardContent side="top" className="w-56 p-3 text-[10px]">
            <div className="space-y-1">
              <div className="text-xs font-medium text-foreground">System monitor</div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CPU</span>
                <span className="text-foreground">{stats.cpu}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">RAM</span>
                <span className="text-foreground">{stats.ram}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GPU</span>
                <span className="text-foreground">{stats.gpu}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GPU Temp</span>
                <span className="text-foreground">{stats.gpuTemp ? `${stats.gpuTemp}°C` : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Battery</span>
                <span className="text-foreground">
                  {stats.battery === null
                    ? 'N/A'
                    : `${stats.battery}%${stats.batteryCharging ? ' (charging)' : ''}`}
                </span>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>

        <StatusButton>
          <Layers size={10} />
          <span>{tabCount} tabs</span>
        </StatusButton>

        {gitBranch ? (
          <StatusButton onClick={() => onOpenPanel('git')}>
            <GitBranch size={10} />
            <span className="max-w-28 truncate">{gitBranch}</span>
          </StatusButton>
        ) : null}
      </div>

      <div className="flex items-center gap-0.5">
        <StatusButton onClick={() => onZoomChange(Math.max(50, zoom - 10))}>
          <ZoomOut size={10} />
        </StatusButton>
        <StatusButton className="w-10 justify-center text-foreground">
          <span>{zoom}%</span>
        </StatusButton>
        <StatusButton onClick={() => onZoomChange(Math.min(300, zoom + 10))}>
          <ZoomIn size={10} />
        </StatusButton>

        <StatusButton onClick={onToggleNotilusDevTools}>
          <Wrench size={10} />
          <span>Nautilus DevTools</span>
        </StatusButton>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <StatusButton>
              <Gauge size={10} />
              <span>Labs</span>
              <ChevronDown size={10} />
            </StatusButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem onClick={() => onOpenPanel('frontend-lab')}>
              Frontend Lab
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onOpenPanel('backend-lab')}>
              Backend Lab
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onOpenPanel('mosaic')}>Mosaic</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onOpenPanel('lighthouse')}>
              Lighthouse
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <StatusButton>
              <PlugZap size={10} />
              <span>Tools</span>
              <ChevronDown size={10} />
            </StatusButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem onClick={() => onOpenPanel('docs')}>
              Documentation
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onOpenPanel('api-docs')}>API docs</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onOpenPanel('updates')}>Updates</DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleNotilusDevTools}>
              Notilus console
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onOpenPanel('settings')}>
              <Settings size={12} />
              <span>Settings</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <StatusButton onClick={() => onOpenPanel('history')}>
          <Search size={10} />
          <span>History</span>
        </StatusButton>
      </div>
    </div>
  );
}
