import { useState } from 'react';
import {
  ArrowLeft, ArrowRight, RotateCw, Home, Shield, Lock,
  Download, Puzzle, User, Sparkles, Star, ShieldCheck, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationBarProps {
  url: string;
  onNavigate: (url: string) => void;
  onHome: () => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
  isLoading?: boolean;
  onToggleAI: () => void;
  adsBlocked?: number;
}

export function NavigationBar({
  url,
  onNavigate,
  onHome,
  onBack,
  onForward,
  onReload,
  canGoBack = false,
  canGoForward = false,
  isLoading = false,
  onToggleAI,
  adsBlocked = 0,
}: NavigationBarProps) {
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

  const NavButton = ({
    children,
    onClick,
    label,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    label: string;
    disabled?: boolean;
  }) => (
    <button
      onClick={onClick}
      title={label}
      disabled={disabled}
      className={cn(
        'h-8 w-8 flex items-center justify-center rounded-md transition-colors duration-fast',
        disabled
          ? 'text-muted-foreground/40 cursor-not-allowed'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="flex items-center h-10 bg-background border-b border-border px-2 gap-1 shrink-0">
      <NavButton label="Back" onClick={onBack} disabled={!canGoBack}>
        <ArrowLeft size={15} />
      </NavButton>
      <NavButton label="Forward" onClick={onForward} disabled={!canGoForward}>
        <ArrowRight size={15} />
      </NavButton>
      <NavButton label="Reload" onClick={onReload}>
        {isLoading ? <Loader2 size={14} className="animate-spin text-primary" /> : <RotateCw size={14} />}
      </NavButton>
      <NavButton label="Home" onClick={onHome}><Home size={15} /></NavButton>

      <form onSubmit={handleSubmit} className="flex-1 mx-2">
        <div className={cn(
          "flex items-center h-8 rounded-lg bg-notilus-surface-1 border transition-all duration-fast px-3 gap-2",
          focused ? "border-primary/50 ring-2 ring-primary/20 glow-primary-sm" : "border-border"
        )}>
          {isInternal ? (
            <Shield size={13} className="text-muted-foreground shrink-0" />
          ) : isHttps ? (
            <Lock size={13} className="text-success shrink-0" />
          ) : (
            <ShieldCheck size={13} className="text-muted-foreground shrink-0" />
          )}
          <input
            data-url-input
            value={focused ? inputValue : ''}
            onChange={e => setInputValue(e.target.value)}
            onFocus={() => { setFocused(true); setInputValue(url); }}
            onBlur={() => setFocused(false)}
            placeholder={url}
            className="flex-1 bg-transparent text-sm font-body text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button
            type="button"
            onClick={() => setIsBookmarked(!isBookmarked)}
            className={cn("shrink-0 transition-colors duration-fast", isBookmarked ? "text-primary" : "text-muted-foreground hover:text-foreground")}
          >
            <Star size={14} fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>
        </div>
      </form>

      {adsBlocked > 0 && (
        <div className="flex items-center gap-1 px-2 h-7 rounded-md bg-success/10 text-success text-[11px] font-display tracking-wider" title="Ads blocked">
          <Shield size={12} />
          <span>{adsBlocked}</span>
        </div>
      )}

      <NavButton label="Extensions"><Puzzle size={15} /></NavButton>
      <NavButton label="Downloads"><Download size={15} /></NavButton>
      <button
        onClick={onToggleAI}
        title="AI Assistant"
        className="h-8 px-3 flex items-center gap-1.5 rounded-md text-xs font-display tracking-wider bg-primary/10 text-primary hover:bg-primary/20 transition-colors duration-fast"
      >
        <Sparkles size={13} />
        <span className="hidden sm:inline">AI</span>
      </button>
      <NavButton label="Profile"><User size={15} /></NavButton>
    </div>
  );
}
