import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Clock, Trash2, X } from 'lucide-react';
import {
  clearHistoryItems,
  getHistoryItems,
  removeHistoryItem,
  subscribeToHistoryUpdates,
  type HistoryItem,
} from '@/lib/history';

function getDateLabel(visitedAt: string): string {
  const date = new Date(visitedAt);
  if (Number.isNaN(date.getTime())) return 'Unknown';

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startToday.getTime() - startDate.getTime()) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString();
}

function getTimeLabel(visitedAt: string): string {
  const date = new Date(visitedAt);
  if (Number.isNaN(date.getTime())) return '';

  const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSeconds < 60) return 'Just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} min ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} h ago`;
  if (diffSeconds < 172800) return 'Yesterday';
  return `${Math.floor(diffSeconds / 86400)} d ago`;
}

function getFaviconUrl(url: string): string | null {
  try {
    const hostname = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=16`;
  } catch {
    return null;
  }
}

interface HistoryPanelProps {
  onNavigate?: (url: string) => void;
}

export function HistoryPanel({ onNavigate }: HistoryPanelProps) {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<HistoryItem[]>([]);

  const refresh = useCallback(() => {
    setItems(getHistoryItems());
  }, []);

  useEffect(() => {
    refresh();
    return subscribeToHistoryUpdates(refresh);
  }, [refresh]);

  const filtered = useMemo(
    () =>
      items.filter(
        h =>
          !search ||
          h.title.toLowerCase().includes(search.toLowerCase()) ||
          h.url.toLowerCase().includes(search.toLowerCase())
      ),
    [items, search]
  );

  const grouped = useMemo(
    () =>
      filtered.reduce((acc, item) => {
        const dateLabel = getDateLabel(item.visitedAt);
        (acc[dateLabel] = acc[dateLabel] || []).push(item);
        return acc;
      }, {} as Record<string, HistoryItem[]>),
    [filtered]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-display font-semibold text-primary uppercase tracking-widest flex items-center gap-1.5">
            <Clock size={12} /> History
          </h3>
          <button
            onClick={clearHistoryItems}
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-fast"
            title="Clear history"
          >
            <Trash2 size={12} />
          </button>
        </div>
        <div className="flex items-center h-8 rounded-lg bg-notilus-surface-1 border border-border px-2 gap-1.5">
          <Search size={12} className="text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search history..."
            className="flex-1 bg-transparent text-xs font-body text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {Object.entries(grouped).map(([date, entries]) => (
          <div key={date}>
            <div className="px-3 py-1.5 bg-notilus-surface-2/50 text-[10px] font-display text-muted-foreground uppercase tracking-widest sticky top-0">
              {date}
            </div>
            {entries.map(h => {
              const faviconUrl = getFaviconUrl(h.url);
              return (
                <div
                  key={h.id}
                  className="group flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors duration-fast cursor-pointer"
                  onClick={() => onNavigate?.(h.url)}
                >
                  {faviconUrl ? (
                    <img
                      src={faviconUrl}
                      alt=""
                      className="w-4 h-4 rounded-sm"
                      onError={e => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-4 h-4 rounded-sm bg-muted/60" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-body text-foreground truncate">{h.title}</div>
                    <div className="text-[10px] font-body text-muted-foreground truncate">{h.url}</div>
                  </div>
                  <span className="text-[10px] font-body text-muted-foreground shrink-0">{getTimeLabel(h.visitedAt)}</span>
                  <button
                    onClick={event => {
                      event.stopPropagation();
                      removeHistoryItem(h.id);
                    }}
                    className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all duration-fast"
                    title="Remove entry"
                  >
                    <X size={10} />
                  </button>
                </div>
              );
            })}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="p-6 text-center text-xs font-body text-muted-foreground">
            {items.length === 0 ? 'No history yet' : 'No results found'}
          </div>
        )}
      </div>

      <div className="p-2 border-t border-border">
        <div className="text-[10px] font-body text-muted-foreground text-center">
          {filtered.length} entries • Ctrl+H
        </div>
      </div>
    </div>
  );
}
