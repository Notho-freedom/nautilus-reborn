import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera, ChevronLeft, ChevronRight, Download, Github, Home,
  Languages, Loader2, Lock, Pin, Puzzle, RotateCw, Send, Shield,
  ShieldCheck, Sparkles, Settings, Star, User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AutocompleteOverlay } from './AutocompleteOverlay';
import type { BrowserTab } from '@/hooks/useBrowserState';
import { getHistoryItems, subscribeToHistoryUpdates } from '@/lib/history';
import { getBookmarks, subscribeToBookmarksUpdates } from '@/lib/bookmarks';
import { getRecentSearches, buildAutocompleteResults, recordSearch, resolveSmartTarget, buildSearchUrl } from '@/lib/autocomplete';
import { getSettings, subscribeToSettingsUpdates } from '@/lib/settings';

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
  isGitHubConnected?: boolean;
  isGitHubOAuth?: boolean;
  githubUsername?: string;
  githubAvatarUrl?: string;
  onOpenGitHub?: () => void;
  onDisconnectGitHub?: () => void;
  onSignInWithGitHub?: () => void;
  openTabs?: BrowserTab[];
  activeTabId?: string;
  onSwitchToTab?: (tabId: string) => void;
}

function ActionHint({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom" className="glass text-xs font-body">{label}</TooltipContent>
    </Tooltip>
  );
}

