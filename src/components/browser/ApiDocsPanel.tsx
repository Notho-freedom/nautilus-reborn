import { cn } from '@/lib/utils';

const ENDPOINTS = [
  { method: 'GET', path: '/api/tabs', desc: 'List all open tabs' },
  { method: 'POST', path: '/api/tabs', desc: 'Open a new tab' },
  { method: 'DELETE', path: '/api/tabs/:id', desc: 'Close a tab' },
  { method: 'GET', path: '/api/system', desc: 'System stats' },
  { method: 'POST', path: '/api/ai/chat', desc: 'Send AI message' },
  { method: 'GET', path: '/api/history', desc: 'Browsing history' },
  { method: 'GET', path: '/api/bookmarks', desc: 'List bookmarks' },
  { method: 'POST', path: '/api/lighthouse', desc: 'Run audit' },
];

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-500/15 text-green-500',
  POST: 'bg-blue-500/15 text-blue-400',
  DELETE: 'bg-destructive/15 text-destructive',
  PUT: 'bg-accent/15 text-accent',
};

export function ApiDocsPanel() {
  return (
    <div className="p-3 space-y-4 overflow-y-auto scrollbar-thin">
      <h3 className="text-xs font-mono font-semibold text-primary uppercase tracking-wider">
        API Documentation
      </h3>
      <p className="text-[10px] text-muted-foreground">Notilus REST API v2.0</p>
      <div className="space-y-1.5">
        {ENDPOINTS.map((ep, i) => (
          <div key={i} className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-muted/50 transition-colors cursor-pointer">
            <span className={cn("px-1.5 py-0.5 rounded font-mono text-[9px] font-semibold shrink-0", METHOD_COLORS[ep.method])}>
              {ep.method}
            </span>
            <span className="font-mono text-foreground truncate">{ep.path}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
