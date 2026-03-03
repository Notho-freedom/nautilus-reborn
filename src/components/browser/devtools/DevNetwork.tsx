import { useState } from 'react';
import { cn } from '@/lib/utils';

interface NetworkRequest {
  id: string;
  method: string;
  url: string;
  status: number;
  type: string;
  size: string;
  duration: string;
}

const MOCK_REQUESTS: NetworkRequest[] = [
  { id: '1', method: 'GET', url: '/api/users', status: 200, type: 'fetch', size: '4.2 KB', duration: '45ms' },
  { id: '2', method: 'GET', url: '/assets/logo.svg', status: 200, type: 'img', size: '1.1 KB', duration: '12ms' },
  { id: '3', method: 'POST', url: '/api/auth/login', status: 200, type: 'fetch', size: '256 B', duration: '234ms' },
  { id: '4', method: 'GET', url: '/api/dashboard/stats', status: 200, type: 'fetch', size: '8.7 KB', duration: '89ms' },
  { id: '5', method: 'GET', url: '/styles/main.css', status: 200, type: 'css', size: '32 KB', duration: '8ms' },
  { id: '6', method: 'GET', url: '/api/notifications', status: 304, type: 'fetch', size: '0 B', duration: '23ms' },
  { id: '7', method: 'PUT', url: '/api/users/preferences', status: 200, type: 'fetch', size: '128 B', duration: '156ms' },
  { id: '8', method: 'GET', url: '/api/missing-endpoint', status: 404, type: 'fetch', size: '64 B', duration: '12ms' },
  { id: '9', method: 'GET', url: '/api/server-error', status: 500, type: 'fetch', size: '128 B', duration: '2.1s' },
  { id: '10', method: 'GET', url: '/ws/live-updates', status: 101, type: 'ws', size: '—', duration: 'ongoing' },
];

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-green-400',
  POST: 'text-blue-400',
  PUT: 'text-yellow-400',
  DELETE: 'text-red-400',
  PATCH: 'text-purple-400',
};

export function DevNetwork() {
  const [filter, setFilter] = useState<string | null>(null);

  const types = [...new Set(MOCK_REQUESTS.map(r => r.type))];
  const filtered = filter ? MOCK_REQUESTS.filter(r => r.type === filter) : MOCK_REQUESTS;

  const statusColor = (s: number) => {
    if (s < 300) return 'text-green-400';
    if (s < 400) return 'text-blue-400';
    if (s < 500) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="flex flex-col h-full text-[11px] font-mono">
      {/* Filters */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-border bg-card/50 shrink-0">
        <button
          onClick={() => setFilter(null)}
          className={cn("px-1.5 py-0.5 rounded text-[10px]", !filter ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground')}
        >All</button>
        {types.map(t => (
          <button
            key={t}
            onClick={() => setFilter(filter === t ? null : t)}
            className={cn("px-1.5 py-0.5 rounded text-[10px] capitalize", filter === t ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground')}
          >{t}</button>
        ))}
        <div className="flex-1" />
        <span className="text-[10px] text-muted-foreground">{filtered.length} requests</span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[50px_50px_1fr_60px_60px_60px] gap-1 px-2 py-1 bg-secondary/30 text-[9px] text-muted-foreground uppercase tracking-wider shrink-0 border-b border-border">
        <span>Status</span><span>Method</span><span>URL</span><span>Type</span><span>Size</span><span>Time</span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filtered.map(r => (
          <div key={r.id} className="grid grid-cols-[50px_50px_1fr_60px_60px_60px] gap-1 px-2 py-1 border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer">
            <span className={statusColor(r.status)}>{r.status}</span>
            <span className={METHOD_COLORS[r.method] || 'text-foreground'}>{r.method}</span>
            <span className="text-foreground truncate">{r.url}</span>
            <span className="text-muted-foreground">{r.type}</span>
            <span className="text-muted-foreground">{r.size}</span>
            <span className={cn("text-muted-foreground", r.duration.includes('s') && !r.duration.includes('ms') ? 'text-yellow-400' : '')}>{r.duration}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
