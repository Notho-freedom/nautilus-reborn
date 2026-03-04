import { useEffect, useRef, useState } from 'react';
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
  Star,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExternalOverlayBridge } from '@/hooks/useExternalOverlayBridge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface NavigationBarProps {
  isExternalOverlayMode?: boolean;
  activeTabId?: string;
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
  onToggleAI: () => void;
}

function ButtonTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip delayDuration={250}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom" className="glass text-xs font-body">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function NavigationBar({
  isExternalOverlayMode = false,
  activeTabId,
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
  onToggleAI,
}: NavigationBarProps) {
  const [inputValue, setInputValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [snapshotBusy, setSnapshotBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const snapshotButtonRef = useRef<HTMLButtonElement>(null);
  const externalSnapshotMode = isExternalOverlayMode;
  const snapshotOverlayId = 'nav-snapshot-menu';

  const isHttps = url.startsWith('https://');
  const isInternal = url.startsWith('notilus://');

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

  const overlayBridge = useExternalOverlayBridge({
    enabled: externalSnapshotMode,
    tabId: activeTabId ?? null,
    onEvent: event => {
      if (event.overlayId !== snapshotOverlayId) return;
      if (event.action === 'capture-visible') {
        void handleSnapshot('visible');
        setSnapshotOpen(false);
      } else if (event.action === 'capture-full') {
        void handleSnapshot('full');
        setSnapshotOpen(false);
      } else if (event.action === 'close') {
        setSnapshotOpen(false);
      }
    },
  });

  const publishSnapshotOverlay = () => {
    const viewport = document.querySelector<HTMLElement>('[data-testid="electron-viewport"]');
    const viewportRect = viewport?.getBoundingClientRect() ?? new DOMRect(0, 0, window.innerWidth, window.innerHeight);
    const rect = snapshotButtonRef.current?.getBoundingClientRect();
    const anchorX = Math.max(8, Math.floor((rect?.left ?? viewportRect.left + 12) - viewportRect.left));
    const anchorY = Math.max(8, Math.floor((rect?.top ?? viewportRect.top + 8) - viewportRect.top));
    overlayBridge.setState({
      blocking: true,
      overlays: [
        {
          id: snapshotOverlayId,
          kind: 'menu',
          source: 'navigation',
          anchor: { x: anchorX, y: anchorY, width: rect?.width ?? 24, height: rect?.height ?? 24 },
          width: 220,
          items: [
            { id: 'capture-visible', label: 'Capture visible area' },
            { id: 'capture-full', label: 'Capture full page' },
          ],
        },
      ],
    });
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
    <ButtonTooltip label={label}>
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
    </ButtonTooltip>
  );

  const UrlActionButton = ({
    children,
    onClick,
    label,
    disabled,
    active,
    activeColor,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    label: string;
    disabled?: boolean;
    active?: boolean;
    activeColor?: string;
  }) => (
    <ButtonTooltip label={label}>
      <button
        type="button"
        onClick={onClick}
        title={label}
        disabled={disabled}
        className={cn(
          'h-6 w-6 shrink-0 flex items-center justify-center rounded-md transition-colors duration-fast',
          disabled
            ? 'text-muted-foreground/40 cursor-not-allowed'
            : active
              ? `${activeColor ?? 'text-primary'} hover:bg-muted/60`
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
        )}
      >
        {children}
      </button>
    </ButtonTooltip>
  );

  useEffect(() => {
    if (!externalSnapshotMode) {
      overlayBridge.clear();
      return;
    }
    if (snapshotOpen) {
      publishSnapshotOverlay();
      return;
    }
    overlayBridge.clear();
  }, [externalSnapshotMode, snapshotOpen]);

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

          {externalSnapshotMode ? (
            <ButtonTooltip label="Snapshot">
              <button
                ref={snapshotButtonRef}
                type="button"
                title="Snapshot"
                onClick={() => setSnapshotOpen(prev => !prev)}
                className={cn(
                  'h-6 w-6 shrink-0 flex items-center justify-center rounded-md transition-colors duration-fast text-muted-foreground hover:text-foreground hover:bg-muted/60',
                  snapshotBusy ? 'opacity-60 cursor-not-allowed' : ''
                )}
                disabled={snapshotBusy}
              >
                {snapshotBusy ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
              </button>
            </ButtonTooltip>
          ) : (
            <Popover open={snapshotOpen} onOpenChange={setSnapshotOpen}>
              <ButtonTooltip label="Snapshot">
                <PopoverTrigger
                  ref={snapshotButtonRef}
                  title="Snapshot"
                  className={cn(
                    'h-6 w-6 shrink-0 flex items-center justify-center rounded-md transition-colors duration-fast text-muted-foreground hover:text-foreground hover:bg-muted/60',
                    snapshotBusy ? 'opacity-60 cursor-not-allowed' : ''
                  )}
                  disabled={snapshotBusy}
                >
                  {snapshotBusy ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
                </PopoverTrigger>
              </ButtonTooltip>
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
          )}

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

      <NavButton label="Extensions" onClick={onOpenExtensions}>
        <Puzzle size={15} />
      </NavButton>
      <NavButton label="Downloads" onClick={onOpenDownloads}>
        <Download size={15} />
      </NavButton>
      <ButtonTooltip label="AI assistant">
        <button
          onClick={onToggleAI}
          title="AI Assistant"
          className="h-8 w-8 flex items-center justify-center rounded-md bg-muted/60 text-foreground hover:bg-muted transition-colors duration-fast"
        >
          <Sparkles size={14} />
        </button>
      </ButtonTooltip>
      <NavButton label="Profile">
        <User size={15} />
      </NavButton>
    </div>
  );
}
