import { cn } from '@/lib/utils';
import { BookOpen } from 'lucide-react';
import { SidebarPanelShell } from './SidebarPanelShell';

const ENDPOINTS = [
  { method: 'GET', path: '/api/tabs', desc: 'List all open tabs' },
  { method: 'POST', path: '/api/tabs', desc: 'Open a new tab' },
  { method: 'DELETE', path: '/api/tabs/:id', desc: 'Close a tab' },
  { method: 'GET', path: '/api/system', desc: 'System stats' },
  { method: 'POST', path: '/api/ai/chat', desc: 'Send AI message' },
  { method: 'GET', path: '/api/history', desc: 'Browsing history' },
  { method: 'GET', path: '/api/bookmarks', desc: 'List bookmarks' },
  { method: 'POST', path: '/api/lighthouse', desc: 'Run audit' },
  { method: 'GET', path: '/api/extensions', desc: 'List extensions' },
  { method: 'PUT', path: '/api/settings', desc: 'Update settings' },
];

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-success/15 text-success',
  POST: 'bg-info/15 text-info',
  DELETE: 'bg-error/15 text-error',
  PUT: 'bg-warning/15 text-warning',
};

interface ApiDocsPanelProps {
  onClose?: () => void;
}

export function ApiDocsPanel({ onClose }: ApiDocsPanelProps = {}) {
  return (
    <SidebarPanelShell title="API Documentation" icon={BookOpen} onClose={onClose ?? (() => {})}>
      <div className="p-3 space-y-3">
        <p className="text-[11px] font-body text-muted-foreground">Notilus REST API v2.0</p>
        <div className="space-y-1">
          {ENDPOINTS.map((ep, i) => (
            <div key={i} className="flex items-center gap-2 text-xs p-2 rounded-lg hover:bg-muted/50 transition-colors duration-fast cursor-pointer border border-transparent hover:border-border">
              <span className={cn("px-1.5 py-0.5 rounded-md font-display text-[9px] font-semibold shrink-0 uppercase tracking-wider", METHOD_COLORS[ep.method])}>
                {ep.method}
              </span>
              <span className="font-mono text-foreground truncate flex-1">{ep.path}</span>
            </div>
          ))}
        </div>
      </div>
    </SidebarPanelShell>
  );
}
