import {
  Activity, Terminal, Code2, BookOpen, GitBranch,
  Gauge, Settings, ChevronLeft, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface DevToolsSidebarProps {
  isOpen: boolean;
  activePanel: string | null;
  onToggle: (panel?: string) => void;
}

const SIDEBAR_ITEMS = [
  { id: 'monitor', icon: Activity, label: 'System Monitor' },
  { id: 'terminal', icon: Terminal, label: 'Terminal' },
  { id: 'vscode', icon: Code2, label: 'VS Code' },
  { id: 'api-docs', icon: BookOpen, label: 'API Docs' },
  { id: 'git', icon: GitBranch, label: 'Git' },
  { id: 'lighthouse', icon: Gauge, label: 'Lighthouse' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

export function DevToolsSidebar({ isOpen, activePanel, onToggle }: DevToolsSidebarProps) {
  return (
    <div className="flex h-full shrink-0">
      {/* Icon rail */}
      <div className="flex flex-col items-center w-11 bg-sidebar border-r border-sidebar-border py-2 gap-1">
        {SIDEBAR_ITEMS.map(item => {
          const isActive = activePanel === item.id && isOpen;
          return (
            <Tooltip key={item.id} delayDuration={300}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onToggle(item.id)}
                  className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-md transition-all",
                    isActive
                      ? "bg-primary/15 text-primary glow-primary"
                      : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <item.icon size={17} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="glass text-xs">
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}

        <div className="flex-1" />

        <button
          onClick={() => onToggle()}
          className="w-8 h-8 flex items-center justify-center rounded-md text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
        >
          {isOpen ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
        </button>
      </div>
    </div>
  );
}
