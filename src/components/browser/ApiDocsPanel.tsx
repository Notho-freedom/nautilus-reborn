import { useMemo, useState } from 'react';
import { BookOpen, Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SidebarPanelShell } from './SidebarPanelShell';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  desc: string;
  group: 'Browser' | 'System' | 'Studio' | 'Git' | 'Terminal';
}

const ENDPOINTS: ApiEndpoint[] = [
  { method: 'GET', path: '/api/tabs', desc: 'List open tabs', group: 'Browser' },
  { method: 'POST', path: '/api/tabs', desc: 'Create a tab', group: 'Browser' },
  { method: 'DELETE', path: '/api/tabs/:id', desc: 'Close a tab', group: 'Browser' },
  { method: 'GET', path: '/api/system/metrics', desc: 'Read live system metrics', group: 'System' },
  { method: 'GET', path: '/api/git/state', desc: 'Get current repository state', group: 'Git' },
  { method: 'POST', path: '/api/git/commit', desc: 'Commit staged changes', group: 'Git' },
  { method: 'POST', path: '/api/studio/capture', desc: 'Capture viewport/full page', group: 'Studio' },
  { method: 'PUT', path: '/api/studio/viewport', desc: 'Apply WebView viewport preset', group: 'Studio' },
  { method: 'POST', path: '/api/terminal/open', desc: 'Open a terminal session', group: 'Terminal' },
  { method: 'POST', path: '/api/terminal/input', desc: 'Write to terminal stdin', group: 'Terminal' },
  { method: 'POST', path: '/api/terminal/resize', desc: 'Resize terminal cols/rows', group: 'Terminal' },
  { method: 'DELETE', path: '/api/terminal/:id', desc: 'Close terminal session', group: 'Terminal' },
];

const METHOD_COLORS: Record<ApiEndpoint['method'], string> = {
  GET: 'bg-success/15 text-success',
  POST: 'bg-info/15 text-info',
  PUT: 'bg-warning/15 text-warning',
  DELETE: 'bg-error/15 text-error',
};

const GROUPS: ApiEndpoint['group'][] = ['Browser', 'System', 'Studio', 'Git', 'Terminal'];

interface ApiDocsPanelProps {
  onClose?: () => void;
}

export function ApiDocsPanel({ onClose }: ApiDocsPanelProps = {}) {
  const [query, setQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<ApiEndpoint['group'] | null>(null);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return ENDPOINTS.filter(endpoint => {
      const groupMatches = !activeGroup || endpoint.group === activeGroup;
      if (!groupMatches) return false;
      if (!normalizedQuery) return true;
      return (
        endpoint.path.toLowerCase().includes(normalizedQuery) ||
        endpoint.desc.toLowerCase().includes(normalizedQuery) ||
        endpoint.group.toLowerCase().includes(normalizedQuery) ||
        endpoint.method.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [activeGroup, query]);

  const grouped = useMemo(() => {
    return GROUPS.map(group => ({
      group,
      items: filtered.filter(endpoint => endpoint.group === group),
    })).filter(section => section.items.length > 0);
  }, [filtered]);

  return (
    <SidebarPanelShell
      title="API Documentation"
      icon={BookOpen}
      searchable
      searchValue={query}
      onSearchChange={setQuery}
      searchPlaceholder="Search endpoint, method, group..."
      filters={GROUPS.map(group => ({ label: group, value: group }))}
      activeFilter={activeGroup}
      onFilterChange={value => setActiveGroup((value as ApiEndpoint['group']) ?? null)}
      onClose={onClose ?? (() => {})}
      footer={`${filtered.length} endpoints • desktop contracts`}
    >
      <div className="space-y-3 p-3">
        <div className="rounded-lg bg-notilus-surface-2/40 p-2 text-[11px] text-muted-foreground">
          Notilus IPC/desktop API reference for browser, system, studio and terminal modules.
        </div>

        {grouped.map(section => (
          <div key={section.group} className="space-y-1">
            <div className="text-[10px] font-display uppercase tracking-[0.18em] text-primary/85">
              {section.group}
            </div>
            <div className="space-y-1">
              {section.items.map(endpoint => (
                <div
                  key={`${endpoint.method}:${endpoint.path}`}
                  className="rounded-lg bg-notilus-surface-2/30 p-2 transition-colors hover:bg-notilus-surface-2/60"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className={cn(
                        'rounded-md px-1.5 py-0.5 text-[9px] font-display uppercase tracking-wider',
                        METHOD_COLORS[endpoint.method]
                      )}
                    >
                      {endpoint.method}
                    </span>
                    <span className="truncate font-mono text-[11px] text-foreground">{endpoint.path}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Code2 size={10} strokeWidth={1.5} />
                    <span>{endpoint.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No endpoint matches this search.
          </div>
        )}
      </div>
    </SidebarPanelShell>
  );
}
