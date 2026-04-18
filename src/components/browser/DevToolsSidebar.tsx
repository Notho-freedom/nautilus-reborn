import {
  Activity, Terminal, Code2, BookOpen, GitBranch,
  Gauge, Settings, ChevronLeft, ChevronRight,
  Star, Clock, Download, Puzzle, Folder,
  FileText, Wrench, RefreshCw,
  Youtube, MessageCircle, Bot, Send, Music,
  MonitorSmartphone, Github, type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getSettings, subscribeToSettingsUpdates, type WebServiceId } from '@/lib/settings';
import { useEffect, useMemo, useState } from 'react';
import { WebServiceIcon } from './WebServiceIcon';

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
  { id: 'workspaces', icon: Folder, label: 'Workspaces' },
  { type: 'separator' as const },
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
  { id: 'settings', icon: Settings, label: 'Settings' }
];

export interface WebServiceItem {
  id: WebServiceId;
  label: string;
  url: string;
  fallbackIcon: LucideIcon;
}

const WEB_SERVICES: WebServiceItem[] = [
  { id: 'youtubeMusic', fallbackIcon: Music, label: 'YouTube Music', url: 'https://music.youtube.com' },
  { id: 'youtube', fallbackIcon: Youtube, label: 'YouTube', url: 'https://youtube.com' },
  { id: 'chatgpt', fallbackIcon: Bot, label: 'ChatGPT', url: 'https://chat.openai.com' },
  { id: 'deepseek', fallbackIcon: Bot, label: 'DeepSeek', url: 'https://chat.deepseek.com' },
  { id: 'whatsapp', fallbackIcon: MessageCircle, label: 'WhatsApp', url: 'https://web.whatsapp.com' },
  { id: 'telegram', fallbackIcon: Send, label: 'Telegram', url: 'https://web.telegram.org' },
];

export function DevToolsSidebar({
  isOpen, activePanel, onToggle, onOpenWebPanel, activeWebServiceUrl,
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
      <div className="flex flex-col items-center w-12 surface-chrome border-r border-border/30 py-2 gap-0.5 overflow-y-auto no-scrollbar">
        {SIDEBAR_ITEMS.map((item, i) => {
          if ('type' in item && item.type === 'separator') {
            return (
              <div key={`sep-${i}`} className="h-px w-5 bg-border/30 my-2 mx-auto" />
            );
          }
          const it = item as { id: string; icon: React.ElementType; label: string };
          const isActive = activePanel === it.id && isOpen;
          return (
            <Tooltip key={it.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onToggle(it.id)}
                  className={cn(
                    "relative w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 shrink-0",
                    isActive
                      ? "bg-primary/12 text-primary shadow-[inset_2px_0_8px_-4px_hsl(var(--primary)/0.5)]"
                      : "text-sidebar-foreground hover:text-foreground hover:bg-notilus-surface-2/60"
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full bg-primary" />
                  )}
                  <it.icon size={16} strokeWidth={1.25} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="glass text-xs font-body">
                {it.label}
              </TooltipContent>
            </Tooltip>
          );
        })}

        <div className="flex-1" />

        {visibleWebServices.length > 0 && (
          <>
            <div className="h-px w-5 bg-border/30 my-2 mx-auto" />
            <div className="text-[8px] font-display text-muted-foreground/40 uppercase tracking-[0.2em] mb-0.5">Web</div>
          </>
        )}

        {visibleWebServices.map(svc => (
          <Tooltip key={svc.label}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onOpenWebPanel?.(svc)}
                className={cn(
                  'relative w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 shrink-0',
                  activePanel === 'web-service' && activeWebServiceUrl === svc.url
                    ? 'bg-primary/12 text-primary shadow-[inset_2px_0_8px_-4px_hsl(var(--primary)/0.5)]'
                    : 'text-sidebar-foreground hover:text-foreground hover:bg-notilus-surface-2/60'
                )}
              >
                {activePanel === 'web-service' && activeWebServiceUrl === svc.url && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full bg-primary" />
                )}
                <WebServiceIcon serviceId={svc.id} serviceUrl={svc.url} serviceLabel={svc.label} size={15} fallbackIcon={svc.fallbackIcon} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="glass text-xs font-body">{svc.label}</TooltipContent>
          </Tooltip>
        ))}

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onToggle()}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-sidebar-foreground hover:text-foreground hover:bg-notilus-surface-2/60 transition-all duration-200 shrink-0"
            >
              {isOpen ? <ChevronLeft size={15} strokeWidth={1.25} /> : <ChevronRight size={15} strokeWidth={1.25} />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="glass text-xs font-body">
            {isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
