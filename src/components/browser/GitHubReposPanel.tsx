import { useState } from 'react';
import { Search, Star, GitFork, Lock, Globe, ArrowUpDown } from 'lucide-react';

interface Repo {
  name: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  languageColor: string;
  isPrivate: boolean;
  updatedAt: string;
}

const MOCK_REPOS: Repo[] = [
  { name: 'notilus-browser', description: 'Next-gen developer browser', stars: 1247, forks: 89, language: 'TypeScript', languageColor: '#3178c6', isPrivate: false, updatedAt: '2h ago' },
  { name: 'notilus-engine', description: 'Core rendering engine', stars: 456, forks: 32, language: 'Rust', languageColor: '#dea584', isPrivate: true, updatedAt: '1d ago' },
  { name: 'notilus-extensions', description: 'Official extension marketplace', stars: 234, forks: 45, language: 'TypeScript', languageColor: '#3178c6', isPrivate: false, updatedAt: '3d ago' },
  { name: 'notilus-ai', description: 'AI integration layer', stars: 789, forks: 67, language: 'Python', languageColor: '#3572A5', isPrivate: true, updatedAt: '5d ago' },
  { name: 'notilus-docs', description: 'Documentation website', stars: 123, forks: 18, language: 'MDX', languageColor: '#fcb32c', isPrivate: false, updatedAt: '1w ago' },
];

export function GitHubReposPanel() {
  const [search, setSearch] = useState('');
  const [showPrivate, setShowPrivate] = useState(true);
  const [sortBy, setSortBy] = useState<'updated' | 'stars' | 'name'>('updated');

  const filtered = MOCK_REPOS
    .filter(r => (showPrivate || !r.isPrivate) && (r.name.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => {
      if (sortBy === 'stars') return b.stars - a.stars;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

  return (
    <div className="p-3 space-y-3 overflow-y-auto scrollbar-thin flex-1">
      <h3 className="text-xs font-display font-semibold text-primary uppercase tracking-widest">GitHub</h3>

      <div className="flex items-center gap-2 h-8 rounded-lg bg-notilus-surface-1 border border-border px-2">
        <Search size={12} className="text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search repos..." className="flex-1 bg-transparent text-xs font-body text-foreground placeholder:text-muted-foreground outline-none" />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowPrivate(!showPrivate)}
          className={`flex items-center gap-1 px-2 h-6 rounded-md text-[10px] font-body transition-colors duration-fast ${showPrivate ? 'bg-primary/15 text-primary' : 'bg-notilus-surface-1 text-muted-foreground'}`}
        >
          <Lock size={9} /> Private
        </button>
        <button
          onClick={() => setSortBy(s => s === 'updated' ? 'stars' : s === 'stars' ? 'name' : 'updated')}
          className="flex items-center gap-1 px-2 h-6 rounded-md bg-notilus-surface-1 text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors duration-fast"
        >
          <ArrowUpDown size={9} /> {sortBy}
        </button>
      </div>

      <div className="space-y-2">
        {filtered.map(r => (
          <div key={r.name} className="p-2.5 rounded-lg bg-notilus-surface-1 border border-border space-y-1.5 hover:bg-notilus-surface-2 transition-colors duration-fast cursor-pointer">
            <div className="flex items-center gap-1.5">
              {r.isPrivate ? <Lock size={10} className="text-warning" /> : <Globe size={10} className="text-muted-foreground" />}
              <span className="text-xs font-body text-info font-semibold">{r.name}</span>
            </div>
            <p className="text-[10px] font-body text-muted-foreground">{r.description}</p>
            <div className="flex items-center gap-3 text-[9px] font-body text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.languageColor }} />
                {r.language}
              </span>
              <span className="flex items-center gap-0.5"><Star size={8} /> {r.stars}</span>
              <span className="flex items-center gap-0.5"><GitFork size={8} /> {r.forks}</span>
              <span>{r.updatedAt}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
