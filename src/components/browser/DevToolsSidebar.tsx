import {
  Activity, Terminal, Code2, BookOpen, GitBranch,
  Gauge, Settings, ChevronLeft, ChevronRight,
  Star, Clock, Download, LayoutGrid, Puzzle,
  FileText, Wrench, RefreshCw,
  Youtube, MessageCircle, Bot, Send, Music,
  MonitorSmartphone, Github
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getSettings, subscribeToSettingsUpdates, type WebServiceId } from '@/lib/settings';
import { useEffect, useMemo, useState } from 'react';

interface DevToolsSidebarProps {
  isOpen: boolean;
  activePanel: string | null;
  onToggle: (panel?: string) => void;
  onOpenWebPanel?: (service: WebServiceItem) => void;
  activeWebServiceUrl?: string | null;
}

const SIDEBAR_ITEMS = [
  { id: 'bookmarks', icon: Star, label: 'Favorites' },
  { id: 'history', icon: Clock, label: 'History' },
  { id: 'downloads', icon: Download, label: 'Downloads' },
  { type: 'separator' as const },
  { id: 'widgets', icon: LayoutGrid, label: 'Widgets' },
  { id: 'monitor', icon: Activity, label: 'System Monitor' },
  { id: 'terminal', icon: Terminal, label: 'Terminal' },
  { id: 'vscode', icon: Code2, label: 'Studio' },
  { id: 'git', icon: GitBranch, label: 'Git' },
  { id: 'github', icon: Github, label: 'GitHub' },
  { type: 'separator' as const },
  { id: 'devtools-panel', icon: Wrench, label: 'DevTools (F12)' },
  { id: 'lighthouse', icon: Gauge, label: 'Lighthouse' },
  { id: 'mosaic', icon: MonitorSmartphone, label: 'Mosaic' },
  { type: 'separator' as const },
  { id: 'extensions', icon: Puzzle, label: 'Extensions' },
  { id: 'api-docs', icon: BookOpen, label: 'API Docs' },
  { id: 'docs', icon: FileText, label: 'Documentation' },
  { id: 'updates', icon: RefreshCw, label: 'Updates' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

export interface WebServiceItem {
  id: WebServiceId;
  label: string;
  url: string;
  icon: React.ElementType;
}

const WEB_SERVICES: WebServiceItem[] = [
  { id: 'youtubeMusic', icon: Music, label: 'YouTube Music', url: 'https://music.youtube.com' },
  { id: 'youtube', icon: Youtube, label: 'YouTube', url: 'https://youtube.com' },
  { id: 'chatgpt', icon: Bot, label: 'ChatGPT', url: 'https://chat.openai.com' },
  { id: 'deepseek', icon: Bot, label: 'DeepSeek', url: 'https://chat.deepseek.com' },
  { id: 'whatsapp', icon: MessageCircle, label: 'WhatsApp', url: 'https://web.whatsapp.com' },
  { id: 'telegram', icon: Send, label: 'Telegram', url: 'https://web.telegram.org' },
];

export function DevToolsSidebar({
  isOpen,
  activePanel,
  onToggle,
  onOpenWebPanel,
  activeWebServiceUrl,
}: DevToolsSidebarProps) {
  const [enabledWebServices, setEnabledWebServices] = useState<WebServiceId[]>(
    () => getSettings().enabledWebServices
  );

  useEffect(() => {
    return subscribeToSettingsUpdates(() => {
      setEnabledWebServices(getSettings().enabledWebServices);
    });
  }, []);

  const visibleWebServices = useMemo(
    () => WEB_SERVICES.filter(service => enabledWebServices.includes(service.id)),
    [enabledWebServices]
  );

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
            <Tooltip key={it.id} delayDuration={500}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onToggle(it.id)}
                  className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-md transition-all duration-fast shrink-0",
                    isActive
                      ? "bg-primary/15 text-primary glow-primary-sm"
                      : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <it.icon size={15} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="glass text-xs font-body">
                {it.label}
              </TooltipContent>
            </Tooltip>
          );
        })}

        <div className="w-6 h-px bg-sidebar-border my-1" />
        <div className="text-[7px] font-display text-muted-foreground uppercase tracking-widest mb-0.5">Web</div>

        {visibleWebServices.map(svc => (
          <Tooltip key={svc.label} delayDuration={500}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onOpenWebPanel?.(svc)}
                className={cn(
                  'w-8 h-8 flex items-center justify-center rounded-md transition-all duration-fast shrink-0',
                  activePanel === 'web-service' && activeWebServiceUrl === svc.url
                    ? 'bg-primary/15 text-primary glow-primary-sm'
                    : 'text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent'
                )}
              >
                <svc.icon size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="glass text-xs font-body">
              {svc.label}
            </TooltipContent>
          </Tooltip>
        ))}

        <div className="flex-1" />

        <button
          onClick={() => onToggle()}
          className="w-8 h-8 flex items-center justify-center rounded-md text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors duration-fast shrink-0"
        >
          {isOpen ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
        </button>
      </div>
    </div>
  );
}
