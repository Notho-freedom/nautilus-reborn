import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Clock, Zap, Quote, Terminal, Plus, Wrench, ShieldCheck } from 'lucide-react';
import { getBookmarks, subscribeToBookmarksUpdates } from '@/lib/bookmarks';
import { getHistoryItems, subscribeToHistoryUpdates } from '@/lib/history';
import { getSettings, subscribeToSettingsUpdates, type BrowserSettings } from '@/lib/settings';
import { resolveInitialWallpaper, pickRandomDefaultWallpaper } from '@/lib/defaultWallpapers';
import { AutocompleteOverlay } from './AutocompleteOverlay';
import type { BrowserTab } from '@/hooks/useBrowserState';
import { buildAutocompleteResults, buildSearchUrl, getRecentSearches, recordSearch } from '@/lib/autocomplete';
import { cn } from '@/lib/utils';

interface SpeedDialProps {
  onNavigate: (url: string) => void;
  openTabs?: BrowserTab[];
  activeTabId?: string;
  onSwitchToTab?: (tabId: string) => void;
}

const SPEED_DIAL_WALLPAPER_KEY = 'notilus_v2_speed_dial_wallpaper';
type WallpaperStatus = 'idle' | 'loading' | 'loaded' | 'error';

const DEFAULT_FAVORITES = [
  { name: 'GitHub', url: 'https://github.com' },
  { name: 'Stack Overflow', url: 'https://stackoverflow.com' },
  { name: 'MDN Docs', url: 'https://developer.mozilla.org' },
  { name: 'npm', url: 'https://npmjs.com' },
  { name: 'Dev.to', url: 'https://dev.to' },
  { name: 'CodePen', url: 'https://codepen.io' },
  { name: 'Hacker News', url: 'https://news.ycombinator.com' },
  { name: 'Reddit', url: 'https://reddit.com' },
];

const DEFAULT_RECENT = [
  { title: 'React Docs - Quick Start', url: 'https://react.dev/learn', time: '5 min ago' },
  { title: 'GitHub - notilus/browser', url: 'https://github.com/notilus', time: '12 min ago' },
  { title: 'Tailwind CSS - Docs', url: 'https://tailwindcss.com/docs', time: '1h ago' },
];

