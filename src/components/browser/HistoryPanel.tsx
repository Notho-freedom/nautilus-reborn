import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, MoreVertical, X } from 'lucide-react';
import {
  clearHistoryItems,
  getHistoryItems,
  removeHistoryItem,
  subscribeToHistoryUpdates,
  type HistoryItem,
} from '@/lib/history';
import { SidebarPanelShell } from './SidebarPanelShell';
import { PanelEmptyState } from './PanelEmptyState';
import { BrowserImportDialog } from './BrowserImportDialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { WorkspaceTab } from '@/lib/workspaces';

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

function getDateKey(visitedAt: string): string {
  const date = new Date(visitedAt);
  if (Number.isNaN(date.getTime())) return 'unknown';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateValue(key: string): number {
  const [year, month, day] = key.split('-').map(Number);
  if (!year || !month || !day) return 0;
  return new Date(year, month - 1, day).getTime();
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
  onOpenUrlsInCurrentWindow?: (items: WorkspaceTab[]) => void;
  onOpenUrlsInNewWindow?: (items: WorkspaceTab[]) => void;
  onClose?: () => void;
}

export function HistoryPanel({
  onNavigate,
  onOpenUrlsInCurrentWindow,
  onOpenUrlsInNewWindow,
  onClose,
}: HistoryPanelProps) {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [isImportDialogOpen, setImportDialogOpen] = useState(false);
  const [expandedDates, setExpandedDates] = useState<string[]>([]);

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

  const grouped = useMemo(() => {
    const map = new Map<string, { key: string; label: string; items: HistoryItem[]; sortValue: number }>();
    for (const item of filtered) {
      const key = getDateKey(item.visitedAt);
      const label = getDateLabel(item.visitedAt);
      if (!map.has(key)) {
        map.set(key, { key, label, items: [], sortValue: getDateValue(key) });
      }
      map.get(key)!.items.push(item);
    }
    return Array.from(map.values()).sort((a, b) => b.sortValue - a.sortValue);
  }, [filtered]);

  useEffect(() => {
    if (expandedDates.length > 0) return;
    if (grouped.length === 0) return;
    setExpandedDates([grouped[0].key]);
  }, [grouped, expandedDates.length]);

  return (
    <>
      <SidebarPanelShell
        title="History"
        icon={Clock}
        searchable
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search history..."
        onClose={onClose ?? (() => {})}
        menuItems={[
          { label: 'Import from browser', onClick: () => setImportDialogOpen(true) },
          { label: 'Clear all history', onClick: clearHistoryItems },
        ]}
        footer={`${filtered.length} entries • Ctrl+H`}
        contentClassName={filtered.length === 0 ? 'flex' : undefined}
      >
        <Accordion
          type="multiple"
          value={expandedDates}
          onValueChange={setExpandedDates}
          className="px-0"
        >
          {grouped.map(group => (
            <AccordionItem key={group.key} value={group.key} className="border-border/50">
              <AccordionTrigger className="px-3 py-2 text-[10px] font-display uppercase tracking-widest text-muted-foreground hover:no-underline">
                <div className="flex items-center gap-2 w-full">
                  <span className="flex-1 text-left">{group.label}</span>
                  <span className="text-[9px] font-body text-muted-foreground">{group.items.length}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={event => event.stopPropagation()}
                        className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors duration-fast"
                      >
                        <MoreVertical size={12} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass border-border min-w-[190px]">
                      <DropdownMenuItem
                        onClick={() =>
                          onOpenUrlsInCurrentWindow?.(
                            group.items.map(item => ({
                              url: item.url,
                              title: item.title,
                              pinned: false,
                            }))
                          )
                        }
                        className="text-xs font-body cursor-pointer"
                      >
                        Open all in current window
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          onOpenUrlsInNewWindow?.(
                            group.items.map(item => ({
                              url: item.url,
                              title: item.title,
                              pinned: false,
                            }))
                          )
                        }
                        className="text-xs font-body cursor-pointer"
                      >
                        Open all in new window
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-1 pt-0">
                {group.items.map(h => {
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
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        {filtered.length === 0 && (
          <PanelEmptyState
            icon={Clock}
            title={items.length === 0 ? 'No history yet' : 'No results found'}
          />
        )}
      </SidebarPanelShell>
      <BrowserImportDialog
        open={isImportDialogOpen}
        onOpenChange={setImportDialogOpen}
        defaultDatasets={['history']}
      />
    </>
  );
}
