import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Bug, Check, Clock, RefreshCw, Search, Shield, Sparkles, Zap } from 'lucide-react';
import {
  checkForUpdates,
  getUpdatesSnapshot,
  type UpdateCategory,
  type UpdatesSnapshot,
} from '@/lib/updates';

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

export function UpdatesPanel() {
  const [search, setSearch] = useState('');
  const [checking, setChecking] = useState(false);
  const [snapshot, setSnapshot] = useState<UpdatesSnapshot>(() => getUpdatesSnapshot());

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return snapshot.items;
    return snapshot.items.filter(item => {
      return (
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      );
    });
  }, [snapshot.items, search]);

  const handleCheck = async () => {
    setChecking(true);
    try {
      const next = await checkForUpdates();
      setSnapshot(next);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (!snapshot.checkedAt) {
      void handleCheck();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-3 space-y-3 overflow-y-auto scrollbar-thin flex-1">
      <h3 className="text-xs font-display font-semibold text-primary uppercase tracking-widest">Updates</h3>

      <div className="flex items-center gap-2 h-8 rounded-lg bg-notilus-surface-1 border border-border px-2">
        <Search size={12} className="text-muted-foreground" />
        <input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search updates..."
          className="flex-1 bg-transparent text-xs font-body text-foreground placeholder:text-muted-foreground outline-none"
        />
      </div>

      <button
        onClick={() => void handleCheck()}
        disabled={checking}
        className="w-full flex items-center justify-center gap-2 h-8 rounded-lg bg-primary/10 text-primary text-xs font-display tracking-wider hover:bg-primary/20 transition-colors duration-fast disabled:opacity-50"
      >
        {checking ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
        {checking ? 'Checking...' : 'Check for Updates'}
      </button>

      <div className="rounded-lg border border-border bg-notilus-surface-1 p-2">
        <div className="text-[10px] font-body text-muted-foreground">
          Current: <span className="text-foreground">{snapshot.currentVersion}</span>
        </div>
        <div className="text-[10px] font-body text-muted-foreground">
          Latest: <span className="text-foreground">{snapshot.latestVersion ?? 'Unknown'}</span>
        </div>
        {snapshot.updateAvailable ? (
          <div className="text-[10px] font-body text-info mt-1">A newer version is available.</div>
        ) : (
          <div className="text-[10px] font-body text-success mt-1">You are up to date.</div>
        )}
        {snapshot.checkedAt && (
          <div className="text-[9px] font-body text-muted-foreground/70 mt-1">
            Last check: {formatDate(snapshot.checkedAt)}
          </div>
        )}
      </div>

      {snapshot.error && (
        <div className="flex items-center gap-1.5 text-[10px] font-body text-warning bg-warning/10 border border-warning/30 rounded-md p-2">
          <AlertCircle size={11} />
          {snapshot.error}
        </div>
      )}

      {!checking && filtered.length === 0 && (
        <div className="flex flex-col items-center py-6 text-center">
          <Check size={24} className="text-success mb-2" />
          <p className="text-xs font-body text-muted-foreground">No matching updates.</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(update => {
          const Icon = CATEGORY_ICONS[update.category];
          return (
            <div key={update.id} className="p-2.5 rounded-lg bg-notilus-surface-1 border border-border space-y-1">
              <div className="flex items-center gap-2">
                <Icon size={12} className={CATEGORY_COLORS[update.category]} />
                <span className="text-xs font-body text-foreground flex-1">{update.title}</span>
              </div>
              <p className="text-[10px] font-body text-muted-foreground">{update.description}</p>
              <div className="flex items-center gap-1 text-[9px] font-body text-muted-foreground">
                <Clock size={9} /> {formatDate(update.date)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
