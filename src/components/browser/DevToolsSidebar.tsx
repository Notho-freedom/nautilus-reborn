import {
  Activity, Terminal, Code2, BookOpen, GitBranch,
  Gauge, Settings, ChevronLeft, ChevronRight,
  Star, Clock, Download, LayoutGrid, Puzzle,
  FileText, Wrench, Home,
  Youtube, MessageCircle, Bot, Send, Music
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface DevToolsSidebarProps {
  isOpen: boolean;
  activePanel: string | null;
  onToggle: (panel?: string) => void;
  onOpenUrl?: (url: string) => void;
}

const SIDEBAR_ITEMS = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'bookmarks', icon: Star, label: 'Bookmarks' },
  { id: 'history', icon: Clock, label: 'History' },
  { id: 'downloads', icon: Download, label: 'Downloads' },
  { type: 'separator' as const },
  { id: 'monitor', icon: Activity, label: 'System Monitor' },
  { id: 'terminal', icon: Terminal, label: 'Terminal' },
  { id: 'vscode', icon: Code2, label: 'VS Code' },
  { id: 'git', icon: GitBranch, label: 'Git' },
  { id: 'lighthouse', icon: Gauge, label: 'Lighthouse' },
  { id: 'devtools-panel', icon: Wrench, label: 'DevTools (F12)' },
  { type: 'separator' as const },
  { id: 'widgets', icon: LayoutGrid, label: 'Widgets' },
  { id: 'extensions', icon: Puzzle, label: 'Extensions' },
  { id: 'mosaic', icon: LayoutGrid, label: 'Mosaic' },
  { id: 'api-docs', icon: BookOpen, label: 'API Docs' },
  { id: 'docs', icon: FileText, label: 'Documentation' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

const WEB_SERVICES = [
  { icon: Music, label: 'YouTube Music', url: 'https://music.youtube.com' },
  { icon: Youtube, label: 'YouTube', url: 'https://youtube.com' },
  { icon: Bot, label: 'ChatGPT', url: 'https://chat.openai.com' },
  { icon: Bot, label: 'DeepSeek', url: 'https://chat.deepseek.com' },
  { icon: MessageCircle, label: 'WhatsApp', url: 'https://web.whatsapp.com' },
  { icon: Send, label: 'Telegram', url: 'https://web.telegram.org' },
];

export function DevToolsSidebar({ isOpen, activePanel, onToggle, onOpenUrl }: DevToolsSidebarProps) {
  return (
    <div className="flex h-full shrink-0">
      <div className="flex flex-col items-center w-11 bg-sidebar border-r border-sidebar-border py-2 gap-0.5 overflow-y-auto scrollbar-thin">
        {SIDEBAR_ITEMS.map((item, i) => {
          if ('type' in item && item.type === 'separator') {
            return <div key={`sep-${i}`} className="w-6 h-px bg-sidebar-border my-1" />;
          }
          const it = item as { id: string; icon: React.ElementType; label: string };
          const isActive = activePanel === it.id && isOpen;
          return (
            <Tooltip key={it.id} delayDuration={300}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onToggle(it.id)}
                  className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-md transition-all shrink-0",
                    isActive
                      ? "bg-primary/15 text-primary glow-primary"
                      : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <it.icon size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="glass text-xs">
                {it.label}
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* Web Services separator */}
        <div className="w-6 h-px bg-sidebar-border my-1" />
        <div className="text-[7px] font-mono text-muted-foreground uppercase tracking-wider mb-0.5">Web</div>

        {WEB_SERVICES.map(svc => (
          <Tooltip key={svc.label} delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onOpenUrl?.(svc.url)}
                className="w-8 h-8 flex items-center justify-center rounded-md text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent transition-all shrink-0"
              >
                <svc.icon size={15} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="glass text-xs">
              {svc.label}
            </TooltipContent>
          </Tooltip>
        ))}

        <div className="flex-1" />

        <button
          onClick={() => onToggle()}
          className="w-8 h-8 flex items-center justify-center rounded-md text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors shrink-0"
        >
          {isOpen ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
        </button>
      </div>
    </div>
  );
}
