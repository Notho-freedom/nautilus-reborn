import { cn } from '@/lib/utils';

interface Metric {
  name: string;
  fullName: string;
  value: number;
  unit: string;
  target: number;
  good: number;
  poor: number;
}

const METRICS: Metric[] = [
  { name: 'FCP', fullName: 'First Contentful Paint', value: 1.2, unit: 's', target: 1.8, good: 1.8, poor: 3.0 },
  { name: 'LCP', fullName: 'Largest Contentful Paint', value: 2.1, unit: 's', target: 2.5, good: 2.5, poor: 4.0 },
  { name: 'TTI', fullName: 'Time to Interactive', value: 3.4, unit: 's', target: 3.8, good: 3.8, poor: 7.3 },
  { name: 'TBT', fullName: 'Total Blocking Time', value: 150, unit: 'ms', target: 200, good: 200, poor: 600 },
  { name: 'CLS', fullName: 'Cumulative Layout Shift', value: 0.05, unit: '', target: 0.1, good: 0.1, poor: 0.25 },
];

function getColor(value: number, good: number, poor: number) {
  if (value <= good) return 'text-green-400';
  if (value <= poor) return 'text-yellow-400';
  return 'text-red-400';
}

function getBarColor(value: number, good: number, poor: number) {
  if (value <= good) return 'bg-green-500';
  if (value <= poor) return 'bg-yellow-500';
  return 'bg-red-500';
}

export function DevPerformance() {
  return (
    <div className="flex flex-col h-full text-[11px] font-mono p-3 overflow-y-auto scrollbar-thin">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Core Web Vitals</div>

      <div className="grid grid-cols-5 gap-3 mb-4">
        {METRICS.map(m => {
          const pct = Math.min(100, (m.value / m.poor) * 100);
          return (
            <div key={m.name} className="glass rounded-lg p-3 text-center">
              <div className="text-[9px] text-muted-foreground mb-1">{m.name}</div>
              <div className={cn("text-lg font-bold", getColor(m.value, m.good, m.poor))}>
                {m.value}{m.unit}
              </div>
              <div className="text-[8px] text-muted-foreground mt-0.5">{m.fullName}</div>
              <div className="mt-2 h-1 rounded-full bg-secondary overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", getBarColor(m.value, m.good, m.poor))} style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between mt-0.5 text-[8px] text-muted-foreground">
                <span>0</span><span>{m.poor}{m.unit}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Resource Breakdown</div>
      <div className="space-y-1.5">
        {[
          { label: 'JavaScript', size: '245 KB', pct: 45 },
          { label: 'CSS', size: '32 KB', pct: 6 },
          { label: 'Images', size: '180 KB', pct: 33 },
          { label: 'Fonts', size: '68 KB', pct: 12 },
          { label: 'Other', size: '20 KB', pct: 4 },
        ].map(r => (
          <div key={r.label}>
            <div className="flex justify-between text-[10px] mb-0.5">
              <span className="text-foreground">{r.label}</span>
              <span className="text-muted-foreground">{r.size} ({r.pct}%)</span>
            </div>
            <div className="h-1 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full notilus-gradient" style={{ width: `${r.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
