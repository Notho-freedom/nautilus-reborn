import { useState, useEffect, useRef } from 'react';
import {
  Cpu, MemoryStick, Wifi, WifiOff, Layers, ZoomIn, ZoomOut,
  Lock, Unlock, GitBranch, Wrench, FlaskConical, Server,
  Settings, Bell, ChevronUp
} from 'lucide-react';
import { SystemStats } from '@/hooks/useSystemMonitor';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
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

function getSignalStrength(networkDown: number): number {
  if (networkDown >= 10) return 4;
  if (networkDown >= 5) return 3;
  if (networkDown >= 1) return 2;
  if (networkDown > 0) return 1;
  return 0;
}

function SignalBars({ strength }: { strength: number }) {
  return (
    <div className="flex items-end gap-px h-[10px]">
      {[1, 2, 3, 4].map(bar => (
        <div
          key={bar}
          className={cn(
            "w-[2px] rounded-sm transition-colors",
            bar <= strength ? "bg-success" : "bg-muted-foreground/30"
          )}
          style={{ height: `${bar * 2.5}px` }}
        />
      ))}
    </div>
  );
}

function StatusItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted/50 transition-colors duration-fast cursor-default", className)}>
      {children}
    </div>
  );
}

function StatusButton({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted/50 transition-colors duration-fast", className)}
    >
      {children}
    </button>
  );
}

