export type GitHubSortBy = 'updated' | 'stars' | 'name';

export interface GitHubRepo {
  id: string;
  name: string;
  fullName: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  languageColor: string;
  isPrivate: boolean;
  updatedAt: string;
  htmlUrl: string;
}

export interface GitHubConnectionConfig {
  token: string;
  username: string;
}

interface FetchGitHubReposOptions {
  token?: string;
  username?: string;
  includePrivate: boolean;
  sortBy: GitHubSortBy;
}

interface GitHubApiRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  private: boolean;
  updated_at: string;
  html_url: string;
}

const CONFIG_KEY = 'notilus_github_connection';
const DEFAULT_COLOR = '#9CA3AF';
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Rust: '#dea584',
  Dart: '#00B4AB',
  Java: '#b07219',
  Go: '#00ADD8',
  HTML: '#e34c26',
  CSS: '#563d7c',
  MDX: '#fcb32c',
  Shell: '#89e051',
};

function resolveLanguageColor(language: string): string {
  return LANGUAGE_COLORS[language] ?? DEFAULT_COLOR;
}

function normalizeConfig(value: Partial<GitHubConnectionConfig>): GitHubConnectionConfig {
  return {
    token: (value.token ?? '').trim(),
    username: (value.username ?? '').trim(),
  };
}

export function getGitHubConnectionConfig(): GitHubConnectionConfig {
  if (typeof window === 'undefined') {
    return { token: '', username: '' };
  }
  const raw = window.localStorage.getItem(CONFIG_KEY);
  if (!raw) return { token: '', username: '' };
  try {
    const parsed = JSON.parse(raw) as Partial<GitHubConnectionConfig>;
    return normalizeConfig(parsed);
  } catch {
    return { token: '', username: '' };
  }
}

export function updateGitHubConnectionConfig(
  partial: Partial<GitHubConnectionConfig>
): GitHubConnectionConfig {
  const current = getGitHubConnectionConfig();
  const next = normalizeConfig({ ...current, ...partial });
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CONFIG_KEY, JSON.stringify(next));
  }
  return next;
}

function toRepo(raw: GitHubApiRepo): GitHubRepo {
  const language = raw.language ?? 'Unknown';
  return {
    id: String(raw.id),
    name: raw.name,
    fullName: raw.full_name,
    description: raw.description ?? '',
    stars: raw.stargazers_count,
    forks: raw.forks_count,
    language,
    languageColor: resolveLanguageColor(language),
    isPrivate: raw.private,
    updatedAt: raw.updated_at,
    htmlUrl: raw.html_url,
  };
}

function sortRepos(repos: GitHubRepo[], sortBy: GitHubSortBy): GitHubRepo[] {
  const sorted = [...repos];
  if (sortBy === 'stars') {
    sorted.sort((a, b) => b.stars - a.stars);
    return sorted;
  }
  if (sortBy === 'name') {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }
  sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return sorted;
}

async function fetchReposPage(url: string, token?: string): Promise<GitHubApiRepo[]> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    let details = `GitHub API ${response.status}`;
    try {
      const payload = (await response.json()) as { message?: string };
      if (payload.message) details = `${details}: ${payload.message}`;
    } catch {
      // Ignore JSON parsing failure.
    }
    throw new Error(details);
  }

  const payload = (await response.json()) as GitHubApiRepo[];
  return Array.isArray(payload) ? payload : [];
}

export async function fetchGitHubRepos(
  options: FetchGitHubReposOptions
): Promise<GitHubRepo[]> {
  const token = options.token?.trim();
  const username = options.username?.trim();
  const includePrivate = options.includePrivate && Boolean(token);

  if (!token && !username) {
    throw new Error('Provide a GitHub token or username.');
  }

  const repos: GitHubRepo[] = [];
  let page = 1;

  while (page <= 10) {
    const endpoint = token
      ? `https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner`
      : `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&page=${page}&sort=updated&type=owner`;

    const pageItems = await fetchReposPage(endpoint, token);
    if (pageItems.length === 0) break;

    repos.push(...pageItems.map(toRepo));
    page += 1;

    if (pageItems.length < 100) break;
  }

  const filtered = includePrivate ? repos : repos.filter(repo => !repo.isPrivate);
  return sortRepos(filtered, options.sortBy);
}

// ── Repo contents API ──

export interface GitHubContentItem {
  name: string;
  path: string;
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  size: number;
  sha: string;
  htmlUrl: string;
  downloadUrl: string | null;
}

interface GitHubApiContentItem {
  name: string;
  path: string;
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  size: number;
  sha: string;
  html_url: string;
  download_url: string | null;
}

function toContentItem(raw: GitHubApiContentItem): GitHubContentItem {
  return {
    name: raw.name,
    path: raw.path,
    type: raw.type,
    size: raw.size,
    sha: raw.sha,
    htmlUrl: raw.html_url,
    downloadUrl: raw.download_url,
  };
}

function sortContents(items: GitHubContentItem[]): GitHubContentItem[] {
  return [...items].sort((a, b) => {
    if (a.type === 'dir' && b.type !== 'dir') return -1;
    if (a.type !== 'dir' && b.type === 'dir') return 1;
    return a.name.localeCompare(b.name);
  });
}

export async function fetchRepoContents(
  owner: string,
  repo: string,
  path: string,
  token?: string
): Promise<GitHubContentItem[]> {
  const encodedPath = path ? encodeURIComponent(path).replace(/%2F/g, '/') : '';
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    let details = `GitHub API ${response.status}`;
    try {
      const payload = (await response.json()) as { message?: string };
      if (payload.message) details = `${details}: ${payload.message}`;
    } catch { /* ignore */ }
    throw new Error(details);
  }

  const payload = await response.json();
  const items = Array.isArray(payload) ? payload : [payload];
  return sortContents((items as GitHubApiContentItem[]).map(toContentItem));
}

export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  token?: string
): Promise<string> {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github.v3.raw',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API ${response.status}`);
  }

  return response.text();
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';

  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSeconds < 60) return 'just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;
  return `${Math.floor(diffSeconds / 604800)}w ago`;
}
