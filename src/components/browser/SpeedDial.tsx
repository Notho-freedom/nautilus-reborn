import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Globe, Clock, Zap, Quote, Terminal, Plus, Wrench, ShieldCheck } from 'lucide-react';
import { getBookmarks, subscribeToBookmarksUpdates } from '@/lib/bookmarks';
import { getHistoryItems, subscribeToHistoryUpdates } from '@/lib/history';
import { getSettings, subscribeToSettingsUpdates, type BrowserSettings } from '@/lib/settings';
import { resolveInitialWallpaper } from '@/lib/defaultWallpapers';

interface SpeedDialProps {
  onNavigate: (url: string) => void;
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

export function SpeedDial({ onNavigate }: SpeedDialProps) {
  const [time, setTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [searchEngine, setSearchEngine] = useState(() => getSettings().searchEngine);
  const [homePageStyle, setHomePageStyle] = useState<BrowserSettings['homePageStyle']>(
    () => getSettings().homePageStyle
  );
  const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);
  const [wallpaperStatus, setWallpaperStatus] = useState<WallpaperStatus>('idle');
  const [favorites, setFavorites] = useState(DEFAULT_FAVORITES);
  const [recent, setRecent] = useState(DEFAULT_RECENT);
  const submitIntentRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setQuoteIdx(i => (i + 1) % QUOTES.length), 8000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const refreshFavorites = () => {
      const bookmarks = getBookmarks()
        .slice(0, 8)
        .map(bookmark => ({ name: bookmark.title, url: bookmark.url }));
      setFavorites(bookmarks.length > 0 ? bookmarks : DEFAULT_FAVORITES);
    };

    refreshFavorites();
    return subscribeToBookmarksUpdates(refreshFavorites);
  }, []);

  useEffect(() => {
    const refreshRecent = () => {
      const recentHistory = getHistoryItems()
        .slice(0, 3)
        .map(item => ({
          title: item.title,
          url: item.url,
          time: formatRecentTime(item.visitedAt),
        }));
      setRecent(recentHistory.length > 0 ? recentHistory : DEFAULT_RECENT);
    };

    refreshRecent();
    return subscribeToHistoryUpdates(refreshRecent);
  }, []);

  useEffect(() => {
    const refreshSettings = () => {
      const settings = getSettings();
      setSearchEngine(settings.searchEngine);
      setHomePageStyle(settings.homePageStyle);
    };

    refreshSettings();
    return subscribeToSettingsUpdates(refreshSettings);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (homePageStyle !== 'modern') {
      setWallpaperUrl(null);
      setWallpaperStatus('idle');
      return;
    }

    const storedUrl = window.localStorage.getItem(SPEED_DIAL_WALLPAPER_KEY);
    const resolved = resolveInitialWallpaper(storedUrl);

    if (storedUrl !== resolved) {
      window.localStorage.setItem(SPEED_DIAL_WALLPAPER_KEY, resolved);
    }

    setWallpaperUrl(resolved);
    setWallpaperStatus('loading');
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
    if (searchQuery.trim()) {
      const encoded = encodeURIComponent(searchQuery);
      const target =
        searchEngine === 'google'
          ? `https://www.google.com/search?q=${encoded}`
          : searchEngine === 'brave'
            ? `https://search.brave.com/search?q=${encoded}`
            : `https://duckduckgo.com/?q=${encoded}`;
      onNavigate(target);
    }
  };

  const greeting = () => {
    const h = time.getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const showModernWallpaper =
    homePageStyle === 'modern' &&
    wallpaperUrl !== null &&
    wallpaperStatus !== 'error';

  return (
    <div className="flex-1 flex flex-col items-center justify-start p-8 overflow-y-auto no-scrollbar relative">
      {showModernWallpaper && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img
            data-testid="speed-dial-wallpaper-image"
            src={wallpaperUrl}
            alt=""
            className={`h-full w-full object-cover transition-opacity duration-500 ${
              wallpaperStatus === 'loaded' ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setWallpaperStatus('loaded')}
            onError={() => setWallpaperStatus('error')}
          />
        </div>
      )}

      {showModernWallpaper && (
        <div
          data-testid="speed-dial-wallpaper-scrim"
          className="absolute inset-0 z-[1] bg-black/30 pointer-events-none"
        />
      )}

      {/* Subtle gradient overlay */}
      <div
        data-testid="speed-dial-gradient-overlay"
        className="absolute inset-0 z-[2] gradient-overlay pointer-events-none"
      />

      {/* Logo */}
      <div className="mb-6 mt-6 flex flex-col items-center animate-fade-in-up relative z-10">
        <img
          src="/logo_n_no_bg.png"
          alt="Notilus"
          className="w-36 h-36 object-contain mb-2 animate-glow-breathe drop-shadow-[0_0_16px_hsl(var(--primary)/0.35)]"
        />
        <p className="text-sm font-body text-muted-foreground mt-1">{greeting()}, Developer</p>
      </div>

      {/* Clock */}
      <div className="mb-8 text-center relative z-10 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <div className="text-6xl font-display font-extralight text-foreground tracking-[0.2em]">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="text-sm font-body text-muted-foreground mt-2 tracking-wide">
          {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="w-full max-w-lg mb-10 relative z-10 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <div
          className={`flex items-center h-12 rounded-xl border px-4 gap-3 transition-colors duration-fast ${
            showModernWallpaper
              ? (searchFocused
                ? 'bg-notilus-surface-1 border-primary/50'
                : 'bg-notilus-surface-1/90 border-border/50 hover:bg-notilus-surface-1')
              : (searchFocused
                ? 'bg-notilus-surface-1 border-primary/50'
                : 'bg-transparent border-transparent hover:bg-primary/10')
          }`}
        >
          <Search size={18} className="text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => {
              submitIntentRef.current = false;
              setSearchFocused(false);
            }}
            onKeyDown={event => {
              if (event.key === 'Enter' && !(event.nativeEvent as KeyboardEvent).isComposing) {
                submitIntentRef.current = true;
                return;
              }
              submitIntentRef.current = false;
            }}
            placeholder={searchPlaceholder}
            className="flex-1 bg-transparent text-base font-body text-foreground placeholder:text-muted-foreground outline-none selection:bg-primary selection:text-primary-foreground"
          />
          <button
            type="submit"
            onClick={() => {
              submitIntentRef.current = true;
            }}
            className="h-7 rounded-md px-2 text-[11px] text-primary transition-colors hover:bg-primary/10"
          >
            Search
          </button>
        </div>
      </form>

      {/* Favorites grid */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 max-w-2xl mb-10 relative z-10 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
        {favorites.map((fav, i) => (
          <button
            key={i}
            onClick={() => onNavigate(fav.url)}
            className="group flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-muted/50 transition-all duration-fast"
          >
            <div className="w-12 h-12 rounded-xl bg-notilus-surface-2 flex items-center justify-center transition-transform duration-fast group-hover:scale-105 group-hover:bg-notilus-surface-3 overflow-hidden border border-border">
              <img
                src={`https://www.google.com/s2/favicons?domain=${new URL(fav.url).hostname}&sz=32`}
                alt=""
                className="w-6 h-6"
                onError={e => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-muted-foreground"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg></span>';
                }}
              />
            </div>
            <span className="text-[11px] font-body text-muted-foreground group-hover:text-foreground transition-colors truncate w-full text-center">
              {fav.name}
            </span>
          </button>
        ))}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl w-full relative z-10 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
        {/* Recent */}
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-display text-muted-foreground uppercase tracking-wider mb-3">
            <Clock size={12} /> Recent
          </div>
          {recent.map((r, i) => (
            <button key={i} onClick={() => onNavigate(r.url)} className="w-full flex items-start gap-2 py-1.5 hover:bg-muted/30 rounded px-1 transition-colors duration-fast text-left">
              <img src={`https://www.google.com/s2/favicons?domain=${new URL(r.url).hostname}&sz=16`} alt="" className="w-4 h-4 mt-0.5 rounded-sm" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-body text-foreground truncate">{r.title}</div>
                <div className="text-[10px] font-body text-muted-foreground">{r.time}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Quote */}
        <div className="glass rounded-xl p-4 flex flex-col justify-center">
          <Quote size={16} className="text-primary mb-2" />
          <p className="text-xs font-body text-foreground italic leading-relaxed">"{QUOTES[quoteIdx].text}"</p>
          <p className="text-[10px] font-body text-muted-foreground mt-2">— {QUOTES[quoteIdx].author}</p>
        </div>

        {/* Quick Actions */}
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-display text-muted-foreground uppercase tracking-wider mb-3">
            <Zap size={12} /> Quick Actions
          </div>
          <div className="space-y-1.5">
            {[
              { icon: Plus, label: 'New Tab', action: () => onNavigate('notilus://speed-dial') },
              { icon: Terminal, label: 'Open Terminal', action: () => {} },
              { icon: ShieldCheck, label: 'Private Tab', action: () => {} },
              { icon: Wrench, label: 'DevTools (F12)', action: () => {} },
            ].map(a => (
              <button key={a.label} onClick={a.action} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-notilus-surface-2 text-xs font-body text-muted-foreground hover:text-foreground hover:bg-notilus-surface-3 transition-colors duration-fast border border-transparent hover:border-border">
                <a.icon size={13} /> {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
