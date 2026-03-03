import { Minus, Square, X } from 'lucide-react';

export function TitleBar() {
  return (
    <div className="flex items-center justify-between h-8 bg-background border-b border-border px-3 select-none shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded notilus-gradient flex items-center justify-center">
          <span className="text-[8px] font-mono font-bold text-primary-foreground">N</span>
        </div>
        <span className="text-xs font-mono text-muted-foreground">Notilus Browser</span>
      </div>
      <div className="flex items-center">
        <button className="h-8 w-10 flex items-center justify-center hover:bg-muted transition-colors">
          <Minus size={14} className="text-muted-foreground" />
        </button>
        <button className="h-8 w-10 flex items-center justify-center hover:bg-muted transition-colors">
          <Square size={11} className="text-muted-foreground" />
        </button>
        <button className="h-8 w-10 flex items-center justify-center hover:bg-destructive transition-colors">
          <X size={14} className="text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
