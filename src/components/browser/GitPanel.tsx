import { useCallback, useEffect, useState } from 'react';
import {
  CheckSquare,
  FileText,
  GitBranch,
  GitCommit,
  Loader2,
  RefreshCw,
  Square,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GitFileChange, GitSnapshot } from '../../../shared/browser-contract';
import {
  commitGit,
  discardGitFile,
  getGitSnapshot,
  initializeGitBridge,
  refreshGitSnapshot,
  stageGitFile,
  subscribeToGitUpdates,
  unstageGitFile,
} from '@/lib/git';
import { SidebarPanelShell } from './SidebarPanelShell';

function statusToLabel(status: string): string {
  if (status === '?') return 'new';
  if (status === 'M') return 'modified';
  if (status === 'A') return 'added';
  if (status === 'D') return 'deleted';
  if (status === 'R') return 'renamed';
  if (status === 'U') return 'conflict';
  return status || '-';
}

interface GitPanelProps {
  onClose?: () => void;
}

export function GitPanel({ onClose }: GitPanelProps = {}) {
  const [snapshot, setSnapshot] = useState<GitSnapshot>(() => getGitSnapshot());
  const [loading, setLoading] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await refreshGitSnapshot();
      setSnapshot(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setSnapshot(getGitSnapshot());
    const unsubscribeLocal = subscribeToGitUpdates(() => {
      setSnapshot(getGitSnapshot());
    });

    let unsubscribeDesktop: (() => void) | null = null;
    void initializeGitBridge().then(unsubscribe => {
      unsubscribeDesktop = unsubscribe;
      setSnapshot(getGitSnapshot());
    });
    void refresh();

    return () => {
      unsubscribeLocal();
      unsubscribeDesktop?.();
    };
  }, [refresh]);

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;
    setLoading(true);
    try {
      const next = await commitGit(commitMessage);
      setSnapshot(next);
      if (!next.error) {
        setCommitMessage('');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidebarPanelShell
      title="Git"
      icon={GitBranch}
      onClose={onClose ?? (() => {})}
      menuItems={[
        { label: 'Refresh', onClick: () => void refresh() },
      ]}
    >
      <div className="p-3 space-y-4">
        <div className="flex items-center gap-2">
          <GitBranch size={14} className="text-primary" />
          <span className="font-mono text-sm text-foreground">{snapshot.branch}</span>
          {snapshot.ahead > 0 && (
            <span className="text-[10px] font-display bg-primary/15 text-primary px-2 py-0.5 rounded-md tracking-wider">↑{snapshot.ahead}</span>
          )}
          {snapshot.behind > 0 && (
            <span className="text-[10px] font-display bg-warning/15 text-warning px-2 py-0.5 rounded-md tracking-wider">↓{snapshot.behind}</span>
          )}
          {loading && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
        </div>

        {snapshot.error && (
          <div className="text-[10px] font-body text-error bg-error/10 border border-error/30 rounded-md p-2">{snapshot.error}</div>
        )}

        <FileSection title="Staged Changes" files={snapshot.staged} color="text-success" actionLabel="Unstage" actionIcon={Square} onAction={path => void unstageGitFile(path)} />
        <FileSection title="Changes" files={snapshot.unstaged} color="text-warning" actionLabel="Stage" actionIcon={CheckSquare} onAction={path => void stageGitFile(path)} destructiveActionLabel="Discard" onDestructiveAction={path => void discardGitFile(path)} />

        <div className="border-t border-border pt-3">
          <h4 className="text-[10px] font-display text-muted-foreground uppercase tracking-widest mb-2">Recent Commits</h4>
          <div className="space-y-1.5">
            {snapshot.recentCommits.map(commit => (
              <div key={commit.hash} className="flex items-start gap-1.5 text-xs font-body">
                <GitCommit size={11} className="text-muted-foreground mt-0.5 shrink-0" />
                <span className="text-foreground truncate">{commit.subject}</span>
                <span className="text-[9px] font-mono text-muted-foreground/70">{commit.hash.slice(0, 7)}</span>
              </div>
            ))}
            {snapshot.recentCommits.length === 0 && (
              <div className="text-[10px] font-body text-muted-foreground">No commits available.</div>
            )}
          </div>
        </div>

        <div className="border-t border-border pt-3 space-y-2">
          <input
            value={commitMessage}
            onChange={event => setCommitMessage(event.target.value)}
            placeholder="Commit message..."
            className="w-full h-8 rounded-lg bg-notilus-surface-1 border border-border px-2 text-xs font-body text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button
            onClick={() => void handleCommit()}
            className="w-full h-8 rounded-lg bg-primary/10 text-primary text-xs font-display tracking-wider hover:bg-primary/20 transition-colors duration-fast disabled:opacity-50"
            disabled={!commitMessage.trim() || loading}
          >
            Commit Changes
          </button>
        </div>
      </div>
    </SidebarPanelShell>
  );
}

function FileSection({
  title, files, color, actionLabel, actionIcon: ActionIcon, onAction, destructiveActionLabel, onDestructiveAction,
}: {
  title: string; files: GitFileChange[]; color: string; actionLabel: string; actionIcon: React.ElementType; onAction: (path: string) => void; destructiveActionLabel?: string; onDestructiveAction?: (path: string) => void;
}) {
  return (
    <div className="border-t border-border pt-3 space-y-1.5">
      <h4 className="text-[10px] font-display text-muted-foreground uppercase tracking-widest">{title} ({files.length})</h4>
      {files.map(file => (
        <div key={file.path} className="flex items-center gap-1.5 text-xs font-body group">
          <FileText size={11} className={cn(color, 'shrink-0')} />
          <span className="text-foreground truncate">{file.path}</span>
          <span className="text-[9px] font-display text-muted-foreground ml-auto uppercase tracking-wider">
            {statusToLabel(file.stagedStatus !== ' ' ? file.stagedStatus : file.unstagedStatus)}
          </span>
          <button onClick={() => onAction(file.path)} className="h-5 px-1.5 text-[9px] rounded-md bg-notilus-surface-1 text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100" title={actionLabel}>
            <span className="inline-flex items-center gap-1"><ActionIcon size={9} />{actionLabel}</span>
          </button>
          {destructiveActionLabel && onDestructiveAction && (
            <button onClick={() => onDestructiveAction(file.path)} className="h-5 w-5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 flex items-center justify-center" title={destructiveActionLabel}>
              <Trash2 size={9} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
