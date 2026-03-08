import { type ReactNode, useRef, useState } from 'react';
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
  userAvatarUrl?: string;
  userDisplayName?: string;
  userEmail?: string;
  isAuthenticated?: boolean;
  onSignIn?: () => void;
  onSignOut?: () => void;
}

function ActionHint({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
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
  userAvatarUrl,
  userDisplayName,
  userEmail,
  isAuthenticated = false,
  onSignIn,
  onSignOut,
}: NavigationBarProps) {
  const [inputValue, setInputValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [snapshotBusy, setSnapshotBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const submitIntentRef = useRef(false);

  const isHttps = url.startsWith('https://');
  const isInternal = url.startsWith('notilus://');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!submitIntentRef.current) return;
    submitIntentRef.current = false;
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
    <ActionHint label={label}>
      <button
        onClick={onClick}
        aria-label={label}
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
    <ActionHint label={label}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
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
              submitIntentRef.current = false;
              window.requestAnimationFrame(() => {
                inputRef.current?.select();
              });
            }}
            onBlur={() => {
              submitIntentRef.current = false;
              setFocused(false);
            }}
            onKeyDown={event => {
              if (event.key === 'Enter' && !(event.nativeEvent as KeyboardEvent).isComposing) {
                submitIntentRef.current = true;
                return;
              }
              submitIntentRef.current = false;
            }}
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
            <ActionHint label="Snapshot">
              <PopoverTrigger
                aria-label="Snapshot"
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
      <ActionHint label="AI assistant">
        <button
          onClick={onToggleAI}
          aria-label="AI assistant"
          className="h-8 w-8 flex items-center justify-center rounded-md bg-muted/60 text-foreground hover:bg-primary/10 transition-colors duration-fast"
        >
          <Sparkles size={14} />
        </button>
      </ActionHint>
      <Popover>
        <ActionHint label={isAuthenticated ? userDisplayName || 'Profile' : 'Sign in'}>
          <PopoverTrigger
            aria-label="Profile"
            className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors duration-fast overflow-hidden"
          >
            {isAuthenticated && userAvatarUrl ? (
              <img src={userAvatarUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
            ) : (
              <User size={15} />
            )}
          </PopoverTrigger>
        </ActionHint>
        <PopoverContent align="end" sideOffset={8} className="w-56 p-3 glass border-border">
          {isAuthenticated ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {userAvatarUrl && <img src={userAvatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />}
                <div className="min-w-0">
                  <p className="text-xs font-display text-foreground truncate">{userDisplayName || 'User'}</p>
                  <p className="text-[10px] font-body text-muted-foreground truncate">{userEmail}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="w-full h-8 rounded-md bg-notilus-surface-1 border border-border text-xs font-body text-muted-foreground hover:text-foreground hover:bg-notilus-surface-2 transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] font-body text-muted-foreground">Sign in to sync your data across sessions.</p>
              <button
                type="button"
                onClick={onSignIn}
                className="w-full h-9 rounded-lg notilus-gradient text-xs font-display text-primary-foreground tracking-wider flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Sign in with Google
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      <NavButton label="Settings" onClick={onOpenSettings}>
        <Settings size={15} />
      </NavButton>
    </div>
  );
}
