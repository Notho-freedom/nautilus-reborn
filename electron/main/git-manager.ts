import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import type {
  GitCommitEntry,
  GitFileChange,
  GitSnapshot,
} from '../../shared/browser-contract';

const execFileAsync = promisify(execFile);

function parseAheadBehind(statusLine: string): { ahead: number; behind: number } {
  const aheadMatch = statusLine.match(/ahead (\d+)/);
  const behindMatch = statusLine.match(/behind (\d+)/);
  return {
    ahead: aheadMatch ? Number(aheadMatch[1]) : 0,
    behind: behindMatch ? Number(behindMatch[1]) : 0,
  };
}

function parseStatusLine(line: string): GitFileChange | null {
  if (line.length < 4) return null;
  const stagedStatus = line[0] ?? ' ';
  const unstagedStatus = line[1] ?? ' ';
  const path = line.slice(3).trim();
  if (!path) return null;
  return {
    path,
    stagedStatus,
    unstagedStatus,
  };
}

export class GitManager {
  private repositoryPath: string | null = null;

  constructor(private readonly debug: boolean) {}

  async refresh(): Promise<GitSnapshot> {
    try {
      const repositoryPath = await this.resolveRepositoryPath();
      if (!repositoryPath) {
        return this.emptySnapshot('Git repository not found in current workspace.');
      }

      const statusOutput = await this.runGit(repositoryPath, [
        'status',
        '--porcelain=1',
        '-b',
      ]);
      const lines = statusOutput
        .split('\n')
        .map(line => line.trimEnd())
        .filter(Boolean);

      const branchLine = lines[0] ?? '## HEAD';
      const branch = branchLine
        .replace(/^##\s*/, '')
        .split('...')[0]
        .trim();
      const { ahead, behind } = parseAheadBehind(branchLine);

      const changes = lines.slice(1).map(parseStatusLine).filter((change): change is GitFileChange => Boolean(change));
      const staged = changes.filter(change => change.stagedStatus !== ' ' && change.stagedStatus !== '?');
      const unstaged = changes.filter(change => change.unstagedStatus !== ' ' || change.stagedStatus === '?');

      const logOutput = await this.runGit(repositoryPath, ['log', '--oneline', '-n', '8']);
      const recentCommits: GitCommitEntry[] = logOutput
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
          const [hash, ...subjectParts] = line.split(' ');
          return {
            hash: hash ?? '',
            subject: subjectParts.join(' ').trim(),
          };
        })
        .filter(entry => entry.hash && entry.subject);

      return {
        repositoryPath,
        branch,
        ahead,
        behind,
        staged,
        unstaged,
        recentCommits,
        updatedAt: new Date().toISOString(),
        error: null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.emptySnapshot(message);
    }
  }

  async commit(message: string): Promise<GitSnapshot> {
    const repositoryPath = await this.resolveRepositoryPath();
    if (!repositoryPath) {
      return this.emptySnapshot('Git repository not found in current workspace.');
    }
    if (!message.trim()) {
      return this.emptySnapshot('Commit message is required.');
    }

    try {
      await this.runGit(repositoryPath, ['add', '-A']);
      await this.runGit(repositoryPath, ['commit', '-m', message.trim()]);
      this.log('commit', message.trim());
      return this.refresh();
    } catch (error) {
      const snapshot = await this.refresh();
      const messageText = error instanceof Error ? error.message : String(error);
      return {
        ...snapshot,
        error: messageText,
      };
    }
  }

  async stageFile(path: string): Promise<GitSnapshot> {
    return this.runFileAction(['add', '--', path], 'stage-file');
  }

  async unstageFile(path: string): Promise<GitSnapshot> {
    return this.runFileAction(['reset', 'HEAD', '--', path], 'unstage-file');
  }

  async discardFile(path: string): Promise<GitSnapshot> {
    return this.runFileAction(['checkout', '--', path], 'discard-file');
  }

  private async runFileAction(args: string[], action: string): Promise<GitSnapshot> {
    const repositoryPath = await this.resolveRepositoryPath();
    if (!repositoryPath) {
      return this.emptySnapshot('Git repository not found in current workspace.');
    }

    try {
      await this.runGit(repositoryPath, args);
      this.log(action, args.join(' '));
      return this.refresh();
    } catch (error) {
      const snapshot = await this.refresh();
      const message = error instanceof Error ? error.message : String(error);
      return {
        ...snapshot,
        error: message,
      };
    }
  }

  private async resolveRepositoryPath(): Promise<string | null> {
    if (this.repositoryPath) return this.repositoryPath;
    try {
      const { stdout } = await execFileAsync('git', ['rev-parse', '--show-toplevel'], {
        cwd: process.cwd(),
        windowsHide: true,
      });
      const root = stdout.trim();
      this.repositoryPath = root || null;
      return this.repositoryPath;
    } catch {
      return null;
    }
  }

  private async runGit(cwd: string, args: string[]): Promise<string> {
    this.log('run', `git ${args.join(' ')}`);
    const { stdout, stderr } = await execFileAsync('git', args, {
      cwd,
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 4,
    });
    if (stderr?.trim() && this.debug) {
      console.warn(`[git-manager] stderr ${stderr.trim()}`);
    }
    return stdout.trimEnd();
  }

  private emptySnapshot(error: string | null): GitSnapshot {
    return {
      repositoryPath: this.repositoryPath,
      branch: '-',
      ahead: 0,
      behind: 0,
      staged: [],
      unstaged: [],
      recentCommits: [],
      updatedAt: new Date().toISOString(),
      error,
    };
  }

  private log(event: string, message: string): void {
    if (!this.debug) return;
    console.info(`[git-manager] ${event} ${message}`);
  }
}
