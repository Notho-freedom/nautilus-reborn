import { type KeyboardEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  ChevronDown,
  ExternalLink,
  GitFork,
  Github,
  Globe,
  Loader2,
  Lock,
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface GitHubReposPanelProps {
  onNavigate?: (url: string) => void;
  onClose?: () => void;
  isAuthenticated?: boolean;
  githubToken?: string;
  githubUsername?: string;
  onSignIn?: () => void;
  onSaveGitHubCredentials?: (token: string, username: string) => void;
}

export function GitHubReposPanel({
  onNavigate,
  onClose,
  isAuthenticated = false,
  githubToken = '',
  githubUsername = '',
  onSignIn,
  onSaveGitHubCredentials,
}: GitHubReposPanelProps) {
  const [search, setSearch] = useState('');
  const [showPrivate, setShowPrivate] = useState(true);
  const [sortBy, setSortBy] = useState<GitHubSortBy>('updated');
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localConnection, setLocalConnection] = useState(() => getGitHubConnectionConfig());
  const [patOpen, setPatOpen] = useState(false);

  // Resolve effective token/username: profile first, then localStorage fallback
  const effectiveToken = githubToken || localConnection.token;
  const effectiveUsername = githubUsername || localConnection.username;
  const hasGitHubConnection = Boolean(effectiveToken || effectiveUsername);

  const handleSearchInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    event.stopPropagation();
  };

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
    try {
      const loaded = await fetchGitHubRepos({ token: effectiveToken, username: effectiveUsername, includePrivate: showPrivate, sortBy });
      setRepos(loaded);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load repositories.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePAT = (event: React.FormEvent) => {
    event.preventDefault();
    const next = updateGitHubConnectionConfig(localConnection);
    setLocalConnection(next);
    if (onSaveGitHubCredentials) {
      onSaveGitHubCredentials(next.token, next.username);
    }
    void handleLoadRepos();
  };

  useEffect(() => {
    if (!effectiveToken && !effectiveUsername) return;
    void handleLoadRepos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Not authenticated: show Google sign-in + collapsed PAT ──
  if (!isAuthenticated && !hasGitHubConnection) {
    return (
      <SidebarPanelShell title="GitHub" icon={Github} onClose={onClose ?? (() => {})}>
        <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
          <Github size={56} className="text-muted-foreground/40" />
          <div className="text-center space-y-1.5">
            <h3 className="text-sm font-display text-foreground">Connect GitHub</h3>
            <p className="text-[11px] font-body text-muted-foreground leading-relaxed">
              Sign in to sync your preferences, then connect your GitHub repos.
            </p>
          </div>

          {/* Primary: Google sign-in */}
          <button
            type="button"
            onClick={onSignIn}
            className="w-full h-10 rounded-lg notilus-gradient text-xs font-display text-primary-foreground tracking-wider flex items-center justify-center gap-2"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Sign in with Google
          </button>

          {/* Advanced: PAT collapsed */}
          <Collapsible open={patOpen} onOpenChange={setPatOpen} className="w-full">
            <CollapsibleTrigger className="flex items-center justify-center gap-1 w-full text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors py-1">
              <ChevronDown size={10} className={`transition-transform ${patOpen ? 'rotate-180' : ''}`} />
              Advanced: Personal Access Token
            </CollapsibleTrigger>
            <CollapsibleContent>
              <form onSubmit={handleSavePAT} className="space-y-2 pt-2">
                <input
                  value={localConnection.username}
                  onChange={e => setLocalConnection(c => ({ ...c, username: e.target.value }))}
                  placeholder="GitHub username"
                  className="w-full h-9 rounded-lg bg-notilus-surface-1 border border-border px-3 text-xs font-body text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
                />
                <input
                  value={localConnection.token}
                  onChange={e => setLocalConnection(c => ({ ...c, token: e.target.value }))}
                  placeholder="Personal access token"
                  type="password"
                  className="w-full h-9 rounded-lg bg-notilus-surface-1 border border-border px-3 text-xs font-body text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
                />
                <button type="submit" className="w-full h-8 rounded-lg bg-notilus-surface-1 border border-border text-[11px] font-body text-muted-foreground hover:text-foreground hover:bg-notilus-surface-2 transition-colors">
                  Connect with PAT
                </button>
              </form>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </SidebarPanelShell>
    );
  }

  // ── Authenticated but no GitHub token: prompt for PAT ──
  if (isAuthenticated && !hasGitHubConnection) {
    return (
      <SidebarPanelShell title="GitHub" icon={Github} onClose={onClose ?? (() => {})}>
        <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
          <Github size={56} className="text-muted-foreground/40" />
          <div className="text-center space-y-1.5">
            <h3 className="text-sm font-display text-foreground">Connect your GitHub</h3>
            <p className="text-[11px] font-body text-muted-foreground leading-relaxed">
              Add a Personal Access Token to browse your repositories. Create one at{' '}
              <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">github.com/settings/tokens</a>.
            </p>
          </div>
          <form onSubmit={handleSavePAT} className="w-full space-y-2">
            <input
              value={localConnection.username}
              onChange={e => setLocalConnection(c => ({ ...c, username: e.target.value }))}
              placeholder="GitHub username"
              className="w-full h-9 rounded-lg bg-notilus-surface-1 border border-border px-3 text-xs font-body text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
            />
            <input
              value={localConnection.token}
              onChange={e => setLocalConnection(c => ({ ...c, token: e.target.value }))}
              placeholder="Personal access token"
              type="password"
              className="w-full h-9 rounded-lg bg-notilus-surface-1 border border-border px-3 text-xs font-body text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
            />
            <button type="submit" className="w-full h-9 rounded-lg notilus-gradient text-xs font-display text-primary-foreground tracking-wider">
              Connect
            </button>
          </form>
        </div>
      </SidebarPanelShell>
    );
  }

  // ── Connected: show repos ──
  return (
    <SidebarPanelShell
      title="GitHub"
      icon={Github}
      searchable
      searchValue={search}
      onSearchChange={setSearch}
      onSearchKeyDown={handleSearchInputKeyDown}
      searchPlaceholder="Search repos..."
      onClose={onClose ?? (() => {})}
      menuItems={[
        { label: 'Refresh repos', onClick: () => void handleLoadRepos() },
      ]}
    >
      <div className="p-3 space-y-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setShowPrivate(c => !c)} className={`flex items-center gap-1 px-2 h-6 rounded-md text-[10px] font-body transition-colors duration-fast ${showPrivate ? 'bg-primary/15 text-primary' : 'bg-notilus-surface-1 text-muted-foreground'}`}>
            <Lock size={9} /> Private
          </button>
          <button onClick={() => setSortBy(c => (c === 'updated' ? 'stars' : c === 'stars' ? 'name' : 'updated'))} className="flex items-center gap-1 px-2 h-6 rounded-md bg-notilus-surface-1 text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors duration-fast">
            <ArrowUpDown size={9} /> {sortBy}
          </button>
        </div>

        {error && <div className="text-[10px] font-body text-error bg-error/10 border border-error/30 rounded-md p-2">{error}</div>}

        <div className="space-y-2">
          {filtered.map(repo => (
            <button type="button" key={repo.id} onClick={() => (onNavigate ? onNavigate(repo.htmlUrl) : window.open(repo.htmlUrl, '_blank'))} className="w-full text-left p-2.5 rounded-lg bg-notilus-surface-1 border border-border space-y-1.5 hover:bg-notilus-surface-2 transition-colors duration-fast">
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

        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 size={16} className="animate-spin text-primary" />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
            <Github size={32} className="opacity-30" />
            <span className="text-xs font-body">{repos.length === 0 ? 'No repositories loaded' : 'No repositories found'}</span>
          </div>
        )}
      </div>
    </SidebarPanelShell>
  );
}
