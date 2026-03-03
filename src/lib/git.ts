import type { GitSnapshot } from '../../shared/browser-contract';
import {
  desktopCommitGit,
  desktopDiscardGitFile,
  desktopGetGitState,
  desktopRefreshGitState,
  desktopStageGitFile,
  desktopUnstageGitFile,
  isDesktopRuntime,
  onDesktopGitStateChanged,
} from './electronBridge';

const GIT_UPDATED_EVENT = 'notilus:git-updated';

let snapshotCache: GitSnapshot = {
  repositoryPath: null,
  branch: '-',
  ahead: 0,
  behind: 0,
  staged: [],
  unstaged: [],
  recentCommits: [],
  updatedAt: new Date().toISOString(),
  error: isDesktopRuntime()
    ? 'Loading Git state...'
    : 'Git panel is available in desktop mode only.',
};

function dispatchGitUpdated() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(GIT_UPDATED_EVENT));
}

function updateSnapshot(next: GitSnapshot) {
  snapshotCache = next;
  dispatchGitUpdated();
}

export function getGitSnapshot(): GitSnapshot {
  return snapshotCache;
}

export function subscribeToGitUpdates(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(GIT_UPDATED_EVENT, listener);
  return () => {
    window.removeEventListener(GIT_UPDATED_EVENT, listener);
  };
}

export async function initializeGitBridge(): Promise<() => void> {
  if (!isDesktopRuntime()) return () => {};

  const initial = await desktopGetGitState();
  if (initial) {
    updateSnapshot(initial);
  }

  return onDesktopGitStateChanged(next => {
    updateSnapshot(next);
  });
}

export async function refreshGitSnapshot(): Promise<GitSnapshot> {
  if (!isDesktopRuntime()) return snapshotCache;
  const snapshot = await desktopRefreshGitState();
  if (snapshot) {
    updateSnapshot(snapshot);
  }
  return snapshotCache;
}

export async function commitGit(message: string): Promise<GitSnapshot> {
  if (!isDesktopRuntime()) return snapshotCache;
  const snapshot = await desktopCommitGit({ message });
  if (snapshot) {
    updateSnapshot(snapshot);
  }
  return snapshotCache;
}

export async function stageGitFile(path: string): Promise<GitSnapshot> {
  if (!isDesktopRuntime()) return snapshotCache;
  const snapshot = await desktopStageGitFile({ path });
  if (snapshot) {
    updateSnapshot(snapshot);
  }
  return snapshotCache;
}

export async function unstageGitFile(path: string): Promise<GitSnapshot> {
  if (!isDesktopRuntime()) return snapshotCache;
  const snapshot = await desktopUnstageGitFile({ path });
  if (snapshot) {
    updateSnapshot(snapshot);
  }
  return snapshotCache;
}

export async function discardGitFile(path: string): Promise<GitSnapshot> {
  if (!isDesktopRuntime()) return snapshotCache;
  const snapshot = await desktopDiscardGitFile({ path });
  if (snapshot) {
    updateSnapshot(snapshot);
  }
  return snapshotCache;
}
