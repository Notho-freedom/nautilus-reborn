import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Loader2, Minus, Pin, Plus, Square, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BrowserTab } from '@/hooks/useBrowserState';
import { computeTabWidth, getTabDisplayMode, getTabIconSize } from '@/lib/tabLayout';
import {
  desktopCloseWindow,
  desktopGetWindowState,
  desktopMinimizeWindow,
  desktopToggleMaximizeWindow,
  isDesktopRuntime,
  onDesktopWindowStateChanged,
} from '@/lib/electronBridge';

interface TopChromeBarProps {
  tabs: BrowserTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onAddTab: () => void;
  onDuplicateTab?: (id: string) => void;
  onTogglePinTab: (id: string) => void;
}

export function TopChromeBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onAddTab,
  onDuplicateTab,
  onTogglePinTab,
}: TopChromeBarProps) {
  const desktopMode = isDesktopRuntime();
  const [isMaximized, setIsMaximized] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ tabId: string; x: number; y: number } | null>(null);
  const [tabsAreaWidth, setTabsAreaWidth] = useState(0);
  const tabsAreaRef = useRef<HTMLDivElement>(null);

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

  const tabWidth = useMemo(
    () => computeTabWidth(tabsAreaWidth, tabs.length, { addButtonWidth: 34, gap: 4 }),
    [tabsAreaWidth, tabs.length]
  );
  const displayMode = getTabDisplayMode(tabWidth);
  const iconSize = getTabIconSize(tabs.length);
  const noDragStyle = { WebkitAppRegion: 'no-drag' as const };

  const getFaviconUrl = (tab: BrowserTab) => {
    if (tab.url.startsWith('notilus://')) return null;
    try {
      return `https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}&sz=16`;
    } catch {
      return null;
    }
  };

  const handleContext = (event: React.MouseEvent, tabId: string) => {
    event.preventDefault();
    setContextMenu({ tabId, x: event.clientX, y: event.clientY });
  };

  const contextTab = contextMenu ? tabs.find(tab => tab.id === contextMenu.tabId) : null;

  return (
    <>
      <div
        className="flex items-center h-9 bg-background border-b border-border px-2 gap-2 select-none shrink-0"
        style={{ WebkitAppRegion: 'drag' }}
        onDoubleClick={event => {
          if (!desktopMode) return;
          if (event.target !== event.currentTarget) return;
          void desktopToggleMaximizeWindow();
        }}
      >
        <div className="flex items-center gap-2 shrink-0 min-w-[140px]">
          <img
            src="/notilus-logo.png"
            alt="Notilus"
            className="w-5 h-5 object-contain"
            style={noDragStyle}
          />
          <span className="text-xs font-display text-muted-foreground tracking-wider">NOTILUS</span>
          <span className="text-[9px] font-body text-muted-foreground/50">v2.0</span>
        </div>

        <div ref={tabsAreaRef} className="flex-1 min-w-0">
          <div className="flex items-center gap-1 h-8">
            {tabs.map(tab => {
              const isActive = tab.id === activeTabId;
              const favicon = getFaviconUrl(tab);
              const showTitle = displayMode === 'full' || displayMode === 'compact';
              const showClose = displayMode === 'full' || displayMode === 'icon-close';
              const closeOnHoverOnly = displayMode !== 'full';

              return (
                <button
                  key={tab.id}
                  style={{ ...noDragStyle, width: `${tabWidth}px` }}
                  onClick={() => onSelectTab(tab.id)}
                  onContextMenu={event => handleContext(event, tab.id)}
                  className={cn(
                    'group relative flex items-center gap-1.5 h-8 px-2 rounded-md text-xs font-body transition-all duration-fast min-w-0',
                    isActive
                      ? 'bg-card border border-border text-foreground'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  )}
                >
                  {isActive && <div className="absolute bottom-0 left-2 right-2 h-[2px] notilus-gradient rounded-t" />}

                  {tab.isLoading ? (
                    <Loader2 size={iconSize} className="text-primary animate-spin shrink-0" />
                  ) : favicon ? (
                    <img
                      src={favicon}
                      alt=""
                      className="rounded-sm shrink-0"
                      style={{ width: iconSize, height: iconSize }}
                      onError={event => {
                        (event.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div
                      className="rounded notilus-gradient flex items-center justify-center shrink-0"
                      style={{ width: iconSize, height: iconSize }}
                    >
                      <span className="text-[6px] font-display font-bold text-primary-foreground">N</span>
                    </div>
                  )}

                  {showTitle && <span className="truncate flex-1 text-left">{tab.title}</span>}

                  {tab.isPinned && <Pin size={8} className="text-primary shrink-0" />}

                  {showClose && !tab.isPinned && (
                    <span
                      onClick={event => {
                        event.stopPropagation();
                        onCloseTab(tab.id);
                      }}
                      className={cn(
                        'hover:bg-muted rounded-sm p-0.5 transition-opacity duration-fast shrink-0',
                        closeOnHoverOnly ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
                      )}
                    >
                      <X size={10} />
                    </span>
                  )}
                </button>
              );
            })}

            <button
              style={noDragStyle}
              onClick={onAddTab}
              className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors duration-fast shrink-0"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div className="flex items-center shrink-0">
          <button
            style={noDragStyle}
            onClick={() => {
              if (desktopMode) {
                void desktopMinimizeWindow();
              }
            }}
            className="h-8 w-9 flex items-center justify-center hover:bg-muted transition-colors duration-fast"
          >
            <Minus size={14} className="text-muted-foreground" />
          </button>
          <button
            style={noDragStyle}
            onClick={() => {
              if (desktopMode) {
                void desktopToggleMaximizeWindow();
              }
            }}
            className="h-8 w-9 flex items-center justify-center hover:bg-muted transition-colors duration-fast"
          >
            {isMaximized ? <Copy size={11} className="text-muted-foreground" /> : <Square size={11} className="text-muted-foreground" />}
          </button>
          <button
            style={noDragStyle}
            onClick={() => {
              if (desktopMode) {
                void desktopCloseWindow();
              }
            }}
            className="h-8 w-9 flex items-center justify-center hover:bg-destructive transition-colors duration-fast group"
          >
            <X size={14} className="text-muted-foreground group-hover:text-destructive-foreground" />
          </button>
        </div>
      </div>

      {contextMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} />
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