export function NavigationBar({
  url, onNavigate, onHome, onBack, onForward, onReload,
  canGoBack = false, canGoForward = false, isLoading = false,
  isBookmarked = false, onToggleBookmark, onTogglePin, isPinned,
  onSnapshotVisible, onSnapshotFullPage, onSendToFlou,
  adBlockEnabled, onToggleAdBlock, onOpenExtensions, onOpenDownloads, onOpenSettings,
  onToggleAI, isGitHubConnected = false, isGitHubOAuth = false,
  githubUsername, githubAvatarUrl, onOpenGitHub, onDisconnectGitHub, onSignInWithGitHub,
  openTabs = [], activeTabId, onSwitchToTab,
}: NavigationBarProps) {
  const [query, setQuery] = useState('');
  const [displayValue, setDisplayValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [hasUserTyped, setHasUserTyped] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [snapshotBusy, setSnapshotBusy] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [searchEngine, setSearchEngine] = useState(() => getSettings().searchEngine);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const submitIntentRef = useRef(false);

  const isHttps = url.startsWith('https://');
  const isInternal = url.startsWith('notilus://');
  const profileInitial = (githubUsername?.trim().charAt(0) || 'N').toUpperCase();
  const effectiveQuery = focused ? (hasUserTyped ? query : '') : '';
  const autocompleteResults = useMemo(
    () => buildAutocompleteResults({ query: effectiveQuery, historyItems: getHistoryItems(), bookmarkItems: getBookmarks(), recentSearches: getRecentSearches(), searchEngine, openTabs, activeTabId, maxPerSection: 6 }),
    [effectiveQuery, searchEngine, dataVersion, openTabs, activeTabId]
  );
  const flatItems = autocompleteResults.flatItems;
  const overlayVisible = focused && autocompleteResults.sections.length > 0;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!submitIntentRef.current) return;
    submitIntentRef.current = false;
    if (!hasUserTyped) return;
    const target = resolveSmartTarget({ query, results: autocompleteResults, searchEngine });
    if (!target) return;
    onNavigate(target.url);
    if (target.isSearch) { recordSearch(query); setDataVersion(v => v + 1); }
    setQuery(''); setDisplayValue(''); setHasUserTyped(false); setFocused(false);
  };

  const handleSnapshot = async (mode: 'visible' | 'full') => {
    if (snapshotBusy) return;
    setSnapshotBusy(true);
    try {
      if (mode === 'visible') await onSnapshotVisible(); else await onSnapshotFullPage();
      setSnapshotOpen(false);
    } finally { setSnapshotBusy(false); }
  };

  const NavButton = ({ children, onClick, label, disabled }: { children: ReactNode; onClick?: () => void; label: string; disabled?: boolean }) => (
    <ActionHint label={label}>
      <button onClick={onClick} aria-label={label} disabled={disabled}
        className={cn(
          'h-8 w-8 flex items-center justify-center rounded-lg transition-all',
          disabled ? 'text-muted-foreground/30 cursor-not-allowed' : 'text-muted-foreground hover:text-foreground hover:bg-notilus-surface-2'
        )}
      >
        {children}
      </button>
    </ActionHint>
  );

  const UrlActionButton = ({ children, onClick, label, disabled, active, activeColor }: { children: ReactNode; onClick?: () => void; label: string; disabled?: boolean; active?: boolean; activeColor?: string }) => (
    <ActionHint label={label}>
      <button type="button" onClick={onClick} aria-label={label} disabled={disabled}
        className={cn(
          'h-6 w-6 shrink-0 flex items-center justify-center rounded-md transition-all',
          disabled ? 'text-muted-foreground/30 cursor-not-allowed'
            : active ? `${activeColor ?? 'text-primary'} hover:bg-primary/10`
              : 'text-muted-foreground hover:text-foreground hover:bg-notilus-surface-3'
        )}
      >
        {children}
      </button>
    </ActionHint>
  );

  useEffect(() => {
    const unsubHistory = subscribeToHistoryUpdates(() => setDataVersion(v => v + 1));
    const unsubBookmarks = subscribeToBookmarksUpdates(() => setDataVersion(v => v + 1));
    return () => { unsubHistory(); unsubBookmarks(); };
  }, []);

  useEffect(() => {
    const refresh = () => setSearchEngine(getSettings().searchEngine);
    refresh();
    return subscribeToSettingsUpdates(refresh);
  }, []);

  useEffect(() => {
    if (!focused) return;
    if (flatItems.length === 0) { setActiveIndex(0); return; }
    if (autocompleteResults.inlineItemId) {
      const idx = flatItems.findIndex(item => item.id === autocompleteResults.inlineItemId);
      setActiveIndex(idx >= 0 ? idx : 0); return;
    }
    setActiveIndex(0);
  }, [focused, flatItems, autocompleteResults.inlineItemId]);

  useEffect(() => {
    if (!focused) return;
    if (!hasUserTyped || !effectiveQuery) { setDisplayValue(query); return; }
    const inlineValue = autocompleteResults.inlineValue;
    if (!inlineValue || !inlineValue.toLowerCase().startsWith(effectiveQuery.toLowerCase())) { setDisplayValue(query); return; }
    setDisplayValue(inlineValue);
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input || document.activeElement !== input) return;
      try { input.setSelectionRange(effectiveQuery.length, inlineValue.length); } catch {}
    });
  }, [focused, hasUserTyped, effectiveQuery, autocompleteResults.inlineValue, query]);

  const handleSelectItem = (item: (typeof flatItems)[number]) => {
    if (item.url) onNavigate(item.url);
    else if (item.query) { onNavigate(buildSearchUrl(item.query, searchEngine)); recordSearch(item.query); setDataVersion(v => v + 1); }
    setFocused(false); setQuery(''); setDisplayValue(''); setHasUserTyped(false);
  };

  const handleSwitchToTab = (tabId: string) => {
    onSwitchToTab?.(tabId); setFocused(false); setQuery(''); setDisplayValue(''); setHasUserTyped(false);
  };

  const acceptInlineCompletion = () => {
    if (!autocompleteResults.inlineValue) return false;
    const input = inputRef.current;
    if (!input) return false;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    if (start !== effectiveQuery.length || end !== displayValue.length) return false;
    setQuery(autocompleteResults.inlineValue); setDisplayValue(autocompleteResults.inlineValue); setHasUserTyped(true);
    requestAnimationFrame(() => { try { input.setSelectionRange(autocompleteResults.inlineValue!.length, autocompleteResults.inlineValue!.length); } catch {} });
    return true;
  };

  return (
    <div className="flex items-center h-11 bg-background border-b border-border px-2 gap-1.5 shrink-0">
      {/* Nav button group */}
      <div className="flex items-center bg-notilus-surface-1 rounded-lg p-0.5 gap-0.5">
        <NavButton label="Back" onClick={onBack} disabled={!canGoBack}><ChevronLeft size={15} /></NavButton>
        <NavButton label="Forward" onClick={onForward} disabled={!canGoForward}><ChevronRight size={15} /></NavButton>
        <NavButton label="Reload" onClick={onReload}>
          {isLoading ? <Loader2 size={14} className="animate-spin text-primary" /> : <RotateCw size={14} />}
        </NavButton>
        <NavButton label="Home" onClick={onHome}><Home size={15} /></NavButton>
      </div>

      {/* URL bar */}
      <form onSubmit={handleSubmit} className="flex-1 mx-1 relative">
        <div className={cn(
          'flex items-center h-9 rounded-lg border px-3 gap-2 transition-all',
          focused
            ? 'bg-notilus-surface-1 border-primary/40 ring-2 ring-primary/15 shadow-sm'
            : 'bg-notilus-surface-1 border-border hover:border-muted-foreground/30'
        )}>
          {isInternal ? <Shield size={14} className="text-muted-foreground shrink-0" />
            : isHttps ? <Lock size={14} className="text-success shrink-0" />
              : <ShieldCheck size={14} className="text-warning shrink-0" />}
          <input
            ref={inputRef}
            data-url-input
            value={focused ? displayValue : ''}
            onChange={event => { setHasUserTyped(true); setQuery(event.target.value); setDisplayValue(event.target.value); submitIntentRef.current = false; }}
            onFocus={() => { setFocused(true); setHasUserTyped(false); setQuery(url); setDisplayValue(url); submitIntentRef.current = false; window.requestAnimationFrame(() => inputRef.current?.select()); }}
            onBlur={() => { submitIntentRef.current = false; setFocused(false); setQuery(''); setDisplayValue(''); setHasUserTyped(false); }}
            onKeyDown={event => {
              if (event.key === 'ArrowDown' && overlayVisible && flatItems.length > 0) { event.preventDefault(); setActiveIndex(prev => (prev + 1) % flatItems.length); submitIntentRef.current = false; return; }
              if (event.key === 'ArrowUp' && overlayVisible && flatItems.length > 0) { event.preventDefault(); setActiveIndex(prev => (prev - 1 + flatItems.length) % flatItems.length); submitIntentRef.current = false; return; }
              if ((event.key === 'Tab' || event.key === 'ArrowRight') && overlayVisible) { const accepted = acceptInlineCompletion(); if (accepted) { event.preventDefault(); submitIntentRef.current = false; return; } }
              if (event.key === 'Escape') { event.preventDefault(); setFocused(false); setQuery(''); setDisplayValue(''); setHasUserTyped(false); submitIntentRef.current = false; return; }
              if (event.key === 'Enter' && !(event.nativeEvent as KeyboardEvent).isComposing) { if (overlayVisible && flatItems.length > 0) { event.preventDefault(); const item = flatItems[activeIndex]; if (item) handleSelectItem(item); submitIntentRef.current = false; return; } submitIntentRef.current = true; return; }
              submitIntentRef.current = false;
            }}
            placeholder={url}
            className="flex-1 bg-transparent text-sm font-body text-foreground placeholder:text-muted-foreground outline-none selection:bg-primary selection:text-primary-foreground"
          />
          <UrlActionButton label={isBookmarked ? 'Remove favorite' : 'Add favorite'} onClick={() => onToggleBookmark?.()} active={isBookmarked}>
            <Star size={14} fill={isBookmarked ? 'currentColor' : 'none'} />
          </UrlActionButton>
          <UrlActionButton label={isPinned ? 'Unpin tab' : 'Pin tab'} onClick={onTogglePin} active={isPinned}>
            <Pin size={14} fill={isPinned ? 'currentColor' : 'none'} />
          </UrlActionButton>
          <Popover open={snapshotOpen} onOpenChange={setSnapshotOpen}>
            <ActionHint label="Snapshot">
              <PopoverTrigger aria-label="Snapshot" className={cn('h-6 w-6 shrink-0 flex items-center justify-center rounded-md transition-all text-muted-foreground hover:text-foreground hover:bg-notilus-surface-3', snapshotBusy ? 'opacity-60 cursor-not-allowed' : '')} disabled={snapshotBusy}>
                {snapshotBusy ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
              </PopoverTrigger>
            </ActionHint>
            <PopoverContent align="end" sideOffset={8} className="w-52 p-2 glass border-border">
              <div className="text-[11px] font-display text-muted-foreground uppercase tracking-widest mb-1.5 px-1">Snapshot</div>
              <button type="button" onClick={() => void handleSnapshot('visible')} disabled={snapshotBusy} className="w-full h-8 px-2 rounded-md text-xs font-body text-foreground hover:bg-notilus-surface-2 transition-colors text-left">Capture visible area</button>
              <button type="button" onClick={() => void handleSnapshot('full')} disabled={snapshotBusy} className="w-full h-8 px-2 rounded-md text-xs font-body text-foreground hover:bg-notilus-surface-2 transition-colors text-left">Capture full page</button>
            </PopoverContent>
          </Popover>
          <UrlActionButton label={adBlockEnabled ? 'Disable ad block' : 'Enable ad block'} onClick={onToggleAdBlock} active={adBlockEnabled} activeColor="text-success">
            <Shield size={14} fill={adBlockEnabled ? 'currentColor' : 'none'} />
          </UrlActionButton>
          <UrlActionButton label="Translate (coming soon)" disabled><Languages size={14} /></UrlActionButton>
          <UrlActionButton label="Send to flou" onClick={onSendToFlou}><Send size={14} /></UrlActionButton>
        </div>
        {overlayVisible && (
          <AutocompleteOverlay sections={autocompleteResults.sections} activeItemId={flatItems[activeIndex]?.id} onSelect={handleSelectItem} onSwitchToTab={handleSwitchToTab} />
        )}
      </form>

      {/* Right actions group */}
      <div className="flex items-center bg-notilus-surface-1 rounded-lg p-0.5 gap-0.5">
        <NavButton label="Extensions" onClick={onOpenExtensions}><Puzzle size={15} /></NavButton>
        <NavButton label="Downloads" onClick={onOpenDownloads}><Download size={15} /></NavButton>
        <ActionHint label="AI assistant">
          <button onClick={onToggleAI} aria-label="AI assistant" className="h-8 w-8 flex items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-all">
            <Sparkles size={15} />
          </button>
        </ActionHint>
      </div>

      {/* Profile */}
      <Popover>
        <ActionHint label={isGitHubConnected ? `Profile: ${githubUsername || 'connected'}` : 'Profile'}>
          <PopoverTrigger aria-label="Profile" className="h-8 w-8 flex items-center justify-center rounded-lg transition-all overflow-hidden hover:ring-2 hover:ring-primary/20">
            <Avatar className={cn('h-7 w-7', isGitHubConnected ? 'ring-2 ring-primary/40' : 'ring-1 ring-border')}>
              <AvatarImage src={githubAvatarUrl} alt={githubUsername || 'Profile avatar'} />
              <AvatarFallback className="text-[10px] font-display bg-notilus-surface-2 text-foreground">
                {isGitHubConnected ? profileInitial : <User size={12} />}
              </AvatarFallback>
            </Avatar>
          </PopoverTrigger>
        </ActionHint>
        <PopoverContent align="end" sideOffset={8} className="w-56 p-3 glass border-border">
          {isGitHubConnected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7 ring-2 ring-primary/40 shrink-0">
                  <AvatarImage src={githubAvatarUrl} alt={githubUsername || 'Profile avatar'} />
                  <AvatarFallback className="text-[10px] font-display bg-notilus-surface-2 text-foreground">{profileInitial}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-xs font-display text-foreground truncate">{githubUsername || 'Connected'}</p>
                  <p className="text-[10px] font-body text-muted-foreground">{isGitHubOAuth ? 'OAuth session' : 'Personal Access Token'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={onOpenGitHub} className="flex-1 h-8 rounded-lg bg-notilus-surface-2 border border-border text-xs font-body text-muted-foreground hover:text-foreground hover:bg-notilus-surface-3 transition-all">Repos</button>
                <button type="button" onClick={onDisconnectGitHub} className="flex-1 h-8 rounded-lg bg-notilus-surface-2 border border-border text-xs font-body text-muted-foreground hover:text-foreground hover:bg-notilus-surface-3 transition-all">Disconnect</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] font-body text-muted-foreground">Sign in to access your repositories and sync your profile.</p>
              <button type="button" onClick={onSignInWithGitHub} className="w-full h-9 rounded-lg notilus-gradient text-xs font-display text-primary-foreground tracking-wider flex items-center justify-center gap-2 shadow-sm hover:shadow-glow transition-shadow">
                <Github size={14} /> Sign in with GitHub
              </button>
              <div className="text-[10px] font-body text-muted-foreground text-center">
                or <button type="button" onClick={onOpenGitHub} className="text-primary hover:underline">use a Personal Access Token</button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <NavButton label="Settings" onClick={onOpenSettings}><Settings size={15} /></NavButton>
    </div>
  );
}
