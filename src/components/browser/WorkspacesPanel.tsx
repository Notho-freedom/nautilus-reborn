import { useCallback, useEffect, useMemo, useState } from 'react';
import { Folder, FolderOpen, MoreVertical } from 'lucide-react';
import { SidebarPanelShell } from './SidebarPanelShell';
import { PanelEmptyState } from './PanelEmptyState';
import {
  getWorkspaces,
  removeWorkspace,
  renameWorkspace,
  subscribeToWorkspaceUpdates,
  type WorkspaceEntry,
  type WorkspaceTab,
} from '@/lib/workspaces';
import type { BrowserTab } from '@/hooks/useBrowserState';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface WorkspacesPanelProps {
  currentTabs: BrowserTab[];
  onOpenUrlsInCurrentWindow: (tabs: WorkspaceTab[]) => void;
  onOpenUrlsInNewWindow: (tabs: WorkspaceTab[]) => void;
  onSaveWorkspace: () => void;
  onClose?: () => void;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString();
}

export function WorkspacesPanel({
  currentTabs,
  onOpenUrlsInCurrentWindow,
  onOpenUrlsInNewWindow,
  onSaveWorkspace,
  onClose,
}: WorkspacesPanelProps) {
  const [workspaces, setWorkspaces] = useState<WorkspaceEntry[]>([]);
  const [renameTarget, setRenameTarget] = useState<WorkspaceEntry | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const refresh = useCallback(() => {
    setWorkspaces(getWorkspaces());
  }, []);

  useEffect(() => {
    refresh();
    return subscribeToWorkspaceUpdates(refresh);
  }, [refresh]);

  const hasCurrentTabs = currentTabs.some(tab => !tab.isPrivate);

  const handleCreate = useCallback(() => {
    if (!hasCurrentTabs) return;
    onSaveWorkspace();
  }, [hasCurrentTabs, onSaveWorkspace]);

  const handleRenameSubmit = () => {
    if (!renameTarget) return;
    renameWorkspace(renameTarget.id, renameValue);
    setRenameTarget(null);
    setRenameValue('');
  };

  const sortedWorkspaces = useMemo(() => workspaces, [workspaces]);

  return (
    <>
      <SidebarPanelShell
        title="Workspaces"
        icon={Folder}
        onClose={onClose ?? (() => {})}
        menuItems={[
          {
            label: 'Save current session',
            onClick: handleCreate,
          },
        ]}
        footer={`${sortedWorkspaces.length} saved session${sortedWorkspaces.length === 1 ? '' : 's'}`}
        contentClassName={sortedWorkspaces.length === 0 ? 'flex' : undefined}
      >
        {sortedWorkspaces.map(workspace => (
          <div
            key={workspace.id}
            className="group flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors duration-fast"
          >
            <div className="w-8 h-8 rounded-md bg-notilus-surface-2 flex items-center justify-center text-primary">
              <FolderOpen size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-body text-foreground truncate">{workspace.name}</div>
              <div className="text-[10px] font-body text-muted-foreground truncate">
                {formatDate(workspace.createdAt)} • {workspace.tabs.length} tabs
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors duration-fast opacity-0 group-hover:opacity-100">
                  <MoreVertical size={12} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass border-border min-w-[170px]">
                <DropdownMenuItem
                  onClick={() => onOpenUrlsInCurrentWindow(workspace.tabs)}
                  className="text-xs font-body cursor-pointer"
                >
                  Open in current window
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onOpenUrlsInNewWindow(workspace.tabs)}
                  className="text-xs font-body cursor-pointer"
                >
                  Open in new window
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setRenameTarget(workspace);
                    setRenameValue(workspace.name);
                  }}
                  className="text-xs font-body cursor-pointer"
                >
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => removeWorkspace(workspace.id)}
                  className="text-xs font-body cursor-pointer text-destructive"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}

        {sortedWorkspaces.length === 0 && (
          <PanelEmptyState
            icon={Folder}
            title="No workspaces yet"
            hint="Save a session to get started"
          />
        )}
      </SidebarPanelShell>

      <Dialog open={Boolean(renameTarget)} onOpenChange={open => (!open ? setRenameTarget(null) : null)}>
        <DialogContent className="sm:max-w-sm glass border-border">
          <DialogHeader>
            <DialogTitle className="text-sm font-display tracking-wider uppercase">
              Rename workspace
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <input
              value={renameValue}
              onChange={event => setRenameValue(event.target.value)}
              placeholder="Workspace name"
              className="w-full h-9 rounded-md bg-notilus-surface-1 border border-border px-3 text-sm font-body text-foreground outline-none focus:border-primary/50"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRenameTarget(null)}
                className="h-8 px-3 rounded-md text-xs font-body text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameSubmit}
                className="h-8 px-3 rounded-md text-xs font-body text-primary-foreground notilus-gradient"
              >
                Save
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