// CPU History sparkline
function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 60},${20 - (v / max) * 18}`).join(' ');
  return (
    <svg width="60" height="20" className="text-primary">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
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
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const signalStrength = getSignalStrength(stats.networkDown);
  const isHttps = activeTabUrl.startsWith('https://') || activeTabUrl.startsWith('notilus://');
  const isConnected = stats.networkDown > 0 || stats.networkUp > 0;

  useEffect(() => {
    setCpuHistory(prev => [...prev.slice(-19), stats.cpu]);
  }, [stats.cpu]);

  return (
    <div className="flex items-center justify-between h-6 bg-background border-t border-border px-1 text-[10px] font-body text-muted-foreground shrink-0 select-none">
      {/* Left zone */}
      <div className="flex items-center gap-0">
        {/* Security */}
        <HoverCard openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>
            <div>
              <StatusItem className={isHttps ? "text-success" : "text-warning"}>
                {isHttps ? <Lock size={9} /> : <Unlock size={9} />}
                <span>{isHttps ? 'HTTPS' : 'HTTP'}</span>
              </StatusItem>
            </div>
          </HoverCardTrigger>
          <HoverCardContent side="top" className="w-56 p-3 text-[10px]">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-display">
                {isHttps ? <Lock size={12} className="text-success" /> : <Unlock size={12} className="text-warning" />}
                <span className="text-foreground">{isHttps ? 'Secure Connection' : 'Insecure Connection'}</span>
              </div>
              <div className="space-y-1 text-muted-foreground">
                <div className="flex justify-between"><span>Protocol</span><span className="text-foreground">{isHttps ? 'TLS 1.3' : 'None'}</span></div>
                <div className="flex justify-between"><span>Certificate</span><span className="text-foreground">{isHttps ? 'Valid' : 'N/A'}</span></div>
                <div className="flex justify-between"><span>Issuer</span><span className="text-foreground truncate ml-2">{isHttps ? 'Let\'s Encrypt' : 'N/A'}</span></div>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>

        {/* CPU */}
        <HoverCard openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>
            <div>
              <StatusItem>
                <Cpu size={9} />
                <span>{stats.cpu}%</span>
              </StatusItem>
            </div>
          </HoverCardTrigger>
          <HoverCardContent side="top" className="w-56 p-3 text-[10px]">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-display text-foreground">
                <Cpu size={12} className="text-primary" /> CPU Usage
              </div>
              <Sparkline data={cpuHistory} />
              <div className="space-y-1 text-muted-foreground">
                <div className="flex justify-between"><span>Current</span><span className="text-foreground">{stats.cpu}%</span></div>
                <div className="flex justify-between"><span>Avg (20s)</span><span className="text-foreground">{cpuHistory.length > 0 ? Math.round(cpuHistory.reduce((a, b) => a + b, 0) / cpuHistory.length) : 0}%</span></div>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>

        {/* RAM */}
        <HoverCard openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>
            <div>
              <StatusItem>
                <MemoryStick size={9} />
                <span>{stats.ram}%</span>
              </StatusItem>
            </div>
          </HoverCardTrigger>
          <HoverCardContent side="top" className="w-56 p-3 text-[10px]">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-display text-foreground">
                <MemoryStick size={12} className="text-primary" /> Memory
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${stats.ram}%` }} />
              </div>
              <div className="space-y-1 text-muted-foreground">
                <div className="flex justify-between"><span>Used</span><span className="text-foreground">{stats.ram}%</span></div>
                <div className="flex justify-between"><span>GPU</span><span className="text-foreground">{stats.gpu}%</span></div>
                <div className="flex justify-between"><span>GPU Temp</span><span className="text-foreground">{stats.gpuTemp}°C</span></div>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>

        {/* Network */}
        <HoverCard openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>
            <div>
              <StatusItem className={isConnected ? "text-success" : "text-error"}>
                {isConnected ? <Wifi size={9} /> : <WifiOff size={9} />}
                <SignalBars strength={signalStrength} />
              </StatusItem>
            </div>
          </HoverCardTrigger>
          <HoverCardContent side="top" className="w-56 p-3 text-[10px]">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-display text-foreground">
                <Wifi size={12} className={isConnected ? "text-success" : "text-error"} />
                {isConnected ? 'Connected' : 'Disconnected'}
              </div>
              <div className="space-y-1 text-muted-foreground">
                <div className="flex justify-between"><span>Signal</span><span className="text-foreground">{signalStrength}/4</span></div>
                <div className="flex justify-between"><span>Download</span><span className="text-foreground">↓ {stats.networkDown} MB/s</span></div>
                <div className="flex justify-between"><span>Upload</span><span className="text-foreground">↑ {stats.networkUp} MB/s</span></div>
                <div className="flex justify-between"><span>Type</span><span className="text-foreground">Ethernet</span></div>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>

        {/* Git */}
        {gitBranch && (
          <HoverCard openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
              <div>
                <StatusButton onClick={() => onOpenPanel('git')}>
                  <GitBranch size={9} />
                  <span className="max-w-[80px] truncate">{gitBranch}</span>
                </StatusButton>
              </div>
            </HoverCardTrigger>
            <HoverCardContent side="top" className="w-56 p-3 text-[10px]">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-display text-foreground">
                  <GitBranch size={12} className="text-primary" /> Git Status
                </div>
                <div className="space-y-1 text-muted-foreground">
                  <div className="flex justify-between"><span>Branch</span><span className="text-foreground">{gitBranch}</span></div>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        )}

        {/* Tabs */}
        <StatusItem>
          <Layers size={9} />
          <span>{tabCount} tabs</span>
        </StatusItem>
      </div>

      {/* Right zone */}
      <div className="flex items-center gap-0">
        {/* Frontend Lab */}
        <StatusButton onClick={() => onOpenPanel('frontend-lab')}>
          <FlaskConical size={9} />
          <span>Frontend</span>
        </StatusButton>

        {/* Backend Lab */}
        <StatusButton onClick={() => onOpenPanel('backend-lab')}>
          <Server size={9} />
          <span>Backend</span>
        </StatusButton>

        {/* Notilus DevTools */}
        <StatusButton onClick={onToggleNotilusDevTools}>
          <Wrench size={9} />
          <span>DevTools</span>
        </StatusButton>

        {/* Notifications */}
        <StatusButton onClick={() => onOpenPanel('notifications')}>
          <Bell size={9} />
        </StatusButton>

        {/* Settings */}
        <StatusButton onClick={() => onOpenPanel('settings')}>
          <Settings size={9} />
        </StatusButton>

        {/* Zoom */}
        <div className="flex items-center gap-0.5 px-1">
          <button onClick={() => onZoomChange(Math.max(50, zoom - 10))} className="hover:text-foreground transition-colors p-0.5">
            <ZoomOut size={9} />
          </button>
          <span className="w-7 text-center font-display text-[9px]">{zoom}%</span>
          <button onClick={() => onZoomChange(Math.min(200, zoom + 10))} className="hover:text-foreground transition-colors p-0.5">
            <ZoomIn size={9} />
          </button>
        </div>
      </div>
    </div>
  );
}
