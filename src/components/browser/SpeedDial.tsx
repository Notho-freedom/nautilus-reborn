import { useState, useEffect } from 'react';
import { Search, Globe } from 'lucide-react';

interface SpeedDialProps {
  onNavigate: (url: string) => void;
}

const FAVORITES = [
  { name: 'GitHub', url: 'https://github.com', color: '0 0% 20%' },
  { name: 'Stack Overflow', url: 'https://stackoverflow.com', color: '27 95% 55%' },
  { name: 'MDN Docs', url: 'https://developer.mozilla.org', color: '210 80% 50%' },
  { name: 'npm', url: 'https://npmjs.com', color: '0 70% 50%' },
  { name: 'Dev.to', url: 'https://dev.to', color: '240 5% 15%' },
  { name: 'CodePen', url: 'https://codepen.io', color: '0 0% 25%' },
  { name: 'Hacker News', url: 'https://news.ycombinator.com', color: '25 95% 55%' },
  { name: 'Reddit', url: 'https://reddit.com', color: '16 100% 50%' },
];

export function SpeedDial({ onNavigate }: SpeedDialProps) {
  const [time, setTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate(`https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto scrollbar-thin">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl notilus-gradient flex items-center justify-center mb-4 glow-primary">
          <span className="text-2xl font-mono font-bold text-primary-foreground">N</span>
        </div>
        <h1 className="text-xl font-mono font-bold text-foreground glow-text">Notilus</h1>
        <p className="text-xs text-muted-foreground mt-1">Developer Browser</p>
      </div>

      {/* Clock */}
      <div className="mb-8 text-center">
        <div className="text-4xl font-mono font-light text-foreground tracking-wider">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="text-xs text-muted-foreground mt-1 font-mono">
          {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="w-full max-w-md mb-10">
        <div className="flex items-center h-10 rounded-xl glass px-3 gap-2 focus-within:ring-1 focus-within:ring-primary/30 transition-all">
          <Search size={16} className="text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search with DuckDuckGo..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </form>

      {/* Favorites grid */}
      <div className="grid grid-cols-4 gap-4 max-w-lg">
        {FAVORITES.map((fav, i) => (
          <button
            key={i}
            onClick={() => onNavigate(fav.url)}
            className="group flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted/50 transition-all"
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ background: `hsl(${fav.color})` }}
            >
              <Globe size={20} className="text-primary-foreground" />
            </div>
            <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors truncate w-full text-center">
              {fav.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
