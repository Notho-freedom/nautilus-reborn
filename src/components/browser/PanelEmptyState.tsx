import type { LucideIcon } from 'lucide-react';

interface PanelEmptyStateProps {
  icon: LucideIcon;
  title: string;
  hint?: string;
}

export function PanelEmptyState({ icon: Icon, title, hint }: PanelEmptyStateProps) {
  return (
    <div className="flex h-full min-h-[220px] w-full flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground">
      <Icon size={40} className="opacity-30" />
      <span className="text-xs font-body">{title}</span>
      {hint ? <span className="text-[10px] font-body">{hint}</span> : null}
    </div>
  );
}

