import { Cpu, MemoryStick, Wifi, Layers, ZoomIn } from 'lucide-react';
import { SystemStats } from '@/hooks/useSystemMonitor';

interface StatusBarProps {
  stats: SystemStats;
  tabCount: number;
}

export function StatusBar({ stats, tabCount }: StatusBarProps) {
  return (
    <div className="flex items-center justify-between h-6 bg-background border-t border-border px-3 text-[10px] font-mono text-muted-foreground shrink-0 select-none">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Cpu size={10} />
          <span>{stats.cpu}%</span>
        </div>
        <div className="flex items-center gap-1">
          <MemoryStick size={10} />
          <span>{stats.ram}%</span>
        </div>
        <div className="flex items-center gap-1">
          <Wifi size={10} className="text-green-500" />
          <span>Connected</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Layers size={10} />
          <span>{tabCount} tabs</span>
        </div>
        <div className="flex items-center gap-1">
          <ZoomIn size={10} />
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}
