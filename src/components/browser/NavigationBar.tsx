import { useState } from 'react';
import {
  ArrowLeft, ArrowRight, RotateCw, Home, Shield, Lock,
  Download, Puzzle, User, Sparkles, Star, ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationBarProps {
  url: string;
  onNavigate: (url: string) => void;
  onHome: () => void;
  onToggleAI: () => void;
  adsBlocked?: number;
}

export function NavigationBar({ url, onNavigate, onHome, onToggleAI, adsBlocked = 0 }: NavigationBarProps) {
  const [inputValue, setInputValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const isHttps = url.startsWith('https://');
  const isInternal = url.startsWith('notilus://');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      const finalUrl = inputValue.includes('://') ? inputValue : `https://${inputValue}`;
      onNavigate(finalUrl);
      setInputValue('');
      setFocused(false);
    }
  };

  const NavButton = ({ children, onClick, label }: { children: React.ReactNode; onClick?: () => void; label: string }) => (
    <button
      onClick={onClick}
      title={label}
      className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      {children}
    </button>
  );

  return (
    <div className="flex items-center h-10 bg-background border-b border-border px-2 gap-1 shrink-0">
      <NavButton label="Back"><ArrowLeft size={15} /></NavButton>
      <NavButton label="Forward"><ArrowRight size={15} /></NavButton>
      <NavButton label="Reload"><RotateCw size={14} /></NavButton>
      <NavButton label="Home" onClick={onHome}><Home size={15} /></NavButton>

      <form onSubmit={handleSubmit} className="flex-1 mx-2">
        <div className={cn(
          "flex items-center h-7 rounded-lg bg-secondary/60 border transition-all px-2 gap-1.5",
          focused ? "border-primary/50 ring-1 ring-primary/20" : "border-transparent"
        )}>
          {isInternal ? (
            <Shield size={12} className="text-muted-foreground shrink-0" />
          ) : isHttps ? (
            <Lock size={12} className="text-green-500 shrink-0" />
          ) : (
            <ShieldCheck size={12} className="text-muted-foreground shrink-0" />
          )}
          <input
            data-url-input
            value={focused ? inputValue : ''}
            onChange={e => setInputValue(e.target.value)}
            onFocus={() => { setFocused(true); setInputValue(url); }}
            onBlur={() => setFocused(false)}
            placeholder={url}
            className="flex-1 bg-transparent text-xs font-mono text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button
            type="button"
            onClick={() => setIsBookmarked(!isBookmarked)}
            className={cn("shrink-0 transition-colors", isBookmarked ? "text-primary" : "text-muted-foreground hover:text-foreground")}
          >
            <Star size={13} fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>
        </div>
      </form>

      {adsBlocked > 0 && (
        <div className="flex items-center gap-1 px-1.5 h-6 rounded bg-green-500/10 text-green-500 text-[10px] font-mono" title="Ads blocked">
          <Shield size={11} />
          <span>{adsBlocked}</span>
        </div>
      )}

      <NavButton label="Extensions"><Puzzle size={15} /></NavButton>
      <NavButton label="Downloads"><Download size={15} /></NavButton>
      <button
        onClick={onToggleAI}
        title="AI Assistant"
        className="h-7 px-2 flex items-center gap-1 rounded text-xs font-mono bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
      >
        <Sparkles size={13} />
        <span className="hidden sm:inline">AI</span>
      </button>
      <NavButton label="Profile"><User size={15} /></NavButton>
    </div>
  );
}
