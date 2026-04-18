import { type KeyboardEvent, type ReactNode } from 'react';
import { MoreVertical, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface SidebarPanelShellProps {
  title: string;
  icon?: React.ElementType;
  titleIcon?: ReactNode;
  isActive?: boolean;
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  searchPlaceholder?: string;
  filters?: { label: string; value: string }[];
  activeFilter?: string | null;
  onFilterChange?: (value: string | null) => void;
  onClose: () => void;
  menuItems?: { label: string; onClick: () => void }[];
  children: ReactNode;
  footer?: ReactNode;
  contentClassName?: string;
}

export function SidebarPanelShell({
  title, icon: Icon, titleIcon, isActive,
  searchable = false, searchValue = '', onSearchChange, onSearchKeyDown,
  searchPlaceholder = 'Search...', filters, activeFilter, onFilterChange,
  onClose, menuItems, children, footer, contentClassName,
}: SidebarPanelShellProps) {
  return (
    <div className="flex flex-col h-full min-w-[320px] surface-panel-gx animate-slide-in-left" data-panel-active={isActive ? 'true' : 'false'}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-display text-primary/85 uppercase tracking-[0.2em] flex items-center gap-2 font-medium">
            {titleIcon ?? (Icon ? <Icon size={13} strokeWidth={1.25} /> : null)}
            {title}
          </h3>
          <div className="flex items-center gap-0.5">
            {menuItems && menuItems.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-notilus-surface-2/60 transition-all duration-200">
                    <MoreVertical size={13} strokeWidth={1.25} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass border-border min-w-[140px]">
                  {menuItems.map(item => (
                    <DropdownMenuItem key={item.label} onClick={item.onClick} className="text-xs font-body cursor-pointer">
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-destructive/15 transition-all duration-200"
              title="Close panel"
            >
              <X size={13} strokeWidth={1.25} />
            </button>
          </div>
        </div>

        {/* Search */}
        {searchable && (
          <div className="flex items-center h-9 rounded-lg bg-notilus-surface-2/70 px-3 gap-2 mt-3 ring-1 ring-transparent focus-within:ring-primary/25 focus-within:bg-notilus-surface-2 transition-all duration-200">
            <Search size={13} strokeWidth={1.25} className="text-muted-foreground" />
            <input
              value={searchValue}
              onChange={e => onSearchChange?.(e.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder={searchPlaceholder}
              className="flex-1 bg-transparent text-xs font-body text-foreground placeholder:text-muted-foreground outline-none border-0 focus:outline-none focus:ring-0"
            />
          </div>
        )}
      </div>

      {/* Filters */}
      {filters && filters.length > 0 && (
        <div className="flex gap-1 px-3 pb-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => onFilterChange?.(null)}
            className={cn(
              'px-2.5 py-1 rounded-full text-[10px] font-display shrink-0 transition-all duration-200',
              !activeFilter
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-notilus-surface-2/60'
            )}
          >
            All
          </button>
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => onFilterChange?.(activeFilter === f.value ? null : f.value)}
              className={cn(
                'px-2.5 py-1 rounded-full text-[10px] font-display shrink-0 transition-all duration-200',
                activeFilter === f.value
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-notilus-surface-2/60'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className={cn('flex-1 overflow-y-auto no-scrollbar', contentClassName)}>{children}</div>

      {/* Footer */}
      {footer && (
        <div className="px-3 py-2.5">
          <div className="text-[10px] font-body text-muted-foreground text-center">{footer}</div>
        </div>
      )}
    </div>
  );
}
