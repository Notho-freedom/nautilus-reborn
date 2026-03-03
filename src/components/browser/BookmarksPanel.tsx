import { useState } from 'react';
import { Search, Star, Globe, Plus, Folder, Tag } from 'lucide-react';

const MOCK_BOOKMARKS = [
  { id: '1', title: 'GitHub', url: 'https://github.com', tags: ['dev', 'git'], folder: 'Dev' },
  { id: '2', title: 'Stack Overflow', url: 'https://stackoverflow.com', tags: ['dev', 'qa'], folder: 'Dev' },
  { id: '3', title: 'MDN Web Docs', url: 'https://developer.mozilla.org', tags: ['docs'], folder: 'Docs' },
  { id: '4', title: 'TypeScript', url: 'https://typescriptlang.org', tags: ['lang'], folder: 'Docs' },
  { id: '5', title: 'Tailwind CSS', url: 'https://tailwindcss.com', tags: ['css'], folder: 'Docs' },
  { id: '6', title: 'React', url: 'https://react.dev', tags: ['framework'], folder: 'Dev' },
  { id: '7', title: 'Vite', url: 'https://vitejs.dev', tags: ['tooling'], folder: 'Dev' },
  { id: '8', title: 'Supabase', url: 'https://supabase.com', tags: ['backend'], folder: 'Services' },
];

export function BookmarksPanel() {
  const [search, setSearch] = useState('');
  const [activeFolder, setActiveFolder] = useState<string | null>(null);

  const folders = [...new Set(MOCK_BOOKMARKS.map(b => b.folder))];
  const filtered = MOCK_BOOKMARKS.filter(b => {
    const matchSearch = !search || b.title.toLowerCase().includes(search.toLowerCase()) || b.url.includes(search);
    const matchFolder = !activeFolder || b.folder === activeFolder;
    return matchSearch && matchFolder;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-display font-semibold text-primary uppercase tracking-widest flex items-center gap-1.5">
            <Star size={12} /> Favorites
          </h3>
          <button className="w-7 h-7 flex items-center justify-center rounded-md bg-primary/15 text-primary hover:bg-primary/25 transition-colors duration-fast">
            <Plus size={12} />
          </button>
        </div>
        <div className="flex items-center h-8 rounded-lg bg-notilus-surface-1 border border-border px-2 gap-1.5">
          <Search size={12} className="text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search bookmarks..."
            className="flex-1 bg-transparent text-xs font-body text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </div>

      <div className="flex gap-1 p-2 border-b border-border overflow-x-auto scrollbar-thin">
        <button
          onClick={() => setActiveFolder(null)}
          className={`px-2 py-1 rounded-md text-[10px] font-display shrink-0 transition-colors duration-fast ${!activeFolder ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          All
        </button>
        {folders.map(f => (
          <button
            key={f}
            onClick={() => setActiveFolder(activeFolder === f ? null : f)}
            className={`px-2 py-1 rounded-md text-[10px] font-display shrink-0 transition-colors duration-fast flex items-center gap-1 ${activeFolder === f ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Folder size={9} /> {f}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filtered.map(b => (
          <div key={b.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors duration-fast cursor-pointer group">
            <img
              src={`https://www.google.com/s2/favicons?domain=${new URL(b.url).hostname}&sz=16`}
              alt=""
              className="w-4 h-4 rounded-sm"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-body text-foreground truncate">{b.title}</div>
              <div className="text-[10px] font-body text-muted-foreground truncate">{b.url}</div>
            </div>
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {b.tags.slice(0, 2).map(t => (
                <span key={t} className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-notilus-surface-2 text-[8px] font-body text-muted-foreground">
                  <Tag size={7} /> {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="p-2 border-t border-border">
        <div className="text-[10px] font-body text-muted-foreground text-center">
          {filtered.length} bookmarks • Ctrl+D to add
        </div>
      </div>
    </div>
  );
}
