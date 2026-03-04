import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  ExternalLink,
  GitFork,
  Github,
  Globe,
  Loader2,
  Lock,
  RefreshCw,
  Star,
} from 'lucide-react';
import {
  fetchGitHubRepos,
  formatRelativeDate,
  getGitHubConnectionConfig,
  updateGitHubConnectionConfig,
  type GitHubRepo,
  type GitHubSortBy,
} from '@/lib/githubRepos';
import { SidebarPanelShell } from './SidebarPanelShell';

interface GitHubReposPanelProps {
  onNavigate?: (url: string) => void;
  onClose?: () => void;
}

export function GitHubReposPanel({ onNavigate, onClose }: GitHubReposPanelProps) {
  const [search, setSearch] = useState('');
  const [showPrivate, setShowPrivate] = useState(true);
  const [sortBy, setSortBy] = useState<GitHubSortBy>('updated');
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState(() => getGitHubConnectionConfig());

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const next = repos.filter(repo => {
      const privateAllowed = showPrivate || !repo.isPrivate;
      const searchAllowed = !query || repo.name.toLowerCase().includes(query) || repo.fullName.toLowerCase().includes(query) || repo.description.toLowerCase().includes(query);
      return privateAllowed && searchAllowed;
    });
    if (sortBy === 'stars') next.sort((a, b) => b.stars - a.stars);
    else if (sortBy === 'name') next.sort((a, b) => a.name.localeCompare(b.name));
    else next.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return next;
  }, [repos, search, showPrivate, sortBy]);

  const handleLoadRepos = async () => {
    setIsLoading(true); setError(null);
    try { const loaded = await fetchGitHubRepos({ token: connection.token, username: connection.username, includePrivate: showPrivate, sortBy }); setRepos(loaded); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load repositories.'); }
    finally { setIsLoading(false); }
  };

  const handleSaveConnection = (event: React.FormEvent) => {
    event.preventDefault();
    const next = updateGitHubConnectionConfig(connection);
    setConnection(next);
    void handleLoadRepos();
  };

  useEffect(() => {
    if (!connection.token && !connection.username) return;
    void handleLoadRepos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SidebarPanelShell
      title="GitHub"
      icon={Github}
      searchable
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search repos..."
      onClose={onClose ?? (() => {})}
      menuItems={[
        { label: 'Refresh repos', onClick: () => void handleLoadRepos() },
      ]}
    >
      <div className="p-3 space-y-3">
        <form onSubmit={handleSaveConnection} className="space-y-1.5">
          <input value={connection.username} onChange={event => setConnection(current => ({ ...current, username: event.target.value }))} placeholder="GitHub username (public repos)" className="w-full h-8 rounded-lg bg-notilus-surface-1 border border-border px-2 text-xs font-body text-foreground placeholder:text-muted-foreground outline-none" />
          <div className="grid grid-cols-[1fr_auto] gap-1.5">
            <input value={connection.token} onChange={event => setConnection(current => ({ ...current, token: event.target.value }))} placeholder="Personal access token" className="h-8 rounded-lg bg-notilus-surface-1 border border-border px-2 text-xs font-body text-foreground placeholder:text-muted-foreground outline-none" />
            <button type="submit" className="h-8 px-2 rounded-md notilus-gradient text-[10px] font-body text-primary-foreground">Connect</button>
          </div>
        </form>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowPrivate(c => !c)} className={`flex items-center gap-1 px-2 h-6 rounded-md text-[10px] font-body transition-colors duration-fast ${showPrivate ? 'bg-primary/15 text-primary' : 'bg-notilus-surface-1 text-muted-foreground'}`} title="Show private repos requires token"><Lock size={9} /> Private</button>
          <button onClick={() => setSortBy(c => (c === 'updated' ? 'stars' : c === 'stars' ? 'name' : 'updated'))} className="flex items-center gap-1 px-2 h-6 rounded-md bg-notilus-surface-1 text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors duration-fast"><ArrowUpDown size={9} /> {sortBy}</button>
        </div>

        {error && <div className="text-[10px] font-body text-error bg-error/10 border border-error/30 rounded-md p-2">{error}</div>}

        <div className="space-y-2">
          {filtered.map(repo => (
            <button key={repo.id} onClick={() => (onNavigate ? onNavigate(repo.htmlUrl) : window.open(repo.htmlUrl, '_blank'))} className="w-full text-left p-2.5 rounded-lg bg-notilus-surface-1 border border-border space-y-1.5 hover:bg-notilus-surface-2 transition-colors duration-fast">
              <div className="flex items-center gap-1.5">
                {repo.isPrivate ? <Lock size={10} className="text-warning" /> : <Globe size={10} className="text-muted-foreground" />}
                <span className="text-xs font-body text-info font-semibold">{repo.fullName}</span>
                <ExternalLink size={10} className="text-muted-foreground ml-auto" />
              </div>
              <p className="text-[10px] font-body text-muted-foreground line-clamp-2">{repo.description || 'No description'}</p>
              <div className="flex items-center gap-3 text-[9px] font-body text-muted-foreground">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: repo.languageColor }} />{repo.language}</span>
                <span className="flex items-center gap-0.5"><Star size={8} /> {repo.stars}</span>
                <span className="flex items-center gap-0.5"><GitFork size={8} /> {repo.forks}</span>
                <span>{formatRelativeDate(repo.updatedAt)}</span>
              </div>
            </button>
          ))}
        </div>

        {!isLoading && filtered.length === 0 && (
          <div className="p-4 text-center text-xs font-body text-muted-foreground">{repos.length === 0 ? 'Connect GitHub to load repositories.' : 'No repositories found.'}</div>
        )}
      </div>
    </SidebarPanelShell>
  );
}