const QUOTES = [
  { text: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", author: "Martin Fowler" },
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { text: "Code is like humor. When you have to explain it, it's bad.", author: "Cory House" },
  { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
  { text: "Simplicity is the soul of efficiency.", author: "Austin Freeman" },
];

function formatRecentTime(visitedAt: string): string {
  const date = new Date(visitedAt);
  if (Number.isNaN(date.getTime())) return '';
  const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSeconds < 60) return 'just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} min ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} h ago`;
  return `${Math.floor(diffSeconds / 86400)} d ago`;
}

export function SpeedDial({ onNavigate, openTabs = [], activeTabId, onSwitchToTab }: SpeedDialProps) {
  const [time, setTime] = useState(new Date());
  const [query, setQuery] = useState('');
  const [displayValue, setDisplayValue] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [hasUserTyped, setHasUserTyped] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [searchEngine, setSearchEngine] = useState(() => getSettings().searchEngine);
  const [homePageStyle, setHomePageStyle] = useState<BrowserSettings['homePageStyle']>(() => getSettings().homePageStyle);
  const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);
  const [wallpaperStatus, setWallpaperStatus] = useState<WallpaperStatus>('idle');
  const [favorites, setFavorites] = useState(DEFAULT_FAVORITES);
  const [recent, setRecent] = useState(DEFAULT_RECENT);
  const [activeIndex, setActiveIndex] = useState(0);
  const [autocompleteVersion, setAutocompleteVersion] = useState(0);
  const submitIntentRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const effectiveQuery = searchFocused ? query : '';
  const autocompleteResults = useMemo(
    () => buildAutocompleteResults({ query: effectiveQuery, historyItems: getHistoryItems(), bookmarkItems: getBookmarks(), recentSearches: getRecentSearches(), searchEngine, openTabs, activeTabId, maxPerSection: 6 }),
    [effectiveQuery, searchEngine, autocompleteVersion, openTabs, activeTabId]
  );
  const flatItems = autocompleteResults.flatItems;
  const overlayVisible = searchFocused && autocompleteResults.sections.length > 0;

  useEffect(() => { const interval = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(interval); }, []);
  useEffect(() => { const iv = setInterval(() => setQuoteIdx(i => (i + 1) % QUOTES.length), 8000); return () => clearInterval(iv); }, []);

  useEffect(() => {
    const refreshFavorites = () => {
      const bookmarks = getBookmarks().slice(0, 8).map(bookmark => ({ name: bookmark.title, url: bookmark.url }));
      setFavorites(bookmarks.length > 0 ? bookmarks : DEFAULT_FAVORITES);
      setAutocompleteVersion(v => v + 1);
    };
    refreshFavorites();
    return subscribeToBookmarksUpdates(refreshFavorites);
  }, []);

  useEffect(() => {
    const refreshRecent = () => {
      const recentHistory = getHistoryItems().slice(0, 3).map(item => ({ title: item.title, url: item.url, time: formatRecentTime(item.visitedAt) }));
      setRecent(recentHistory.length > 0 ? recentHistory : DEFAULT_RECENT);
      setAutocompleteVersion(v => v + 1);
    };
    refreshRecent();
    return subscribeToHistoryUpdates(refreshRecent);
  }, []);

  useEffect(() => {
    const refreshSettings = () => { const settings = getSettings(); setSearchEngine(settings.searchEngine); setHomePageStyle(settings.homePageStyle); };
    refreshSettings();
    return subscribeToSettingsUpdates(refreshSettings);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (homePageStyle !== 'modern') { setWallpaperUrl(null); setWallpaperStatus('idle'); return; }
    const storedUrl = window.localStorage.getItem(SPEED_DIAL_WALLPAPER_KEY);
    const resolved = resolveInitialWallpaper(storedUrl);
    if (storedUrl !== resolved) window.localStorage.setItem(SPEED_DIAL_WALLPAPER_KEY, resolved);
    setWallpaperUrl(resolved);
    setWallpaperStatus('loading');
  }, [homePageStyle]);

  useEffect(() => {
    if (homePageStyle !== 'modern') return;
    const intervalSeconds = getSettings().wallpaperInterval || 30;
    const timer = setInterval(() => {
      const next = pickRandomDefaultWallpaper();
      setWallpaperUrl(next); setWallpaperStatus('loading');
      window.localStorage.setItem(SPEED_DIAL_WALLPAPER_KEY, next);
    }, intervalSeconds * 1000);
    return () => clearInterval(timer);
  }, [homePageStyle]);

  const searchPlaceholder = useMemo(() => {
    if (searchEngine === 'google') return 'Search with Google or enter URL...';
    if (searchEngine === 'brave') return 'Search with Brave Search or enter URL...';
    return 'Search with DuckDuckGo or enter URL...';
  }, [searchEngine]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitIntentRef.current) return;
    submitIntentRef.current = false;
    const trimmed = query.trim();
    if (!trimmed) return;
    onNavigate(buildSearchUrl(trimmed, searchEngine));
    recordSearch(trimmed);
    setAutocompleteVersion(v => v + 1);
    setQuery(''); setDisplayValue(''); setHasUserTyped(false); setSearchFocused(false);
  };

  const greeting = () => {
    const h = time.getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const showModernWallpaper = homePageStyle === 'modern' && wallpaperUrl !== null && wallpaperStatus !== 'error';

  useEffect(() => {
    if (!searchFocused) return;
    if (flatItems.length === 0) { setActiveIndex(0); return; }
    if (autocompleteResults.inlineItemId) {
      const idx = flatItems.findIndex(item => item.id === autocompleteResults.inlineItemId);
      setActiveIndex(idx >= 0 ? idx : 0); return;
    }
    setActiveIndex(0);
  }, [searchFocused, flatItems, autocompleteResults.inlineItemId]);

  useEffect(() => {
    if (!searchFocused) return;
    if (!hasUserTyped || !effectiveQuery) { setDisplayValue(query); return; }
    const inlineValue = autocompleteResults.inlineValue;
    if (!inlineValue || !inlineValue.toLowerCase().startsWith(effectiveQuery.toLowerCase())) { setDisplayValue(query); return; }
    setDisplayValue(inlineValue);
    requestAnimationFrame(() => {
      const input = searchInputRef.current;
      if (!input || document.activeElement !== input) return;
      try { input.setSelectionRange(effectiveQuery.length, inlineValue.length); } catch {}
    });
  }, [searchFocused, hasUserTyped, effectiveQuery, autocompleteResults.inlineValue, query]);

  const handleSelectItem = (item: (typeof flatItems)[number]) => {
    if (item.url) onNavigate(item.url);
    else if (item.query) { onNavigate(buildSearchUrl(item.query, searchEngine)); recordSearch(item.query); setAutocompleteVersion(v => v + 1); }
    setQuery(''); setDisplayValue(''); setHasUserTyped(false); setSearchFocused(false);
  };

  const handleSwitchToTab = (tabId: string) => {
    onSwitchToTab?.(tabId); setQuery(''); setDisplayValue(''); setHasUserTyped(false); setSearchFocused(false);
  };

  const acceptInlineCompletion = () => {
    if (!autocompleteResults.inlineValue) return false;
    const input = searchInputRef.current;
    if (!input) return false;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    if (start !== effectiveQuery.length || end !== displayValue.length) return false;
    setQuery(autocompleteResults.inlineValue); setDisplayValue(autocompleteResults.inlineValue); setHasUserTyped(true);
    requestAnimationFrame(() => { try { input.setSelectionRange(autocompleteResults.inlineValue!.length, autocompleteResults.inlineValue!.length); } catch {} });
    return true;
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-start p-8 overflow-y-auto no-scrollbar relative">
      {showModernWallpaper && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img
            data-testid="speed-dial-wallpaper-image"
            src={wallpaperUrl}
            alt=""
            className={`h-full w-full object-cover transition-opacity duration-700 ${wallpaperStatus === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setWallpaperStatus('loaded')}
            onError={() => setWallpaperStatus('error')}
          />
        </div>
      )}

      {showModernWallpaper && <div data-testid="speed-dial-wallpaper-scrim" className="absolute inset-0 z-[1] bg-gradient-to-b from-background/60 via-background/30 to-background/80 pointer-events-none" />}
      <div data-testid="speed-dial-gradient-overlay" className="absolute inset-0 z-[2] gradient-overlay pointer-events-none" />
      {searchFocused && <div className="absolute inset-0 z-[3] bg-background/70 backdrop-blur-sm" />}

      <div className={cn('relative z-10 transition-all duration-300', searchFocused ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100')}>
        {/* Logo */}
        <div className="mb-4 mt-8 flex flex-col items-center animate-fade-in-up">
          <img
            src="/logo_n_no_bg.png"
            alt="Notilus"
            className="w-20 h-20 object-contain mb-1 drop-shadow-[0_0_20px_hsl(var(--primary)/0.25)] hover:drop-shadow-[0_0_30px_hsl(var(--primary)/0.5)] transition-all duration-300"
          />
        </div>

        {/* Clock */}
        <div className="mb-6 text-center animate-fade-in-up" style={{ animationDelay: '60ms' }}>
          <div className="text-5xl font-display font-light text-foreground tracking-[0.15em]">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-sm font-body text-muted-foreground mt-1.5">
            {greeting()} · {time.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="w-full max-w-lg mb-8 relative z-[4] animate-fade-in-up" style={{ animationDelay: '120ms' }}>
        <div className={cn(
          'flex items-center h-12 rounded-2xl px-4 gap-3 transition-all duration-200 relative',
          searchFocused
            ? 'bg-notilus-surface-2 ring-1 ring-primary/25 shadow-[0_0_24px_-6px_hsl(var(--primary)/0.4)]'
            : 'bg-notilus-surface-2/60 hover:bg-notilus-surface-2/80'
        )}>
          <Search size={18} strokeWidth={1.25} className="text-muted-foreground" />
          <input
            ref={searchInputRef}
            value={searchFocused ? displayValue : ''}
            onChange={e => { setHasUserTyped(true); setQuery(e.target.value); setDisplayValue(e.target.value); submitIntentRef.current = false; }}
            onFocus={() => { setSearchFocused(true); setHasUserTyped(false); setQuery(''); setDisplayValue(''); }}
            onBlur={() => { submitIntentRef.current = false; setSearchFocused(false); setQuery(''); setDisplayValue(''); setHasUserTyped(false); }}
            onKeyDown={event => {
              if (event.key === 'ArrowDown' && overlayVisible && flatItems.length > 0) { event.preventDefault(); setActiveIndex(prev => (prev + 1) % flatItems.length); submitIntentRef.current = false; return; }
              if (event.key === 'ArrowUp' && overlayVisible && flatItems.length > 0) { event.preventDefault(); setActiveIndex(prev => (prev - 1 + flatItems.length) % flatItems.length); submitIntentRef.current = false; return; }
              if ((event.key === 'Tab' || event.key === 'ArrowRight') && overlayVisible) { const accepted = acceptInlineCompletion(); if (accepted) { event.preventDefault(); submitIntentRef.current = false; return; } }
              if (event.key === 'Escape') { event.preventDefault(); setSearchFocused(false); setQuery(''); setDisplayValue(''); setHasUserTyped(false); submitIntentRef.current = false; return; }
              if (event.key === 'Enter' && !(event.nativeEvent as KeyboardEvent).isComposing) {
                if (overlayVisible && flatItems.length > 0) { event.preventDefault(); const item = flatItems[activeIndex]; if (item) handleSelectItem(item); submitIntentRef.current = false; return; }
                submitIntentRef.current = true; return;
              }
              submitIntentRef.current = false;
            }}
            placeholder={searchPlaceholder}
            className="flex-1 bg-transparent text-base font-body text-foreground placeholder:text-muted-foreground outline-none border-0 focus:outline-none focus:ring-0 selection:bg-primary selection:text-primary-foreground"
          />
          <button type="submit" onClick={() => { submitIntentRef.current = true; }} className="h-7 rounded-lg px-3 text-[11px] font-display text-primary hover:bg-primary/10 transition-all duration-200">
            Search
          </button>
        </div>
        {overlayVisible && (
          <AutocompleteOverlay sections={autocompleteResults.sections} activeItemId={flatItems[activeIndex]?.id} onSelect={handleSelectItem} onSwitchToTab={handleSwitchToTab} className="mt-3" />
        )}
      </form>

      <div className={cn('relative z-10 transition-all duration-300', searchFocused ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100')}>
        {/* Favorites grid */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-4 max-w-2xl mb-10 animate-fade-in-up" style={{ animationDelay: '180ms' }}>
          {favorites.map((fav, i) => (
            <button
              key={i}
              onClick={() => onNavigate(fav.url)}
              className="group flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-notilus-surface-2/40 transition-all duration-200"
            >
              <div className="w-11 h-11 rounded-full bg-notilus-surface-2/50 flex items-center justify-center transition-all duration-200 group-hover:scale-[1.08] group-hover:bg-notilus-surface-2 overflow-hidden">
                <img
                  src={`https://www.google.com/s2/favicons?domain=${new URL(fav.url).hostname}&sz=32`}
                  alt=""
                  className="w-5 h-5"
                  onError={e => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-muted-foreground"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25"><circle cx="12" cy="12" r="10"/></svg></span>';
                  }}
                />
              </div>
              <span className="text-[10px] font-body text-muted-foreground group-hover:text-foreground transition-colors truncate w-full text-center">
                {fav.name}
              </span>
            </button>
          ))}
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-2xl w-full animate-fade-in-up" style={{ animationDelay: '240ms' }}>
          {/* Recent */}
          <div className="bg-notilus-surface-1/40 rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-[10px] font-display uppercase tracking-[0.18em] text-muted-foreground/70 mb-3">
              <Clock size={11} strokeWidth={1.25} className="text-primary" /> Recent
            </div>
            {recent.map((r, i) => (
              <button key={i} onClick={() => onNavigate(r.url)} className="w-full flex items-start gap-2 py-1.5 hover:bg-notilus-surface-2/40 rounded-lg px-2 transition-all duration-200 text-left">
                <img src={`https://www.google.com/s2/favicons?domain=${new URL(r.url).hostname}&sz=16`} alt="" className="w-4 h-4 mt-0.5 rounded-sm" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-body text-foreground truncate">{r.title}</div>
                  <div className="text-[10px] font-body text-muted-foreground">{r.time}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Quote */}
          <div className="bg-notilus-surface-1/40 rounded-xl p-4 flex flex-col justify-center">
            <div className="w-6 h-[2px] notilus-gradient rounded-full mb-3" />
            <p className="text-xs font-body text-foreground/90 italic leading-relaxed">"{QUOTES[quoteIdx].text}"</p>
            <p className="text-[10px] font-body text-muted-foreground mt-2">— {QUOTES[quoteIdx].author}</p>
          </div>

          {/* Quick Actions */}
          <div className="bg-notilus-surface-1/40 rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-[10px] font-display uppercase tracking-[0.18em] text-muted-foreground/70 mb-3">
              <Zap size={11} strokeWidth={1.25} className="text-primary" /> Quick Actions
            </div>
            <div className="space-y-1">
              {[
                { icon: Plus, label: 'New Tab', action: () => onNavigate('notilus://speed-dial'), color: 'text-info' },
                { icon: Terminal, label: 'Open Terminal', action: () => {}, color: 'text-success' },
                { icon: ShieldCheck, label: 'Private Tab', action: () => {}, color: 'text-warning' },
                { icon: Wrench, label: 'DevTools (F12)', action: () => {}, color: 'text-primary' },
              ].map(a => (
                <button key={a.label} onClick={a.action} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-notilus-surface-2/40 text-xs font-body text-muted-foreground hover:text-foreground hover:bg-notilus-surface-2 transition-all duration-200">
                  <a.icon size={13} strokeWidth={1.25} className={a.color} /> {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
