import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PerformanceMetrics } from '@/types/devtools';

interface DevPerformanceProps {
  metrics: PerformanceMetrics | null;
  onRefresh: () => void;
}

interface MetricLine {
  name: string;
  key: keyof PerformanceMetrics;
  unit: string;
  good: number;
  poor: number;
}

const METRIC_LINES: MetricLine[] = [
  { name: 'FCP', key: 'firstContentfulPaint', unit: 'ms', good: 1800, poor: 3000 },
  { name: 'LCP', key: 'largestContentfulPaint', unit: 'ms', good: 2500, poor: 4000 },
  { name: 'TTI', key: 'timeToInteractive', unit: 'ms', good: 3800, poor: 7300 },
  { name: 'TBT', key: 'totalBlockingTime', unit: 'ms', good: 200, poor: 600 },
  { name: 'CLS', key: 'cumulativeLayoutShift', unit: '', good: 0.1, poor: 0.25 },
];

function valueColor(value: number | undefined, good: number, poor: number): string {
  if (value == null || Number.isNaN(value)) return 'text-muted-foreground';
  if (value <= good) return 'text-green-400';
  if (value <= poor) return 'text-yellow-400';
  return 'text-red-400';
}

function barColor(value: number | undefined, good: number, poor: number): string {
  if (value == null || Number.isNaN(value)) return 'bg-muted';
  if (value <= good) return 'bg-green-500';
  if (value <= poor) return 'bg-yellow-500';
  return 'bg-red-500';
}

function formatMetric(value: number | undefined, unit: string): string {
  if (value == null || Number.isNaN(value)) return '-';
  if (unit === 'ms' && value >= 1000) {
    return `${(value / 1000).toFixed(2)}s`;
  }
  if (unit === '') {
    return value.toFixed(3);
  }
  return `${Math.round(value)}${unit}`;
}

function toPercent(value: number | undefined, poor: number): number {
  if (value == null || Number.isNaN(value) || poor <= 0) return 0;
  return Math.max(0, Math.min(100, (value / poor) * 100));
}

export function DevPerformance({ metrics, onRefresh }: DevPerformanceProps) {
  return (
    <div className="flex h-full flex-col overflow-y-auto p-3 text-[11px] font-mono scrollbar-thin">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">Core Web Vitals</div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex h-6 items-center gap-1 rounded-full px-2 text-[10px] text-muted-foreground transition-colors hover:bg-notilus-surface-2/60 hover:text-foreground"
        >
          <RefreshCw size={11} strokeWidth={1.5} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {METRIC_LINES.map(metric => {
          const value = metrics?.[metric.key] as number | undefined;
          const percentage = toPercent(value, metric.poor);
          return (
            <div key={metric.name} className="rounded-lg bg-notilus-surface-2/40 p-3 text-center">
              <div className="mb-1 text-[9px] text-muted-foreground/70 uppercase tracking-wider">{metric.name}</div>
              <div className={cn('text-lg font-bold tabular-nums', valueColor(value, metric.good, metric.poor))}>
                {formatMetric(value, metric.unit)}
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-notilus-surface-2/60">
                <div
                  className={cn('h-full rounded-full transition-all', barColor(value, metric.good, metric.poor))}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-lg bg-notilus-surface-2/40 p-3">
        <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">Runtime Counters</div>
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">DOM Nodes</span>
            <span className="text-foreground tabular-nums">{metrics?.domNodes ?? '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Resources</span>
            <span className="text-foreground tabular-nums">{metrics?.resources ?? '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Heap Total</span>
            <span className="text-foreground tabular-nums">
              {metrics?.jsHeapSize != null ? `${(metrics.jsHeapSize / 1024 / 1024).toFixed(1)} MB` : '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Heap Used</span>
            <span className="text-foreground tabular-nums">
              {metrics?.usedJsHeapSize != null ? `${(metrics.usedJsHeapSize / 1024 / 1024).toFixed(1)} MB` : '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Transfer Size</span>
            <span className="text-foreground tabular-nums">
              {metrics?.transferSize != null ? `${(metrics.transferSize / 1024).toFixed(1)} KB` : '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Page Load</span>
            <span className="text-foreground tabular-nums">
              {metrics?.pageLoadTime != null ? `${Math.round(metrics.pageLoadTime)}ms` : '-'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
