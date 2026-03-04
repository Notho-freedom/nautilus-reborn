import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Puzzle } from 'lucide-react';
import {
  EXTENSION_ICONS,
  getExtensions,
  subscribeToExtensionsUpdates,
  toggleExtension,
  type ExtensionItem,
} from '@/lib/extensions';
import { SidebarPanelShell } from './SidebarPanelShell';

interface ExtensionsPanelProps {
  onClose?: () => void;
}

export function ExtensionsPanel({ onClose }: ExtensionsPanelProps = {}) {
  const [search, setSearch] = useState('');
  const [extensions, setExtensions] = useState<ExtensionItem[]>([]);

  const refresh = useCallback(() => {
    setExtensions(getExtensions());
  }, []);

  useEffect(() => {
    refresh();
    return subscribeToExtensionsUpdates(refresh);
  }, [refresh]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return extensions;
    return extensions.filter(extension =>
      extension.name.toLowerCase().includes(query) ||
      extension.description.toLowerCase().includes(query) ||
      extension.version.toLowerCase().includes(query)
    );
  }, [extensions, search]);

  const enabledCount = filtered.filter(extension => extension.enabled).length;

  return (
    <SidebarPanelShell
      title="Extensions"
      icon={Puzzle}
      searchable
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search extensions..."
      onClose={onClose ?? (() => {})}
      footer={`${enabledCount}/${filtered.length} enabled`}
    >
      {filtered.map(extension => {
        const Icon = EXTENSION_ICONS[extension.iconKey] ?? Puzzle;
        return (
          <div
            key={extension.id}
            className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border/50 hover:bg-muted/30 transition-colors duration-fast"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${extension.enabled ? 'bg-primary/15 text-primary' : 'bg-notilus-surface-2 text-muted-foreground'}`}>
              <Icon size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-body text-foreground truncate">{extension.name}</div>
              <div className="text-[10px] font-body text-muted-foreground truncate">{extension.description}</div>
              <div className="text-[9px] font-body text-muted-foreground/50">v{extension.version}</div>
            </div>
            {extension.homepageUrl && (
              <button onClick={() => window.open(extension.homepageUrl, '_blank', 'noopener,noreferrer')} className="w-6 h-6 rounded-md text-muted-foreground hover:text-foreground transition-colors duration-fast flex items-center justify-center" title="Open extension homepage">
                <ExternalLink size={11} />
              </button>
            )}
            <button
              onClick={() => toggleExtension(extension.id, !extension.enabled)}
              className={`w-9 h-5 rounded-full transition-colors duration-fast relative shrink-0 ${extension.enabled ? 'bg-primary' : 'bg-notilus-surface-2'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-fast ${extension.enabled ? 'left-[18px]' : 'left-0.5'}`} />
            </button>
          </div>
        );
      })}
      {filtered.length === 0 && (
        <div className="p-6 text-center text-xs font-body text-muted-foreground">No matching extensions</div>
      )}
    </SidebarPanelShell>
  );
}
