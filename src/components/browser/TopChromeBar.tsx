import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, LayoutGrid, Layers, Loader2, Minus, Pin, Plus, Search, Square, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BrowserTab, RecentlyClosedTab } from '@/hooks/useBrowserState';
import { computeTabWidth, getTabDisplayMode, getTabIconSize } from '@/lib/tabLayout';
import { extractDisplayDomain, extractDomainGroup } from '@/lib/urlDisplay';
import { groupTabsByDomain, getDomainColor, getDomainColorBg, type TabGroup } from '@/lib/tabGrouping';
import {
  desktopCloseWindow,
  desktopGetWindowState,
  desktopMinimizeWindow,
  desktopToggleMaximizeWindow,
  isDesktopRuntime,
  onDesktopWindowStateChanged,
} from '@/lib/electronBridge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface TopChromeBarProps {
  tabs: BrowserTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onAddTab: () => void;
  onDuplicateTab?: (id: string) => void;
  onTogglePinTab: (id: string) => void;
  recentlyClosedTabs: RecentlyClosedTab[];
  onReopenClosedTab: (id: string) => void;
  onClearClosedTabs: () => void;
}

function getFaviconUrl(url: string): string | null {
  if (url.startsWith('notilus://')) return null;
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=16`;
  } catch {
    return null;
  }
}

function TabIcon({ tab, size }: { tab: BrowserTab; size: number }) {
  const [faviconError, setFaviconError] = useState(false);
  const faviconUrl = getFaviconUrl(tab.url);
  if (tab.isLoading) {
    return <Loader2 size={size} className="text-primary animate-spin shrink-0" />;
  }
  if (faviconUrl && !faviconError) {
    return (
      <img
        src={faviconUrl}
        alt=""
        className="rounded-sm shrink-0"
        style={{ width: size, height: size }}
        onError={() => setFaviconError(true)}
      />
    );
  }
  return (
    <LayoutGrid size={size} className="text-muted-foreground shrink-0" />
  );
}

function ActionHint({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom" className="glass text-xs font-body">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function TopChromeBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onAddTab,
  onDuplicateTab,
  onTogglePinTab,
  recentlyClosedTabs,
  onReopenClosedTab,
  onClearClosedTabs,
}: TopChromeBarProps) {
  const desktopMode = isDesktopRuntime();
  const [isMaximized, setIsMaximized] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ tabId: string; x: number; y: number } | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const tabsAreaRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!desktopMode) return;

    let mounted = true;
    void desktopGetWindowState().then(state => {
      if (!mounted || !state) return;
      setIsMaximized(state.isMaximized);
    });

    const unsubscribe = onDesktopWindowStateChanged(state => {
      if (!mounted) return;
      setIsMaximized(state.isMaximized);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [desktopMode]);

  useEffect(() => {
    const element = tabsAreaRef.current;
    if (!element) return;

    const update = () => {
      setTabsAreaWidth(Math.round(element.getBoundingClientRect().width));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener('resize', update);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    const timeoutId = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 30);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchOpen]);

  const noDragStyle = { WebkitAppRegion: 'no-drag' } as CSSProperties;
  const pinnedTabs = useMemo(() => tabs.filter(tab => tab.isPinned), [tabs]);
  const regularTabs = useMemo(() => tabs.filter(tab => !tab.isPinned), [tabs]);
  const tabWidth = useMemo(
    () =>
      computeTabWidth(tabsAreaWidth, regularTabs.length, {
        addButtonWidth: 34,
        gap: 4,
        minWidth: 36,
        maxWidth: 220,
      }),
    [tabsAreaWidth, regularTabs.length]
  );
  const displayMode = getTabDisplayMode(tabWidth);
  const iconSize = getTabIconSize(Math.max(regularTabs.length, 1));

  const query = searchQuery.trim().toLowerCase();
  const filteredOpenTabs = useMemo(
    () =>
      tabs.filter(tab => {
        if (!query) return true;
        const domain = extractDisplayDomain(tab.url).toLowerCase();
        return (
          tab.title.toLowerCase().includes(query) ||
          tab.url.toLowerCase().includes(query) ||
          domain.includes(query)
        );
      }),
    [tabs, query]
  );
  const filteredRecentlyClosed = useMemo(
    () =>
      recentlyClosedTabs.filter(tab => {
        if (!query) return true;
        const domain = extractDisplayDomain(tab.url).toLowerCase();
        return (
          tab.title.toLowerCase().includes(query) ||
          tab.url.toLowerCase().includes(query) ||
          domain.includes(query)
        );
      }),
    [recentlyClosedTabs, query]
  );

  const contextTab = contextMenu ? tabs.find(tab => tab.id === contextMenu.tabId) : null;

  const handleContext = (event: React.MouseEvent, tabId: string) => {
    event.preventDefault();
    setContextMenu({ tabId, x: event.clientX, y: event.clientY });
  };

  const WindowButton = ({
    label,
    onClick,
    children,
    className,
  }: {
    label: string;
    onClick: () => void;
    children: ReactNode;
    className?: string;
  }) => (
    <ActionHint label={label}>
      <button
        style={noDragStyle}
        onClick={onClick}
        aria-label={label}
        className={cn(
          'h-8 w-9 flex items-center justify-center transition-colors duration-fast text-primary',
          className
        )}
      >
        {children}
      </button>
    </ActionHint>
  );

  return (
    <>
      <div
        className="flex items-center h-9 bg-background border-b border-border px-2 gap-2 select-none shrink-0"
        style={{ WebkitAppRegion: 'drag' } as CSSProperties}
        onDoubleClick={event => {
          if (!desktopMode) return;
          if (event.target !== event.currentTarget) return;
          void desktopToggleMaximizeWindow();
        }}
      >
        <div className="flex items-center shrink-0 min-w-[24px]">
          <img
            src="/notilus-logo.png"
            alt="Notilus"
            className="w-[22px] h-[22px] object-contain"
            style={noDragStyle}
          />
        </div>

        <div className="flex items-center gap-0.5 shrink-0 max-w-[180px] min-w-0 overflow-hidden">
          {pinnedTabs.map(tab => {
            const isActive = tab.id === activeTabId;
            return (
              <ActionHint key={tab.id} label={`${tab.title} - ${extractDisplayDomain(tab.url)}`}>
                <button
                  data-testid={`pinned-tab-${tab.id}`}
                  style={noDragStyle}
                  onClick={() => onSelectTab(tab.id)}
                  aria-label={`${tab.title} - ${extractDisplayDomain(tab.url)}`}
                  className={cn(
                    'h-8 w-8 flex items-center justify-center rounded-md transition-all duration-fast shrink-0 text-muted-foreground hover:text-foreground',
                    isActive ? 'text-white scale-[1.05]' : ''
                  )}
                >
                  <TabIcon tab={tab} size={15} />
                </button>
              </ActionHint>
            );
          })}
        </div>

        <div ref={tabsAreaRef} className="flex-1 min-w-0">
          <div className="flex items-center gap-1 h-8">
            {regularTabs.map(tab => {
              const isActive = tab.id === activeTabId;
              const showClose = displayMode !== 'icon-only';
              const tabDomainGroup = extractDomainGroup(tab.url);
              const sameDomainTabs = tabs.filter(
                other =>
                  other.id !== tab.id &&
                  tabDomainGroup &&
                  extractDomainGroup(other.url) === tabDomainGroup
              );

              return (
                <HoverCard key={tab.id} openDelay={180} closeDelay={70}>
                  <HoverCardTrigger asChild>
                    <button
                      data-testid={`tab-button-${tab.id}`}
                      style={{ ...noDragStyle, width: `${tabWidth}px` }}
                      onClick={() => onSelectTab(tab.id)}
                      onContextMenu={event => handleContext(event, tab.id)}
                      className={cn(
                        'group relative flex items-center gap-1.5 h-8 px-2 rounded-md text-xs font-body transition-all duration-fast min-w-0',
                        isActive
                          ? 'bg-card border border-border text-foreground'
                          : 'text-muted-foreground hover:bg-primary/10 hover:text-foreground',
                        displayMode === 'icon-only' ? 'justify-center px-1 gap-0' : ''
                      )}
                    >
                      {isActive && (
                        <div className="absolute bottom-0 left-2 right-2 h-[2px] notilus-gradient rounded-t" />
                      )}

                      <TabIcon tab={tab} size={iconSize} />
                      {displayMode !== 'icon-only' && (
                        <span className="truncate flex-1 min-w-0 text-left">{tab.title}</span>
                      )}

                      {showClose && (
                        <span
                          onClick={event => {
                            event.stopPropagation();
                            onCloseTab(tab.id);
                          }}
                          className="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-primary/10 rounded-sm p-0.5 transition-opacity duration-fast opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                        >
                          <X size={10} />
                        </span>
                      )}
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent
                    side="bottom"
                    align="start"
                    sideOffset={6}
                    className="w-72 p-2 glass border-border"
                  >
                    <div className="px-1">
                      <div className="text-xs font-body text-foreground truncate">{tab.title}</div>
                      <div className="text-[11px] font-body text-muted-foreground truncate">
                        {extractDisplayDomain(tab.url)}
                      </div>
                    </div>
                    {sameDomainTabs.length > 0 && (
                      <>
                        <div className="my-2 h-px notilus-gradient-full opacity-50" />
                        <div className="space-y-0.5">
                          {sameDomainTabs.map(other => (
                            <button
                              key={other.id}
                              data-testid={`hover-tab-item-${tab.id}-${other.id}`}
                              onClick={() => onSelectTab(other.id)}
                              className="w-full h-8 px-1.5 rounded-md flex items-center gap-2 text-left hover:bg-muted/50 transition-colors duration-fast"
                            >
                              <TabIcon tab={other} size={12} />
                              <span className="truncate text-xs font-body text-foreground">
                                {other.title}
                              </span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </HoverCardContent>
                </HoverCard>
              );
            })}

            <ActionHint label="New tab">
              <button
                style={noDragStyle}
                onClick={onAddTab}
                aria-label="New tab"
                className="flex items-center justify-center h-8 w-8 rounded-md text-primary hover:bg-primary/10 hover:text-primary transition-colors duration-fast shrink-0"
              >
                <Plus size={14} />
              </button>
            </ActionHint>
          </div>
        </div>

        <div className="flex items-center shrink-0">
          <WindowButton
            label="Search tabs"
            onClick={() => setSearchOpen(true)}
            className="hover:bg-primary/10"
          >
            <Search size={14} />
          </WindowButton>
          <WindowButton
            label="Minimize"
            onClick={() => {
              if (desktopMode) {
                void desktopMinimizeWindow();
              }
            }}
            className="hover:bg-primary/10"
          >
            <Minus size={14} />
          </WindowButton>
          <WindowButton
            label={isMaximized ? 'Restore' : 'Maximize'}
            onClick={() => {
              if (desktopMode) {
                void desktopToggleMaximizeWindow();
              }
            }}
            className="hover:bg-primary/10"
          >
            {isMaximized ? <Copy size={11} /> : <Square size={11} />}
          </WindowButton>
          <WindowButton
            label="Close"
            onClick={() => {
              if (desktopMode) {
                void desktopCloseWindow();
              }
            }}
            className="hover:bg-destructive hover:text-destructive-foreground"
          >
            <X size={14} />
          </WindowButton>
        </div>
      </div>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent data-testid="tab-search-dialog" className="sm:max-w-xl glass border-border">
          <DialogHeader>
            <DialogTitle className="text-sm font-display tracking-wider uppercase">
              Search Tabs
            </DialogTitle>
            <DialogDescription>
              Find open tabs and reopen recently closed tabs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              onKeyDown={event => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                event.stopPropagation();
              }}
              placeholder="Search by title or domain..."
              className="w-full h-9 rounded-md bg-notilus-surface-1 border border-border px-3 text-sm font-body text-foreground outline-none focus:border-primary/50"
            />

            <div>
              <div className="text-[11px] font-display text-muted-foreground uppercase tracking-widest mb-1">
                Open tabs
              </div>
              <div className="max-h-48 overflow-y-auto rounded-md border border-border/60">
                {filteredOpenTabs.length > 0 ? (
                  filteredOpenTabs.map(tab => (
                    <button
                      key={tab.id}
                      data-testid={`search-open-tab-${tab.id}`}
                      className="w-full px-2 py-1.5 flex items-center gap-2 text-left hover:bg-muted/50 transition-colors duration-fast border-b border-border/40 last:border-b-0"
                      onClick={() => {
                        onSelectTab(tab.id);
                        setSearchOpen(false);
                        setSearchQuery('');
                      }}
                    >
                      <TabIcon tab={tab} size={12} />
                      <div className="min-w-0">
                        <div className="text-xs font-body text-foreground truncate">{tab.title}</div>
                        <div className="text-[10px] font-body text-muted-foreground truncate">
                          {extractDisplayDomain(tab.url)}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-2 py-2 text-xs font-body text-muted-foreground">
                    No open tabs found.
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="text-[11px] font-display text-muted-foreground uppercase tracking-widest">
                  Recently closed
                </div>
                <button
                  onClick={onClearClosedTabs}
                  className="text-[10px] font-body text-primary hover:text-primary/80 transition-colors duration-fast"
                >
                  Clear recent
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-md border border-border/60">
                {filteredRecentlyClosed.length > 0 ? (
                  filteredRecentlyClosed.map(tab => (
                    <button
                      key={tab.id}
                      data-testid={`search-recent-tab-${tab.id}`}
                      className="w-full px-2 py-1.5 flex items-center gap-2 text-left hover:bg-muted/50 transition-colors duration-fast border-b border-border/40 last:border-b-0"
                      onClick={() => {
                        onReopenClosedTab(tab.id);
                        setSearchOpen(false);
                        setSearchQuery('');
                      }}
                    >
                      <div className="w-3 h-3 rounded-sm bg-primary/30 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-body text-foreground truncate">{tab.title}</div>
                        <div className="text-[10px] font-body text-muted-foreground truncate">
                          {extractDisplayDomain(tab.url)}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-2 py-2 text-xs font-body text-muted-foreground">
                    No recently closed tabs.
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-50"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 glass rounded-lg border border-border py-1 min-w-[190px] shadow-lg"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {[
              { icon: Copy, label: 'Duplicate Tab', action: () => onDuplicateTab?.(contextMenu.tabId) },
              {
                icon: Pin,
                label: contextTab?.isPinned ? 'Unpin Tab' : 'Pin Tab',
                action: () => onTogglePinTab(contextMenu.tabId),
              },
              {
                icon: XCircle,
                label: 'Close Other Tabs',
                action: () => {
                  tabs.filter(tab => tab.id !== contextMenu.tabId).forEach(tab => onCloseTab(tab.id));
                },
              },
              { icon: X, label: 'Close Tab', action: () => onCloseTab(contextMenu.tabId) },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => {
                  item.action();
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-body text-foreground hover:bg-muted/50 transition-colors duration-fast"
              >
                <item.icon size={13} className="text-muted-foreground" />
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
