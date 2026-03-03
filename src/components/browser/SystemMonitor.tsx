import { Cpu, MemoryStick, MonitorSpeaker, Wifi, Battery, Thermometer } from 'lucide-react';
import { SystemStats } from '@/hooks/useSystemMonitor';
import { cn } from '@/lib/utils';

interface SystemMonitorProps {
  stats: SystemStats;
}

function StatBar({ label, value, icon: Icon, unit = '%' }: {
  label: string; value: number; icon: any; unit?: string;
}) {
  const getColor = (v: number) => {
    if (v > 80) return 'bg-error';
    if (v > 60) return 'notilus-gradient';
    return 'bg-primary';
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-body text-muted-foreground">
          <Icon size={12} />
          <span>{label}</span>
        </div>
        <span className="font-display text-[11px] text-foreground">{value}{unit}</span>
      </div>
      <div className="h-1.5 bg-notilus-surface-2 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-1000 ease-out", getColor(value))}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function SystemMonitor({ stats }: SystemMonitorProps) {
  return (
    <div className="p-3 space-y-4 overflow-y-auto scrollbar-thin flex-1">
      <h3 className="text-xs font-display font-semibold text-primary uppercase tracking-widest">
        System Monitor
      </h3>
      <div className="space-y-3">
        <StatBar label="CPU" value={stats.cpu} icon={Cpu} />
        <StatBar label="RAM" value={stats.ram} icon={MemoryStick} />
        <StatBar label="GPU" value={stats.gpu} icon={MonitorSpeaker} />
        <StatBar label="GPU Temp" value={stats.gpuTemp} icon={Thermometer} unit="°C" />
        <StatBar label="Battery" value={stats.battery} icon={Battery} />
      </div>
      <div className="border-t border-border pt-3 space-y-2">
        <h4 className="text-[10px] font-display text-muted-foreground uppercase tracking-widest">Network</h4>
        <div className="flex items-center justify-between text-xs font-body">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Wifi size={12} />
            <span>Download</span>
          </div>
          <span className="font-display text-[11px] text-foreground">{stats.networkDown} MB/s</span>
        </div>
        <div className="flex items-center justify-between text-xs font-body">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Wifi size={12} />
            <span>Upload</span>
          </div>
          <span className="font-display text-[11px] text-foreground">{stats.networkUp} MB/s</span>
        </div>
      </div>
    </div>
  );
}
