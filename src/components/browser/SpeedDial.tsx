import { useState, useEffect } from 'react';
import { Search, Globe, Clock, Zap, Quote, Terminal, Plus } from 'lucide-react';

interface SpeedDialProps {
  onNavigate: (url: string) => void;
}

const FAVORITES = [
  { name: 'GitHub', url: 'https://github.com' },
  { name: 'Stack Overflow', url: 'https://stackoverflow.com' },
  { name: 'MDN Docs', url: 'https://developer.mozilla.org' },
  { name: 'npm', url: 'https://npmjs.com' },
  { name: 'Dev.to', url: 'https://dev.to' },
  { name: 'CodePen', url: 'https://codepen.io' },
  { name: 'Hacker News', url: 'https://news.ycombinator.com' },
  { name: 'Reddit', url: 'https://reddit.com' },
];

const RECENT = [
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

export function SpeedDial({ onNavigate }: SpeedDialProps) {
  const [time, setTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [quoteIdx, setQuoteIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setQuoteIdx(i => (i + 1) % QUOTES.length), 8000);
    return () => clearInterval(iv);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate(`https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const greeting = () => {
    const h = time.getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-start p-8 overflow-y-auto scrollbar-thin">
      {/* Logo */}
      <div className="mb-6 mt-8 flex flex-col items-center">
        <div className="w-20 h-20 rounded-2xl notilus-gradient flex items-center justify-center mb-4 glow-primary animate-pulse" style={{ animationDuration: '3s' }}>
          <span className="text-3xl font-mono font-bold text-primary-foreground">N</span>
        </div>
        <h1 className="text-2xl font-mono font-bold text-foreground glow-text">Notilus</h1>
        <p className="text-xs text-muted-foreground mt-1">{greeting()}, Developer</p>
      </div>

      {/* Clock */}
      <div className="mb-8 text-center">
        <div className="text-5xl font-mono font-extralight text-foreground tracking-widest">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="text-xs text-muted-foreground mt-1.5 font-mono">
          {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="w-full max-w-lg mb-10">
        <div className="flex items-center h-11 rounded-xl glass px-4 gap-2.5 focus-within:ring-1 focus-within:ring-primary/30 focus-within:glow-primary transition-all">
          <Search size={16} className="text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search with DuckDuckGo or enter URL..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </form>

      {/* Favorites grid */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 max-w-2xl mb-10">
        {FAVORITES.map((fav, i) => (
          <button
            key={i}
            onClick={() => onNavigate(fav.url)}
            className="group flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-muted/50 transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-secondary/80 flex items-center justify-center transition-transform group-hover:scale-110 group-hover:bg-secondary overflow-hidden">
              <img
                src={`https://www.google.com/s2/favicons?domain=${new URL(fav.url).hostname}&sz=32`}
                alt=""
                className="w-6 h-6"
                onError={e => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-muted-foreground"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></span>';
                }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors truncate w-full text-center">
              {fav.name}
            </span>
          </button>
        ))}
      </div>

      {/* Bottom row: Recent + Quote + Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl w-full">
        {/* Recent */}
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-3">
            <Clock size={11} /> Recent
          </div>
          {RECENT.map((r, i) => (
            <button key={i} onClick={() => onNavigate(r.url)} className="w-full flex items-start gap-2 py-1.5 hover:bg-muted/30 rounded px-1 transition-colors text-left">
              <img src={`https://www.google.com/s2/favicons?domain=${new URL(r.url).hostname}&sz=16`} alt="" className="w-3.5 h-3.5 mt-0.5 rounded-sm" />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-foreground truncate">{r.title}</div>
                <div className="text-[9px] text-muted-foreground">{r.time}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Quote */}
        <div className="glass rounded-xl p-4 flex flex-col justify-center">
          <Quote size={14} className="text-primary mb-2" />
          <p className="text-[11px] text-foreground italic leading-relaxed">"{QUOTES[quoteIdx].text}"</p>
          <p className="text-[9px] text-muted-foreground mt-2">— {QUOTES[quoteIdx].author}</p>
        </div>

        {/* Quick Actions */}
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-3">
            <Zap size={11} /> Quick Actions
          </div>
          <div className="space-y-1.5">
            {[
              { icon: Plus, label: 'New Tab', action: () => onNavigate('notilus://speed-dial') },
              { icon: Terminal, label: 'Open Terminal', action: () => {} },
              { icon: Globe, label: 'Private Tab', action: () => {} },
            ].map(a => (
              <button key={a.label} onClick={a.action} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-secondary/50 text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                <a.icon size={12} /> {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
