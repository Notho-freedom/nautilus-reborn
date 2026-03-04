import { type ReactNode, useState } from 'react';
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
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: { label: string; value: string }[];
  activeFilter?: string | null;
  onFilterChange?: (value: string | null) => void;
  onClose: () => void;
  menuItems?: { label: string; onClick: () => void }[];
  children: ReactNode;
  footer?: ReactNode;
}

export function SidebarPanelShell({
  title,
  icon: Icon,
  searchable = false,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters,
  activeFilter,
  onFilterChange,
  onClose,
  menuItems,
  children,
  footer,
}: SidebarPanelShellProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-0">
          <h3 className="text-xs font-display font-semibold text-primary uppercase tracking-widest flex items-center gap-1.5">
            {Icon && <Icon size={12} />}
            {title}
          </h3>
          <div className="flex items-center gap-0.5">
            {menuItems && menuItems.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors duration-fast">
                    <MoreVertical size={12} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass border-border min-w-[140px]">
                  {menuItems.map(item => (
                    <DropdownMenuItem
                      key={item.label}
                      onClick={item.onClick}
                      className="text-xs font-body cursor-pointer"
                    >
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors duration-fast"
              title="Close panel"
            >
              <X size={12} />
            </button>
          </div>
        </div>

        {/* Search */}
        {searchable && (
          <div className="flex items-center h-8 rounded-lg bg-notilus-surface-1 border border-border px-2 gap-1.5 mt-2">
            <Search size={12} className="text-muted-foreground" />
            <input
              value={searchValue}
              onChange={e => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 bg-transparent text-xs font-body text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        )}
      </div>

      {/* Filters */}
      {filters && filters.length > 0 && (
        <div className="flex gap-1 p-2 border-b border-border overflow-x-auto scrollbar-thin">
          <button
            onClick={() => onFilterChange?.(null)}
            className={cn(
              'px-2 py-1 rounded-md text-[10px] font-display shrink-0 transition-colors duration-fast',
              !activeFilter
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            All
          </button>
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => onFilterChange?.(activeFilter === f.value ? null : f.value)}
              className={cn(
                'px-2 py-1 rounded-md text-[10px] font-display shrink-0 transition-colors duration-fast',
                activeFilter === f.value
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">{children}</div>

      {/* Footer */}
      {footer && (
        <div className="p-2 border-t border-border">
          <div className="text-[10px] font-body text-muted-foreground text-center">{footer}</div>
        </div>
      )}
    </div>
  );
}
