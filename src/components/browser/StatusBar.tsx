import { Cpu, MemoryStick, Wifi, Layers, ZoomIn, ZoomOut, Shield, Lock } from 'lucide-react';
import { SystemStats } from '@/hooks/useSystemMonitor';
import { useState } from 'react';

interface StatusBarProps {
  stats: SystemStats;
  tabCount: number;
  adsBlocked?: number;
}

export function StatusBar({ stats, tabCount, adsBlocked = 0 }: StatusBarProps) {
  const [zoom, setZoom] = useState(100);

  return (
    <div className="flex items-center justify-between h-6 bg-background border-t border-border px-3 text-[10px] font-mono text-muted-foreground shrink-0 select-none">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Lock size={9} className="text-green-500" />
          <span>Secure</span>
        </div>
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
        {adsBlocked > 0 && (
          <div className="flex items-center gap-1 text-green-500">
            <Shield size={9} />
            <span>{adsBlocked} blocked</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Layers size={10} />
          <span>{tabCount} tabs</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="hover:text-foreground transition-colors p-0.5">
            <ZoomOut size={10} />
          </button>
          <span className="w-7 text-center">{zoom}%</span>
          <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="hover:text-foreground transition-colors p-0.5">
            <ZoomIn size={10} />
          </button>
        </div>
      </div>
    </div>
  );
}
