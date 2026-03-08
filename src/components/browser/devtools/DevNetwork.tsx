import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NetworkRequest } from '@/types/devtools';

interface DevNetworkProps {
  requests: NetworkRequest[];
  onClear: () => void;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-green-400',
  POST: 'text-blue-400',
  PUT: 'text-yellow-400',
  DELETE: 'text-red-400',
  PATCH: 'text-purple-400',
  HEAD: 'text-cyan-400',
  OPTIONS: 'text-orange-400',
  CONNECT: 'text-fuchsia-400',
  TRACE: 'text-pink-400',
  OTHER: 'text-foreground',
};

function formatBytes(value?: number): string {
  if (value == null || Number.isNaN(value)) return '-';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDuration(value?: number): string {
  if (value == null || Number.isNaN(value)) return '-';
  if (value < 1000) return `${Math.round(value)}ms`;
  return `${(value / 1000).toFixed(2)}s`;
}

function statusColor(status?: number): string {
  if (status == null) return 'text-muted-foreground';
  if (status < 300) return 'text-green-400';
  if (status < 400) return 'text-blue-400';
  if (status < 500) return 'text-yellow-400';
  return 'text-red-400';
}

export function DevNetwork({ requests, onClear }: DevNetworkProps) {
  const [filterType, setFilterType] = useState<string | null>(null);

  const types = useMemo(() => {
    const values = requests.map(request => {
      if (request.mimeType?.includes('json')) return 'fetch';
      if (request.mimeType?.includes('javascript')) return 'js';
      if (request.mimeType?.includes('css')) return 'css';
      if (request.mimeType?.includes('image')) return 'img';
      return request.mimeType?.split('/')[0] ?? 'other';
    });
    return Array.from(new Set(values));
  }, [requests]);

  const filteredRequests = useMemo(() => {
    if (!filterType) return requests;
    return requests.filter(request => {
      if (filterType === 'fetch') return request.mimeType?.includes('json');
      if (filterType === 'js') return request.mimeType?.includes('javascript');
      if (filterType === 'css') return request.mimeType?.includes('css');
      if (filterType === 'img') return request.mimeType?.includes('image');
      return (request.mimeType?.split('/')[0] ?? 'other') === filterType;
    });
  }, [filterType, requests]);

  return (
    <div className="flex h-full flex-col text-[11px] font-mono">
      <div className="flex items-center gap-1 border-b border-border/35 bg-card/50 px-2 py-1 shrink-0">
        <button
          type="button"
          onClick={onClear}
          className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
          title="Clear requests"
        >
          <Trash2 size={12} />
        </button>
        <button
          type="button"
          onClick={() => setFilterType(null)}
          className={cn(
            'rounded px-1.5 py-0.5 text-[10px]',
            !filterType ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          All
        </button>
        {types.map(type => (
          <button
            key={type}
            type="button"
            onClick={() => setFilterType(current => (current === type ? null : type))}
            className={cn(
              'rounded px-1.5 py-0.5 text-[10px] capitalize',
              filterType === type
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {type}
          </button>
        ))}
        <div className="flex-1" />
        <span className="text-[10px] text-muted-foreground">{filteredRequests.length} requests</span>
      </div>

      <div className="grid shrink-0 grid-cols-[54px_56px_1fr_70px_70px_70px] gap-1 border-b border-border/35 bg-secondary/30 px-2 py-1 text-[9px] uppercase tracking-wider text-muted-foreground">
        <span>Status</span>
        <span>Method</span>
        <span>URL</span>
        <span>Type</span>
        <span>Size</span>
        <span>Time</span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filteredRequests.map(request => (
          <div
            key={`${request.id}-${request.status}-${request.statusCode}`}
            className="grid cursor-pointer grid-cols-[54px_56px_1fr_70px_70px_70px] gap-1 border-b border-border/30 px-2 py-1 transition-colors hover:bg-muted/20"
          >
            <span className={statusColor(request.statusCode)}>{request.statusCode ?? '-'}</span>
            <span className={METHOD_COLORS[request.method] ?? 'text-foreground'}>{request.method}</span>
            <span className="truncate text-foreground">{request.url}</span>
            <span className="truncate text-muted-foreground">{request.mimeType ?? '-'}</span>
            <span className="text-muted-foreground">{formatBytes(request.responseSize)}</span>
            <span className={cn('text-muted-foreground', (request.duration ?? 0) >= 1000 ? 'text-yellow-400' : '')}>
              {formatDuration(request.duration)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
