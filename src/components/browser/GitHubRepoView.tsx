import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  File,
  FileCode,
  Folder,
  GitFork,
  Globe,
  Loader2,
  Lock,
  Star,
} from 'lucide-react';
import {
  fetchRepoContents,
  formatFileSize,
  type GitHubContentItem,
  type GitHubRepo,
} from '@/lib/githubRepos';

interface GitHubRepoViewProps {
  repo: GitHubRepo;
  token?: string;
  onBack: () => void;
  onOpenFile: (item: GitHubContentItem) => void;
  onNavigate?: (url: string) => void;
}

const CODE_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'json', 'css', 'scss', 'html', 'md', 'mdx',
  'py', 'rs', 'go', 'java', 'rb', 'php', 'swift', 'kt', 'c', 'cpp', 'h',
  'yml', 'yaml', 'toml', 'xml', 'sql', 'sh', 'bash', 'zsh', 'dockerfile',
  'env', 'gitignore', 'lock', 'txt', 'csv', 'svg',
]);

function isCodeFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return CODE_EXTENSIONS.has(ext);
}

export function GitHubRepoView({ repo, token, onBack, onOpenFile, onNavigate }: GitHubRepoViewProps) {
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [contents, setContents] = useState<GitHubContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [owner, repoName] = repo.fullName.split('/');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchRepoContents(owner, repoName, currentPath.join('/'), token)
      .then(items => {
        if (!cancelled) setContents(items);
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load contents');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [owner, repoName, currentPath.join('/'), token]);

  const navigateToFolder = (folderName: string) => {
    setCurrentPath(prev => [...prev, folderName]);
  };

  const navigateToBreadcrumb = (index: number) => {
    setCurrentPath(prev => prev.slice(0, index));
  };

  const handleItemClick = (item: GitHubContentItem) => {
    if (item.type === 'dir') {
      navigateToFolder(item.name);
    } else {
      onOpenFile(item);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Repo header */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft size={12} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {repo.isPrivate ? <Lock size={10} className="text-warning shrink-0" /> : <Globe size={10} className="text-muted-foreground shrink-0" />}
              <span className="text-xs font-body text-foreground font-semibold truncate">{repo.fullName}</span>
            </div>
          </div>
          <button
            onClick={() => onNavigate ? onNavigate(repo.htmlUrl) : window.open(repo.htmlUrl, '_blank')}
            className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Open on GitHub"
          >
            <ExternalLink size={10} />
          </button>
        </div>

        {repo.description && (
          <p className="text-[10px] font-body text-muted-foreground line-clamp-2">{repo.description}</p>
        )}

        <div className="flex items-center gap-3 text-[9px] font-body text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: repo.languageColor }} />
            {repo.language}
          </span>
          <span className="flex items-center gap-0.5"><Star size={8} /> {repo.stars}</span>
          <span className="flex items-center gap-0.5"><GitFork size={8} /> {repo.forks}</span>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="px-3 py-1.5 border-b border-border flex items-center gap-0.5 overflow-x-auto text-[10px] font-body">
        <button
          onClick={() => navigateToBreadcrumb(0)}
          className="text-info hover:text-foreground transition-colors shrink-0"
        >
          {repoName}
        </button>
        {currentPath.map((segment, i) => (
          <span key={i} className="flex items-center gap-0.5 shrink-0">
            <ChevronRight size={8} className="text-muted-foreground" />
            <button
              onClick={() => navigateToBreadcrumb(i + 1)}
              className={i === currentPath.length - 1 ? 'text-foreground' : 'text-info hover:text-foreground transition-colors'}
            >
              {segment}
            </button>
          </span>
        ))}
      </div>

      {/* Contents */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={16} className="animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="m-3 text-[10px] font-body text-error bg-error/10 border border-error/30 rounded-md p-2">
            {error}
          </div>
        )}

        {!isLoading && !error && contents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
            <Folder size={24} className="opacity-30" />
            <span className="text-xs font-body">Empty directory</span>
          </div>
        )}

        {!isLoading && !error && contents.map(item => (
          <button
            key={item.sha}
            type="button"
            onClick={() => handleItemClick(item)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-notilus-surface-1 transition-colors border-b border-border/50"
          >
            {item.type === 'dir' ? (
              <Folder size={12} className="text-info shrink-0" />
            ) : isCodeFile(item.name) ? (
              <FileCode size={12} className="text-muted-foreground shrink-0" />
            ) : (
              <File size={12} className="text-muted-foreground shrink-0" />
            )}
            <span className="flex-1 text-xs font-body text-foreground truncate">{item.name}</span>
            {item.type === 'file' && (
              <span className="text-[9px] font-body text-muted-foreground shrink-0">
                {formatFileSize(item.size)}
              </span>
            )}
            {item.type === 'dir' && (
              <ChevronRight size={10} className="text-muted-foreground shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
