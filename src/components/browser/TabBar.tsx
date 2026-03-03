import { Plus, X, Globe, Loader2, Pin, Copy, XCircle, Lock } from 'lucide-react';
import { BrowserTab } from '@/hooks/useBrowserState';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface TabBarProps {
  tabs: BrowserTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onAddTab: () => void;
  onDuplicateTab?: (id: string) => void;
}

export function TabBar({ tabs, activeTabId, onSelectTab, onCloseTab, onAddTab, onDuplicateTab }: TabBarProps) {
  const [contextMenu, setContextMenu] = useState<{ tabId: string; x: number; y: number } | null>(null);

  const handleContext = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({ tabId, x: e.clientX, y: e.clientY });
  };

  const getFaviconUrl = (tab: BrowserTab) => {
    if (tab.url.startsWith('notilus://')) return null;
    try {
      return `https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}&sz=16`;
    } catch { return null; }
  };

  return (
    <>
      <div className="flex items-end h-9 bg-background border-b border-border px-1 gap-0.5 overflow-x-auto scrollbar-thin shrink-0">
        {tabs.map(tab => {
          const isActive = tab.id === activeTabId;
          const favicon = getFaviconUrl(tab);
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              onContextMenu={e => handleContext(e, tab.id)}
              className={cn(
                "group relative flex items-center gap-1.5 h-8 px-3 rounded-t-lg text-xs font-body transition-all duration-fast min-w-[120px] max-w-[200px]",
                isActive
                  ? "bg-card border border-b-0 border-border text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {isActive && (
                <div className="absolute bottom-0 left-2 right-2 h-[2px] notilus-gradient rounded-t" />
              )}
              {tab.isPrivate && <Lock size={10} className="text-warning shrink-0" />}
              {tab.isLoading ? (
                <Loader2 size={12} className="text-primary animate-spin shrink-0" />
              ) : favicon ? (
                <img src={favicon} alt="" className="w-3.5 h-3.5 rounded-sm shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <div className="w-4 h-4 rounded notilus-gradient flex items-center justify-center shrink-0">
                  <span className="text-[6px] font-display font-bold text-primary-foreground">N</span>
                </div>
              )}
              {tab.isPinned && <Pin size={8} className="text-primary shrink-0" />}
              <span className="truncate flex-1 text-left">{tab.title}</span>
              {!tab.isPinned && (
                <span
                  onClick={e => { e.stopPropagation(); onCloseTab(tab.id); }}
                  className="opacity-0 group-hover:opacity-100 hover:bg-muted rounded-sm p-0.5 transition-opacity duration-fast"
                >
                  <X size={10} />
                </span>
              )}
            </button>
          );
        })}
        <button
          onClick={onAddTab}
          className="flex items-center justify-center h-8 w-8 rounded-t-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors duration-fast shrink-0"
        >
          <Plus size={14} />
        </button>
      </div>

      {contextMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 glass rounded-lg border border-border py-1 min-w-[180px] shadow-lg"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {[
              { icon: Copy, label: 'Duplicate Tab', action: () => onDuplicateTab?.(contextMenu.tabId) },
              { icon: Pin, label: 'Pin Tab', action: () => {} },
              { icon: Lock, label: 'Open in Private', action: () => {} },
              { icon: XCircle, label: 'Close Other Tabs', action: () => {
                tabs.filter(t => t.id !== contextMenu.tabId).forEach(t => onCloseTab(t.id));
              }},
              { icon: X, label: 'Close Tab', action: () => onCloseTab(contextMenu.tabId) },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => { item.action(); setContextMenu(null); }}
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
