import { useCallback, useEffect, useMemo, useState } from 'react';
import { Star, Tag, Trash2 } from 'lucide-react';
import {
  addBookmark,
  getBookmarks,
  removeBookmark,
  subscribeToBookmarksUpdates,
  type BookmarkItem,
} from '@/lib/bookmarks';
import { SidebarPanelShell } from './SidebarPanelShell';
import { PanelEmptyState } from './PanelEmptyState';
import { BrowserImportDialog } from './BrowserImportDialog';

interface BookmarksPanelProps {
  onNavigate?: (url: string) => void;
  onClose?: () => void;
}

function getFaviconUrl(url: string): string | null {
  try {
    const hostname = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=16`;
  } catch {
    return null;
  }
}

export function BookmarksPanel({ onNavigate, onClose }: BookmarksPanelProps) {
  const [search, setSearch] = useState('');
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [items, setItems] = useState<BookmarkItem[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createUrl, setCreateUrl] = useState('');
  const [createTitle, setCreateTitle] = useState('');
  const [createFolder, setCreateFolder] = useState('General');
  const [createTags, setCreateTags] = useState('');
  const [isImportDialogOpen, setImportDialogOpen] = useState(false);

  const refresh = useCallback(() => {
    setItems(getBookmarks());
  }, []);

  useEffect(() => {
    refresh();
    return subscribeToBookmarksUpdates(refresh);
  }, [refresh]);

  const folders = useMemo(
    () => Array.from(new Set(items.map(bookmark => bookmark.folder))).filter(Boolean),
    [items]
  );

  const filtered = useMemo(
    () =>
      items.filter(bookmark => {
        const query = search.trim().toLowerCase();
        const matchSearch =
          !query ||
          bookmark.title.toLowerCase().includes(query) ||
          bookmark.url.toLowerCase().includes(query) ||
          bookmark.tags.some(tag => tag.includes(query));
        const matchFolder = !activeFolder || bookmark.folder === activeFolder;
        return matchSearch && matchFolder;
      }),
    [items, search, activeFolder]
  );

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    const created = addBookmark({
      title: createTitle,
      url: createUrl,
      folder: createFolder,
      tags: createTags
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean),
    });

    if (!created) return;
    setCreateUrl('');
    setCreateTitle('');
    setCreateFolder(created.folder);
    setCreateTags('');
    setShowCreate(false);
  };

  const folderFilters = useMemo(
    () => folders.map(f => ({ label: f, value: f })),
    [folders]
  );

  return (
    <>
      <SidebarPanelShell
        title="Favorites"
        icon={Star}
        searchable
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search bookmarks..."
        filters={folderFilters}
        activeFilter={activeFolder}
        onFilterChange={setActiveFolder}
        onClose={onClose ?? (() => {})}
        menuItems={[
          { label: 'Import from browser', onClick: () => setImportDialogOpen(true) },
          { label: 'Add bookmark', onClick: () => setShowCreate(c => !c) },
        ]}
        footer={`${filtered.length} bookmarks • Ctrl+D to add`}
        contentClassName={filtered.length === 0 ? 'flex' : undefined}
      >
        {showCreate && (
          <form onSubmit={handleCreate} className="space-y-1.5 p-3">
            <input
              value={createUrl}
              onChange={event => setCreateUrl(event.target.value)}
              placeholder="URL"
              className="w-full h-7 rounded-md bg-notilus-surface-2 px-2 text-[11px] font-body text-foreground placeholder:text-muted-foreground outline-none border-0"
            />
            <div className="grid grid-cols-2 gap-1.5">
              <input
                value={createTitle}
                onChange={event => setCreateTitle(event.target.value)}
                placeholder="Title"
                className="h-7 rounded-md bg-notilus-surface-2 px-2 text-[11px] font-body text-foreground placeholder:text-muted-foreground outline-none border-0"
              />
              <input
                value={createFolder}
                onChange={event => setCreateFolder(event.target.value)}
                placeholder="Folder"
                className="h-7 rounded-md bg-notilus-surface-2 px-2 text-[11px] font-body text-foreground placeholder:text-muted-foreground outline-none border-0"
              />
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-1.5">
              <input
                value={createTags}
                onChange={event => setCreateTags(event.target.value)}
                placeholder="Tags (comma separated)"
                className="h-7 rounded-md bg-notilus-surface-2 px-2 text-[11px] font-body text-foreground placeholder:text-muted-foreground outline-none border-0"
              />
              <button
                type="submit"
                className="h-7 px-2 rounded-md notilus-gradient text-[10px] font-body text-primary-foreground"
              >
                Save
              </button>
            </div>
          </form>
        )}

        {filtered.map(bookmark => {
          const favicon = getFaviconUrl(bookmark.url);
          return (
            <div
              key={bookmark.id}
              className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors duration-fast cursor-pointer group"
              onClick={() => onNavigate?.(bookmark.url)}
            >
              {favicon ? (
                <img
                  src={favicon}
                  alt=""
                  className="w-4 h-4 rounded-sm"
                  onError={event => {
                    (event.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-4 h-4 rounded-sm bg-muted/60" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-body text-foreground truncate">{bookmark.title}</div>
                <div className="text-[10px] font-body text-muted-foreground truncate">{bookmark.url}</div>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {bookmark.tags.slice(0, 2).map(tag => (
                  <span
                    key={tag}
                    className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-notilus-surface-2 text-[8px] font-body text-muted-foreground"
                  >
                    <Tag size={7} /> {tag}
                  </span>
                ))}
                <button
                  onClick={event => {
                    event.stopPropagation();
                    removeBookmark(bookmark.id);
                  }}
                  className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Remove bookmark"
                >
                  <Trash2 size={9} />
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <PanelEmptyState
            icon={Star}
            title={items.length === 0 ? 'No bookmarks yet' : 'No results found'}
            hint={items.length === 0 ? 'Press Ctrl+D to add one' : undefined}
          />
        )}
      </SidebarPanelShell>
      <BrowserImportDialog
        open={isImportDialogOpen}
        onOpenChange={setImportDialogOpen}
        defaultDatasets={['bookmarks']}
      />
    </>
  );
}
