import { Minus, Square, X } from 'lucide-react';

export function TitleBar() {
  return (
    <div className="flex items-center justify-between h-8 bg-background border-b border-border px-3 select-none shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded notilus-gradient flex items-center justify-center animate-glow-breathe">
          <span className="text-[8px] font-display font-bold text-primary-foreground">N</span>
        </div>
        <span className="text-xs font-display text-muted-foreground tracking-wider">NOTILUS</span>
        <span className="text-[9px] font-body text-muted-foreground/50">v2.0</span>
      </div>
      <div className="flex items-center">
        <button className="h-8 w-10 flex items-center justify-center hover:bg-muted transition-colors duration-fast">
          <Minus size={14} className="text-muted-foreground" />
        </button>
        <button className="h-8 w-10 flex items-center justify-center hover:bg-muted transition-colors duration-fast">
          <Square size={11} className="text-muted-foreground" />
        </button>
        <button className="h-8 w-10 flex items-center justify-center hover:bg-destructive transition-colors duration-fast group">
          <X size={14} className="text-muted-foreground group-hover:text-destructive-foreground" />
        </button>
      </div>
    </div>
  );
}
