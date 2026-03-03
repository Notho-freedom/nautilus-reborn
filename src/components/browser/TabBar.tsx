import { Plus, X, Globe } from 'lucide-react';
import { BrowserTab } from '@/hooks/useBrowserState';
import { cn } from '@/lib/utils';

interface TabBarProps {
  tabs: BrowserTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onAddTab: () => void;
}

export function TabBar({ tabs, activeTabId, onSelectTab, onCloseTab, onAddTab }: TabBarProps) {
  return (
    <div className="flex items-end h-9 bg-background border-b border-border px-1 gap-0.5 overflow-x-auto scrollbar-thin shrink-0">
      {tabs.map(tab => {
        const isActive = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={cn(
              "group relative flex items-center gap-1.5 h-8 px-3 rounded-t-lg text-xs font-sans transition-all min-w-[120px] max-w-[200px]",
              isActive
                ? "bg-card border border-b-0 border-border text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            {isActive && (
              <div className="absolute bottom-0 left-2 right-2 h-[2px] notilus-gradient rounded-t" />
            )}
            <Globe size={12} className={cn(isActive ? "text-primary" : "text-muted-foreground")} />
            <span className="truncate flex-1 text-left">{tab.title}</span>
            <span
              onClick={e => { e.stopPropagation(); onCloseTab(tab.id); }}
              className="opacity-0 group-hover:opacity-100 hover:bg-muted rounded-sm p-0.5 transition-opacity"
            >
              <X size={10} />
            </span>
          </button>
        );
      })}
      <button
        onClick={onAddTab}
        className="flex items-center justify-center h-8 w-8 rounded-t-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors shrink-0"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
