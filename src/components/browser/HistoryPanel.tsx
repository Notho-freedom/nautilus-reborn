import { useState } from 'react';
import { Search, Clock, Trash2, Globe } from 'lucide-react';

const MOCK_HISTORY = [
  { id: '1', title: 'GitHub - Dashboard', url: 'https://github.com', time: '2 min ago', date: 'Today' },
  { id: '2', title: 'Stack Overflow - React hooks', url: 'https://stackoverflow.com/questions/react-hooks', time: '15 min ago', date: 'Today' },
  { id: '3', title: 'MDN - Fetch API', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API', time: '1h ago', date: 'Today' },
  { id: '4', title: 'TypeScript Handbook', url: 'https://typescriptlang.org/docs/handbook', time: '3h ago', date: 'Today' },
  { id: '5', title: 'Tailwind CSS - Docs', url: 'https://tailwindcss.com/docs', time: '5h ago', date: 'Today' },
  { id: '6', title: 'React - Quick Start', url: 'https://react.dev/learn', time: 'Yesterday', date: 'Yesterday' },
  { id: '7', title: 'npm - package search', url: 'https://npmjs.com', time: 'Yesterday', date: 'Yesterday' },
  { id: '8', title: 'Vite - Getting Started', url: 'https://vitejs.dev/guide/', time: '2 days ago', date: '2 days ago' },
];

export function HistoryPanel() {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState(MOCK_HISTORY);

  const filtered = items.filter(h =>
    !search || h.title.toLowerCase().includes(search.toLowerCase()) || h.url.includes(search)
  );

  const grouped = filtered.reduce((acc, h) => {
    (acc[h.date] = acc[h.date] || []).push(h);
    return acc;
  }, {} as Record<string, typeof MOCK_HISTORY>);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-mono font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={12} /> History
          </h3>
          <button
            onClick={() => setItems([])}
            className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Clear history"
          >
            <Trash2 size={12} />
          </button>
        </div>
        <div className="flex items-center h-7 rounded-md bg-secondary/60 px-2 gap-1.5">
          <Search size={11} className="text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search history..."
            className="flex-1 bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {Object.entries(grouped).map(([date, entries]) => (
          <div key={date}>
            <div className="px-3 py-1.5 bg-secondary/30 text-[10px] font-mono text-muted-foreground uppercase tracking-wider sticky top-0">
              {date}
            </div>
            {entries.map(h => (
              <div key={h.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors cursor-pointer">
                <img
                  src={`https://www.google.com/s2/favicons?domain=${new URL(h.url).hostname}&sz=16`}
                  alt=""
                  className="w-3.5 h-3.5 rounded-sm"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-foreground truncate">{h.title}</div>
                  <div className="text-[9px] text-muted-foreground truncate">{h.url}</div>
                </div>
                <span className="text-[9px] text-muted-foreground shrink-0">{h.time}</span>
              </div>
            ))}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="p-6 text-center text-xs text-muted-foreground">
            {items.length === 0 ? 'History cleared' : 'No results found'}
          </div>
        )}
      </div>

      <div className="p-2 border-t border-border">
        <div className="text-[9px] text-muted-foreground text-center">
          {filtered.length} entries • Ctrl+H
        </div>
      </div>
    </div>
  );
}
