import { useState } from 'react';
import { RefreshCw, Check, Search, Clock, Sparkles, Bug, Zap } from 'lucide-react';

interface Update {
  id: string;
  title: string;
  description: string;
  category: 'feature' | 'fix' | 'improvement';
  date: string;
}

const MOCK_UPDATES: Update[] = [
  { id: '1', title: 'AI Assistant Multi-Model Support', description: 'Switch between Llama, Mixtral and Gemma models', category: 'feature', date: '2026-03-03' },
  { id: '2', title: 'DevTools Performance Tab', description: 'Real-time FCP/LCP/TTI metrics visualization', category: 'feature', date: '2026-03-02' },
  { id: '3', title: 'Tab Context Menu Fix', description: 'Fixed duplicate tab action not preserving URL', category: 'fix', date: '2026-03-01' },
  { id: '4', title: 'Sidebar Animation Smoothing', description: 'Improved panel transition animations', category: 'improvement', date: '2026-02-28' },
  { id: '5', title: 'Lighthouse AI Advisor', description: 'Get AI-powered performance recommendations', category: 'feature', date: '2026-02-27' },
];

const CATEGORY_ICONS = { feature: Sparkles, fix: Bug, improvement: Zap };
const CATEGORY_COLORS = { feature: 'text-info', fix: 'text-error', improvement: 'text-warning' };

export function UpdatesPanel() {
  const [search, setSearch] = useState('');
  const [checking, setChecking] = useState(false);

  const filtered = MOCK_UPDATES.filter(u =>
    u.title.toLowerCase().includes(search.toLowerCase()) ||
    u.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleCheck = () => {
    setChecking(true);
    setTimeout(() => setChecking(false), 2000);
  };

  return (
    <div className="p-3 space-y-3 overflow-y-auto scrollbar-thin flex-1">
      <h3 className="text-xs font-display font-semibold text-primary uppercase tracking-widest">Updates</h3>

      <div className="flex items-center gap-2 h-8 rounded-lg bg-notilus-surface-1 border border-border px-2">
        <Search size={12} className="text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search updates..." className="flex-1 bg-transparent text-xs font-body text-foreground placeholder:text-muted-foreground outline-none" />
      </div>

      <button
        onClick={handleCheck}
        disabled={checking}
        className="w-full flex items-center justify-center gap-2 h-8 rounded-lg bg-primary/10 text-primary text-xs font-display tracking-wider hover:bg-primary/20 transition-colors duration-fast disabled:opacity-50"
      >
        {checking ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
        {checking ? 'Checking...' : 'Check for Updates'}
      </button>

      {!checking && filtered.length === 0 && (
        <div className="flex flex-col items-center py-6 text-center">
          <Check size={24} className="text-success mb-2" />
          <p className="text-xs font-body text-muted-foreground">You're up to date!</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(u => {
          const Icon = CATEGORY_ICONS[u.category];
          return (
            <div key={u.id} className="p-2.5 rounded-lg bg-notilus-surface-1 border border-border space-y-1">
              <div className="flex items-center gap-2">
                <Icon size={12} className={CATEGORY_COLORS[u.category]} />
                <span className="text-xs font-body text-foreground flex-1">{u.title}</span>
              </div>
              <p className="text-[10px] font-body text-muted-foreground">{u.description}</p>
              <div className="flex items-center gap-1 text-[9px] font-body text-muted-foreground">
                <Clock size={9} /> {u.date}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
