import { useMemo, useState } from 'react';
import { MoreHorizontal, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SidePanelFilter {
  id: string;
  label: string;
  active: boolean;
  onClick: () => void;
}

interface SidePanelQuickAction {
  id: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export interface SidePanelShellProps {
  panelId: string;
  title: string;
  subtitle?: string;
  width: number;
  minWidth: number;
  maxWidth: number;
  searchable?: boolean;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (v: string) => void;
  filters?: SidePanelFilter[];
  quickActions?: SidePanelQuickAction[];
  onClose: () => void;
  onWidthChange: (w: number) => void;
  children: React.ReactNode;
}

export function SidePanelShell({
  panelId,
  title,
  subtitle,
  width,
  minWidth,
  maxWidth,
  searchable = false,
  searchValue = '',
  searchPlaceholder = 'Search...',
  onSearchChange,
  filters,
  quickActions,
  onClose,
  onWidthChange,
  children,
}: SidePanelShellProps) {
  const [isResizing, setIsResizing] = useState(false);
  const hasFilters = Boolean(filters && filters.length > 0);
  const hasQuickActions = Boolean(quickActions && quickActions.length > 0);

  const panelWidth = useMemo(
    () => Math.max(minWidth, Math.min(maxWidth, Math.round(width))),
    [maxWidth, minWidth, width]
  );

  const handleResizeStart = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = panelWidth;
    setIsResizing(true);
    document.body.style.userSelect = 'none';

    const handleMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const next = Math.max(minWidth, Math.min(maxWidth, startWidth + delta));
      onWidthChange(next);
    };

    const handleUp = () => {
      setIsResizing(false);
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  return (
    <aside
      data-side-panel-shell={panelId}
      data-occlude-webview="true"
      className="relative h-full border-r border-border bg-card/95 backdrop-blur-sm flex flex-col shadow-xl"
      style={{ width: panelWidth }}
    >
      <div className="h-10 px-3 flex items-center gap-2 border-b border-border/80 shrink-0">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-display font-semibold uppercase tracking-widest text-primary truncate">
            {title}
          </div>
          {subtitle ? (
            <div className="text-[10px] font-body text-muted-foreground truncate">{subtitle}</div>
          ) : null}
        </div>

        {hasQuickActions ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors duration-fast"
                title="Panel options"
              >
                <MoreHorizontal size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass border-border min-w-[180px]">
              {quickActions!.map(action => (
                <DropdownMenuItem
                  key={action.id}
                  disabled={action.disabled}
                  onClick={action.onClick}
                  className="text-xs font-body"
                >
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        <button
          onClick={onClose}
          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors duration-fast"
          title="Close panel"
        >
          <X size={14} />
        </button>
      </div>

      {searchable ? (
        <div className="px-3 py-2 border-b border-border/70 shrink-0">
          <div className="h-8 rounded-md bg-notilus-surface-1 border border-border flex items-center gap-1.5 px-2">
            <Search size={12} className="text-muted-foreground" />
            <input
              value={searchValue}
              onChange={event => onSearchChange?.(event.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 bg-transparent text-xs font-body text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        </div>
      ) : null}

      {hasFilters ? (
        <div className="px-2 py-2 border-b border-border/70 shrink-0 flex items-center gap-1 overflow-x-auto scrollbar-thin">
          {filters!.map(filter => (
            <button
              key={filter.id}
              onClick={filter.onClick}
              className={cn(
                'h-6 px-2 rounded-md text-[10px] font-display tracking-wider uppercase shrink-0 transition-colors duration-fast',
                filter.active
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>

      <div
        role="separator"
        aria-orientation="vertical"
        className={cn(
          'absolute top-0 right-0 w-1 h-full cursor-col-resize transition-colors duration-fast',
          isResizing ? 'bg-primary/50' : 'hover:bg-primary/30'
        )}
        onMouseDown={handleResizeStart}
      />
    </aside>
  );
}
