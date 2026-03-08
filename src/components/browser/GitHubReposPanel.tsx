import { type KeyboardEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  FolderOpen,
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
  type GitHubContentItem,
  type GitHubRepo,
  type GitHubSortBy,
} from '@/lib/githubRepos';
import { SidebarPanelShell } from './SidebarPanelShell';
import { GitHubRepoView } from './GitHubRepoView';
import { GitHubFileViewer } from './GitHubFileViewer';

type PanelView = 'list' | 'repo' | 'file';

interface GitHubReposPanelProps {
  onNavigate?: (url: string) => void;
  onClose?: () => void;
  githubToken?: string;
  githubUsername?: string;
  isGitHubOAuth?: boolean;
  onSaveGitHubCredentials?: (token: string, username: string) => void;
  onSignInWithGitHub?: () => void;
  onCreateTab?: (url: string, title?: string) => void;
}

export function GitHubReposPanel({
  onNavigate,
  onClose,
  githubToken = '',
  githubUsername = '',
  isGitHubOAuth = false,
  onSaveGitHubCredentials,
  onSignInWithGitHub,
  onCreateTab,
}: GitHubReposPanelProps) {
  const [view, setView] = useState<PanelView>('list');
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [selectedFile, setSelectedFile] = useState<GitHubContentItem | null>(null);

  const [search, setSearch] = useState('');
  const [showPrivate, setShowPrivate] = useState(true);
  const [sortBy, setSortBy] = useState<GitHubSortBy>('updated');
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localConnection, setLocalConnection] = useState(() => getGitHubConnectionConfig());

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

  const handleSelectRepo = (repo: GitHubRepo) => {
    setSelectedRepo(repo);
    setSelectedFile(null);
    setView('repo');
  };

  const handleOpenFile = (item: GitHubContentItem) => {
    setSelectedFile(item);
    setView('file');
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedRepo(null);
    setSelectedFile(null);
  };

  const handleBackToRepo = () => {
    setView('repo');
    setSelectedFile(null);
  };

  const renderScopedShell = (content: ReactNode) => (
    <div className="notilus-github-scope h-full">{content}</div>
  );

  // ── File viewer ──
  if (view === 'file' && selectedRepo && selectedFile) {
    return renderScopedShell(
      <SidebarPanelShell title="GitHub" icon={Github} onClose={onClose ?? (() => {})}>
        <GitHubFileViewer
          repo={selectedRepo}
          file={selectedFile}
          token={effectiveToken}
          onBack={handleBackToRepo}
          onNavigate={onNavigate}
          onCreateTab={onCreateTab}
        />
      </SidebarPanelShell>
    );
  }

  // ── Repo view ──
  if (view === 'repo' && selectedRepo) {
    return renderScopedShell(
      <SidebarPanelShell title="GitHub" icon={Github} onClose={onClose ?? (() => {})}>
        <GitHubRepoView
          repo={selectedRepo}
          token={effectiveToken}
          onBack={handleBackToList}
          onOpenFile={handleOpenFile}
          onNavigate={onNavigate}
          onCreateTab={onCreateTab}
        />
      </SidebarPanelShell>
    );
  }

  // ── Not connected: show PAT form ──
  if (!hasGitHubConnection) {
    return renderScopedShell(
      <SidebarPanelShell title="GitHub" icon={Github} onClose={onClose ?? (() => {})}>
        <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
          <Github size={56} className="text-muted-foreground/40" />
          <div className="text-center space-y-1.5">
            <h3 className="text-sm font-display text-foreground">Connect your GitHub via Supabase</h3>
            <p className="text-[11px] font-body text-muted-foreground leading-relaxed">
              Sign in with GitHub to browse repositories and open files directly in Nautilus.
            </p>
          </div>
          <button
            type="button"
            onClick={onSignInWithGitHub}
            className="w-full h-10 rounded-lg notilus-gradient text-xs font-display text-primary-foreground tracking-wider flex items-center justify-center gap-2"
          >
            <Github size={16} />
            Sign in with GitHub
          </button>
          <details className="w-full">
            <summary className="text-[10px] font-body text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              Advanced: Personal Access Token
            </summary>
            <form onSubmit={handleSavePAT} className="w-full space-y-2 mt-2">
              <input
                value={localConnection.username}
                onChange={e => setLocalConnection(c => ({ ...c, username: e.target.value }))}
                placeholder="GitHub username"
                className="w-full h-9 rounded-lg bg-notilus-surface-1 border border-secondary/45 px-3 text-xs font-body text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
              />
              <input
                value={localConnection.token}
                onChange={e => setLocalConnection(c => ({ ...c, token: e.target.value }))}
                placeholder="Personal access token"
                type="password"
                className="w-full h-9 rounded-lg bg-notilus-surface-1 border border-secondary/45 px-3 text-xs font-body text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
              />
              <button type="submit" className="w-full h-9 rounded-lg bg-notilus-surface-1 border border-secondary/45 text-xs font-display text-foreground tracking-wider hover:bg-notilus-surface-2 transition-colors">
                Connect with PAT
              </button>
            </form>
          </details>
        </div>
      </SidebarPanelShell>
    );
  }

  // ── Connected: repos list ──
  return renderScopedShell(
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
      <div className="p-3 space-y-3 bg-gradient-to-b from-notilus-surface-2/35 to-transparent">
        <div className="flex items-center justify-end gap-2">
          <button onClick={() => setShowPrivate(c => !c)} className={`flex items-center gap-1 px-2 h-6 rounded-md text-[10px] font-body transition-colors ${showPrivate ? 'bg-primary/15 text-primary' : 'bg-notilus-surface-1 text-muted-foreground'}`}>
            <Lock size={9} /> Private
          </button>
          <button onClick={() => setSortBy(c => (c === 'updated' ? 'stars' : c === 'stars' ? 'name' : 'updated'))} className="flex items-center gap-1 px-2 h-6 rounded-md bg-notilus-surface-1 text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors">
            <ArrowUpDown size={9} /> {sortBy}
          </button>
        </div>

        {isGitHubOAuth && (
          <div className="text-[10px] font-body text-info bg-info/10 border border-secondary/45 rounded-md p-2">
            Auth source: Supabase GitHub OAuth
          </div>
        )}
        {error && <div className="text-[10px] font-body text-error bg-error/10 border border-secondary/45 rounded-md p-2">{error}</div>}

        <div className="text-[10px] font-body text-muted-foreground bg-notilus-surface-1/80 border border-secondary/35 rounded-md px-2 py-1.5">
          Click a repository to open its file tree. GitHub website opening stays available via the external action.
        </div>

        <div className="space-y-1.5">
          {filtered.map(repo => (
            <div
              key={repo.id}
              role="button"
              tabIndex={0}
              aria-label={`Open repository view ${repo.fullName}`}
              onClick={() => handleSelectRepo(repo)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleSelectRepo(repo);
                }
              }}
              className="w-full text-left p-2.5 rounded-lg bg-notilus-surface-1 border border-secondary/35 space-y-2 hover:bg-notilus-surface-2 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                {repo.isPrivate ? <Lock size={10} className="text-warning" /> : <Globe size={10} className="text-muted-foreground" />}
                <span className="text-xs font-body text-info font-semibold">{repo.fullName}</span>
                <button
                  type="button"
                  onClick={event => {
                    event.stopPropagation();
                    if (onNavigate) onNavigate(repo.htmlUrl);
                    else window.open(repo.htmlUrl, '_blank');
                  }}
                  aria-label={`Open ${repo.fullName} on GitHub`}
                  className="ml-auto h-6 w-6 rounded-md bg-notilus-surface-2/70 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-notilus-surface-2 transition-colors"
                  title="Open on GitHub"
                >
                  <ExternalLink size={10} />
                </button>
              </div>
              <p className="text-[10px] font-body text-muted-foreground line-clamp-2">{repo.description || 'No description'}</p>
              <div className="flex items-center gap-3 text-[9px] font-body text-muted-foreground">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: repo.languageColor }} />{repo.language}</span>
                <span className="flex items-center gap-0.5"><Star size={8} /> {repo.stars}</span>
                <span className="flex items-center gap-0.5"><GitFork size={8} /> {repo.forks}</span>
                <span>{formatRelativeDate(repo.updatedAt)}</span>
              </div>
              <div className="flex items-center justify-end">
                <span className="inline-flex items-center gap-1 text-[10px] font-body text-muted-foreground">
                  <FolderOpen size={10} />
                  Open repo view
                </span>
              </div>
            </div>
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
