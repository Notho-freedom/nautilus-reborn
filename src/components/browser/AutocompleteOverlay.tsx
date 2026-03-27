import { Bookmark, Clock, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AutocompleteItem, AutocompleteSection } from '@/lib/autocomplete';

interface AutocompleteOverlayProps {
  sections: AutocompleteSection[];
  activeItemId?: string;
  onSelect: (item: AutocompleteItem) => void;
  onSwitchToTab?: (tabId: string) => void;
  className?: string;
}

function getSectionIcon(id: AutocompleteSection['id']) {
  if (id === 'history') return Clock;
  if (id === 'bookmarks') return Bookmark;
  return Search;
}

function getFaviconUrl(url?: string): string | null {
  if (!url) return null;
  if (url.startsWith('notilus://')) return null;
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=16`;
  } catch {
    return null;
  }
}

export function AutocompleteOverlay({
  sections,
  activeItemId,
  onSelect,
  onSwitchToTab,
  className,
}: AutocompleteOverlayProps) {
  if (sections.length === 0) return null;

  return (
    <div
      className={cn(
        'absolute left-0 right-0 top-full mt-2 z-50',
        className
      )}
    >
      <div className="glass border border-border rounded-xl shadow-lg overflow-hidden">
        <div className="max-h-[360px] overflow-y-auto no-scrollbar py-2">
          {sections.map(section => {
            const SectionIcon = getSectionIcon(section.id);
            return (
              <div key={section.id} className="px-2">
                <div className="flex items-center gap-2 px-2 py-1 text-[10px] font-display uppercase tracking-widest text-muted-foreground">
                  <SectionIcon size={11} />
                  {section.title}
                </div>
                <div className="space-y-1 pb-2">
                  {section.items.map(item => {
                    const faviconUrl = getFaviconUrl(item.url);
                    const isActive = item.id === activeItemId;
                    return (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={-1}
                        onMouseDown={event => {
                          event.preventDefault();
                          onSelect(item);
                        }}
                        className={cn(
                          'group flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-colors',
                          isActive
                            ? 'bg-primary/15 text-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                        )}
                      >
                        <div className="h-6 w-6 flex items-center justify-center overflow-hidden shrink-0">
                          {faviconUrl ? (
                            <img src={faviconUrl} alt="" className="h-4 w-4" />
                          ) : (
                            <SectionIcon size={13} className="text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-body text-foreground truncate">{item.title}</div>
                          {item.subtitle && (
                            <div className="text-[11px] font-body text-muted-foreground truncate">{item.subtitle}</div>
                          )}
                        </div>
                        {item.openTabId && onSwitchToTab && (
                          <button
                            type="button"
                            onMouseDown={event => {
                              event.preventDefault();
                              event.stopPropagation();
                              onSwitchToTab(item.openTabId!);
                            }}
                            className="h-7 px-2 rounded-md text-[10px] font-body text-muted-foreground border border-border/60 hover:text-foreground hover:bg-muted/50 transition-colors"
                          >
                            Switch
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
