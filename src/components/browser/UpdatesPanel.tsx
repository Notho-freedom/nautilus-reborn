import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Bug, Check, Clock, RefreshCw, Shield, Sparkles, Zap } from 'lucide-react';
import {
  checkForUpdates,
  getUpdatesSnapshot,
  type UpdateCategory,
  type UpdatesSnapshot,
} from '@/lib/updates';
import { SidebarPanelShell } from './SidebarPanelShell';

const CATEGORY_ICONS: Record<UpdateCategory, React.ElementType> = {
  feature: Sparkles,
  fix: Bug,
  improvement: Zap,
  security: Shield,
};

const CATEGORY_COLORS: Record<UpdateCategory, string> = {
  feature: 'text-info',
  fix: 'text-error',
  improvement: 'text-warning',
  security: 'text-success',
};

function formatDate(input: string): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return date.toISOString().slice(0, 10);
}

interface UpdatesPanelProps {
  onClose?: () => void;
}

export function UpdatesPanel({ onClose }: UpdatesPanelProps = {}) {
  const [search, setSearch] = useState('');
  const [checking, setChecking] = useState(false);
  const [snapshot, setSnapshot] = useState<UpdatesSnapshot>(() => getUpdatesSnapshot());

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return snapshot.items;
    return snapshot.items.filter(item => item.title.toLowerCase().includes(query) || item.description.toLowerCase().includes(query) || item.category.toLowerCase().includes(query));
  }, [snapshot.items, search]);

  const handleCheck = async () => {
    setChecking(true);
    try { const next = await checkForUpdates(); setSnapshot(next); } finally { setChecking(false); }
  };

  useEffect(() => {
    if (!snapshot.checkedAt) { void handleCheck(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SidebarPanelShell
      title="Updates"
      icon={RefreshCw}
      searchable
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search updates..."
      onClose={onClose ?? (() => {})}
      menuItems={[
        { label: 'Check for updates', onClick: () => void handleCheck() },
      ]}
    >
      <div className="p-3 space-y-3">
        <div className="rounded-lg bg-notilus-surface-2/40 p-2.5">
          <div className="text-[10px] font-body text-muted-foreground">Current: <span className="text-foreground tabular-nums">{snapshot.currentVersion}</span></div>
          <div className="text-[10px] font-body text-muted-foreground">Latest: <span className="text-foreground tabular-nums">{snapshot.latestVersion ?? 'Unknown'}</span></div>
          {snapshot.updateAvailable ? (
            <div className="text-[10px] font-body text-info mt-1">A newer version is available.</div>
          ) : (
            <div className="text-[10px] font-body text-success mt-1">You are up to date.</div>
          )}
          {snapshot.checkedAt && <div className="text-[9px] font-body text-muted-foreground/70 mt-1">Last check: {formatDate(snapshot.checkedAt)}</div>}
        </div>

        {snapshot.error && (
          <div className="flex items-center gap-1.5 text-[10px] font-body text-warning bg-warning/10 rounded-md p-2">
            <AlertCircle size={11} strokeWidth={1.5} />{snapshot.error}
          </div>
        )}

        {!checking && filtered.length === 0 && (
          <div className="flex flex-col items-center py-6 text-center">
            <Check size={24} strokeWidth={1.25} className="text-success mb-2" />
            <p className="text-xs font-body text-muted-foreground">No matching updates.</p>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map(update => {
            const Icon = CATEGORY_ICONS[update.category];
            return (
              <div key={update.id} className="p-2.5 rounded-lg bg-notilus-surface-2/40 space-y-1 hover:bg-notilus-surface-2/60 transition-colors">
                <div className="flex items-center gap-2"><Icon size={12} strokeWidth={1.5} className={CATEGORY_COLORS[update.category]} /><span className="text-xs font-body text-foreground flex-1">{update.title}</span></div>
                <p className="text-[10px] font-body text-muted-foreground">{update.description}</p>
                <div className="flex items-center gap-1 text-[9px] font-body text-muted-foreground"><Clock size={9} strokeWidth={1.5} /> {formatDate(update.date)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </SidebarPanelShell>
  );
}
