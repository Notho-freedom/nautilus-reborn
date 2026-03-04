import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Download,
  Home,
  Languages,
  Loader2,
  Lock,
  Pin,
  Puzzle,
  RotateCw,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  Settings,
  Star,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  onTogglePin: () => void;
  isPinned: boolean;
  onSnapshotVisible: () => Promise<void> | void;
  onSnapshotFullPage: () => Promise<void> | void;
  onSendToFlou: () => void;
  adBlockEnabled: boolean;
  onToggleAdBlock: () => void;
  onOpenExtensions?: () => void;
  onOpenDownloads?: () => void;
  onOpenSettings?: () => void;
  onToggleAI: () => void;
  onOverlayBlockingChange?: (isBlocking: boolean) => void;
  useNativeTitleMode?: boolean;
}

function ActionHint({
  label,
  useNativeTitleMode,
  children,
}: {
  label: string;
  useNativeTitleMode: boolean;
  children: ReactNode;
}) {
  if (useNativeTitleMode) {
    return <>{children}</>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom" className="glass text-xs font-body">
        {label}
      </TooltipContent>
    </Tooltip>
  );
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
  isBookmarked = false,
  onToggleBookmark,
  onTogglePin,
  isPinned,
  onSnapshotVisible,
  onSnapshotFullPage,
  onSendToFlou,
  adBlockEnabled,
  onToggleAdBlock,
  onOpenExtensions,
  onOpenDownloads,
  onOpenSettings,
  onToggleAI,
  onOverlayBlockingChange,
  useNativeTitleMode = false,
}: NavigationBarProps) {
  const [inputValue, setInputValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [snapshotBusy, setSnapshotBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isHttps = url.startsWith('https://');
  const isInternal = url.startsWith('notilus://');

  useEffect(() => {
    onOverlayBlockingChange?.(snapshotOpen);
  }, [snapshotOpen, onOverlayBlockingChange]);

  useEffect(() => {
    return () => {
      onOverlayBlockingChange?.(false);
    };
  }, [onOverlayBlockingChange]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!inputValue.trim()) return;
    const finalUrl = inputValue.includes('://') ? inputValue : `https://${inputValue}`;
    onNavigate(finalUrl);
    setInputValue('');
    setFocused(false);
  };

  const handleSnapshot = async (mode: 'visible' | 'full') => {
    if (snapshotBusy) return;
    setSnapshotBusy(true);
    try {
      if (mode === 'visible') {
        await onSnapshotVisible();
      } else {
        await onSnapshotFullPage();
      }
      setSnapshotOpen(false);
    } finally {
      setSnapshotBusy(false);
    }
  };

  const NavButton = ({
    children,
    onClick,
    label,
    disabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    label: string;
    disabled?: boolean;
  }) => (
    <ActionHint label={label} useNativeTitleMode={useNativeTitleMode}>
      <button
        onClick={onClick}
        aria-label={label}
        title={useNativeTitleMode ? label : undefined}
        disabled={disabled}
        className={cn(
          'h-8 w-8 flex items-center justify-center rounded-md transition-colors duration-fast',
          disabled
            ? 'text-muted-foreground/40 cursor-not-allowed'
            : 'text-muted-foreground hover:text-foreground hover:bg-primary/10'
        )}
      >
        {children}
      </button>
    </ActionHint>
  );

  const UrlActionButton = ({
    children,
    onClick,
    label,
    disabled,
    active,
    activeColor,
  }: {
    children: ReactNode;
    onClick?: () => void;
    label: string;
    disabled?: boolean;
    active?: boolean;
    activeColor?: string;
  }) => (
    <ActionHint label={label} useNativeTitleMode={useNativeTitleMode}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        title={useNativeTitleMode ? label : undefined}
        disabled={disabled}
        className={cn(
          'h-6 w-6 shrink-0 flex items-center justify-center rounded-md transition-colors duration-fast',
          disabled
            ? 'text-muted-foreground/40 cursor-not-allowed'
            : active
              ? `${activeColor ?? 'text-primary'} hover:bg-primary/10`
              : 'text-muted-foreground hover:text-foreground hover:bg-primary/10'
        )}
      >
        {children}
      </button>
    </ActionHint>
  );

  return (
    <div className="flex items-center h-10 bg-background border-b border-border px-2 gap-1 shrink-0">
      <NavButton label="Back" onClick={onBack} disabled={!canGoBack}>
        <ChevronLeft size={15} />
      </NavButton>
      <NavButton label="Forward" onClick={onForward} disabled={!canGoForward}>
        <ChevronRight size={15} />
      </NavButton>
      <NavButton label="Reload" onClick={onReload}>
        {isLoading ? (
          <Loader2 size={14} className="animate-spin text-muted-foreground" />
        ) : (
          <RotateCw size={14} />
        )}
      </NavButton>
      <NavButton label="Home" onClick={onHome}>
        <Home size={15} />
      </NavButton>

      <form onSubmit={handleSubmit} className="flex-1 mx-2">
        <div
          className={cn(
            'flex items-center h-8 rounded-lg border px-3 gap-1.5 transition-colors duration-fast',
            focused
              ? 'bg-notilus-surface-1 border-primary/50'
              : 'bg-transparent border-transparent hover:bg-primary/10'
          )}
        >
          {isInternal ? (
            <Shield size={13} className="text-muted-foreground shrink-0" />
          ) : isHttps ? (
            <Lock size={13} className="text-muted-foreground shrink-0" />
          ) : (
            <ShieldCheck size={13} className="text-muted-foreground shrink-0" />
          )}
          <input
            ref={inputRef}
            data-url-input
            value={focused ? inputValue : ''}
            onChange={event => setInputValue(event.target.value)}
            onFocus={() => {
              setFocused(true);
              setInputValue(url);
              window.requestAnimationFrame(() => {
                inputRef.current?.select();
              });
            }}
            onBlur={() => setFocused(false)}
            placeholder={url}
            className="flex-1 bg-transparent text-sm font-body text-foreground placeholder:text-muted-foreground outline-none selection:bg-primary selection:text-primary-foreground"
          />

          <UrlActionButton
            label={isBookmarked ? 'Remove favorite' : 'Add favorite'}
            onClick={() => onToggleBookmark?.()}
            active={isBookmarked}
          >
            <Star size={13} fill={isBookmarked ? 'currentColor' : 'none'} />
          </UrlActionButton>

          <UrlActionButton label={isPinned ? 'Unpin tab' : 'Pin tab'} onClick={onTogglePin} active={isPinned}>
            <Pin size={13} fill={isPinned ? 'currentColor' : 'none'} />
          </UrlActionButton>

          <Popover open={snapshotOpen} onOpenChange={setSnapshotOpen}>
            <ActionHint label="Snapshot" useNativeTitleMode={useNativeTitleMode}>
              <PopoverTrigger
                aria-label="Snapshot"
                title={useNativeTitleMode ? 'Snapshot' : undefined}
                className={cn(
                  'h-6 w-6 shrink-0 flex items-center justify-center rounded-md transition-colors duration-fast text-muted-foreground hover:text-foreground hover:bg-primary/10',
                  snapshotBusy ? 'opacity-60 cursor-not-allowed' : ''
                )}
                disabled={snapshotBusy}
              >
                {snapshotBusy ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
              </PopoverTrigger>
            </ActionHint>
            <PopoverContent align="end" sideOffset={8} className="w-52 p-2 glass border-border">
              <div className="text-[11px] font-display text-muted-foreground uppercase tracking-widest mb-1.5 px-1">
                Snapshot
              </div>
              <button
                type="button"
                onClick={() => {
                  void handleSnapshot('visible');
                }}
                disabled={snapshotBusy}
                className="w-full h-8 px-2 rounded-md text-xs font-body text-foreground hover:bg-muted/60 transition-colors duration-fast text-left"
              >
                Capture visible area
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleSnapshot('full');
                }}
                disabled={snapshotBusy}
                className="w-full h-8 px-2 rounded-md text-xs font-body text-foreground hover:bg-muted/60 transition-colors duration-fast text-left"
              >
                Capture full page
              </button>
            </PopoverContent>
          </Popover>

          <UrlActionButton
            label={adBlockEnabled ? 'Disable ad block' : 'Enable ad block'}
            onClick={onToggleAdBlock}
            active={adBlockEnabled}
            activeColor="text-success"
          >
            <Shield size={13} fill={adBlockEnabled ? 'currentColor' : 'none'} />
          </UrlActionButton>

          <UrlActionButton label="Translate (coming soon)" disabled>
            <Languages size={13} />
          </UrlActionButton>

          <UrlActionButton label="Send to flou" onClick={onSendToFlou}>
            <Send size={13} />
          </UrlActionButton>
        </div>
      </form>

      <div data-testid="nav-right-separator" className="h-5 w-px bg-primary/60 mx-1 shrink-0" />

      <NavButton label="Extensions" onClick={onOpenExtensions}>
        <Puzzle size={15} />
      </NavButton>
      <NavButton label="Downloads" onClick={onOpenDownloads}>
        <Download size={15} />
      </NavButton>
      <ActionHint label="AI assistant" useNativeTitleMode={useNativeTitleMode}>
        <button
          onClick={onToggleAI}
          aria-label="AI assistant"
          title={useNativeTitleMode ? 'AI assistant' : undefined}
          className="h-8 w-8 flex items-center justify-center rounded-md bg-muted/60 text-foreground hover:bg-primary/10 transition-colors duration-fast"
        >
          <Sparkles size={14} />
        </button>
      </ActionHint>
      <NavButton label="Profile">
        <User size={15} />
      </NavButton>
      <NavButton label="Settings" onClick={onOpenSettings}>
        <Settings size={15} />
      </NavButton>
    </div>
  );
}
