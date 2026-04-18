import { useMemo, useState } from 'react';
import {
  BookOpen,
  Command,
  Cpu,
  Info,
  LayoutGrid,
  Rocket,
  Wrench,
} from 'lucide-react';
import { SidebarPanelShell } from './SidebarPanelShell';
import { PanelEmptyState } from './PanelEmptyState';

type DocSectionId =
  | 'overview'
  | 'workspace'
  | 'shortcuts'
  | 'devtools'
  | 'architecture';

interface ShortcutItem {
  keys: string;
  action: string;
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: 'Ctrl+T', action: 'Create new tab' },
  { keys: 'Ctrl+W', action: 'Close active tab' },
  { keys: 'Ctrl+Tab', action: 'Switch to next tab' },
  { keys: 'Ctrl+Shift+Tab', action: 'Switch to previous tab' },
  { keys: 'Ctrl+L', action: 'Focus URL bar' },
  { keys: 'Ctrl+D', action: 'Bookmark active page' },
  { keys: 'Ctrl+H', action: 'Open history panel' },
  { keys: 'Ctrl+J', action: 'Open downloads panel' },
  { keys: 'F12 / Ctrl+Shift+I', action: 'Open native WebView DevTools (external tabs)' },
];

const DOC_SECTIONS: Array<{
  id: DocSectionId;
  title: string;
  keywords: string[];
  icon: React.ElementType;
}> = [
  {
    id: 'overview',
    title: 'Overview',
    keywords: ['about', 'intro', 'browser', 'notilus'],
    icon: Info,
  },
  {
    id: 'workspace',
    title: 'Workspace',
    keywords: ['panels', 'bottom bar', 'tools', 'studio', 'mosaic'],
    icon: LayoutGrid,
  },
  {
    id: 'shortcuts',
    title: 'Shortcuts',
    keywords: ['keyboard', 'hotkeys', 'commands'],
    icon: Command,
  },
  {
    id: 'devtools',
    title: 'DevTools',
    keywords: ['chromium', 'inspect', 'console', 'debug'],
    icon: Wrench,
  },
  {
    id: 'architecture',
    title: 'Architecture',
    keywords: ['electron', 'react', 'webview', 'runtime'],
    icon: Cpu,
  },
];

interface DocumentationPanelProps {
  onClose?: () => void;
}

export function DocumentationPanel({ onClose }: DocumentationPanelProps = {}) {
  const [query, setQuery] = useState('');
  const [activeSection, setActiveSection] = useState<DocSectionId | null>(null);

  const normalizedQuery = query.trim().toLowerCase();

  const visibleSections = useMemo(() => {
    return DOC_SECTIONS.filter(section => {
      if (activeSection && section.id !== activeSection) return false;
      if (!normalizedQuery) return true;
      return [section.title, ...section.keywords].join(' ').toLowerCase().includes(normalizedQuery);
    });
  }, [activeSection, normalizedQuery]);

  const shortcutMatches = useMemo(() => {
    if (!normalizedQuery) return SHORTCUTS;
    return SHORTCUTS.filter(item =>
      `${item.keys} ${item.action}`.toLowerCase().includes(normalizedQuery)
    );
  }, [normalizedQuery]);

  const isVisible = (id: DocSectionId) => visibleSections.some(section => section.id === id);

  return (
    <SidebarPanelShell
      title="Documentation"
      icon={BookOpen}
      searchable
      searchValue={query}
      onSearchChange={setQuery}
      searchPlaceholder="Search docs..."
      filters={DOC_SECTIONS.map(section => ({ label: section.title, value: section.id }))}
      activeFilter={activeSection}
      onFilterChange={value => setActiveSection((value as DocSectionId | null) ?? null)}
      onClose={onClose ?? (() => {})}
      footer={`${visibleSections.length} section${visibleSections.length === 1 ? '' : 's'} visible`}
      contentClassName="px-3 py-3"
    >
      <div className="space-y-3">
        {isVisible('overview') && (
          <DocCard title="Overview" icon={Info}>
            <div className="mb-2 flex items-center gap-2">
              <img src="/logo_n_no_bg.png" alt="Notilus" className="h-8 w-8 object-contain" />
              <div className="text-xs font-body text-muted-foreground">
                <div className="font-display tracking-wider text-foreground">NOTILUS</div>
                <div>v2.0.0 Beta</div>
              </div>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Notilus is a desktop developer browser with integrated Chromium rendering, tool panels,
              terminal runtime, and production-oriented navigation workflows.
            </p>
          </DocCard>
        )}

        {isVisible('workspace') && (
          <DocCard title="Workspace" icon={LayoutGrid}>
            <ul className="space-y-1 text-[11px] text-muted-foreground">
              <li>Left sidebar: tools and service panels (Git, GitHub, Terminal, Studio, Monitor).</li>
              <li>Bottom bar: live runtime metrics, zoom, labs, and quick tools menus.</li>
              <li>Studio + Mosaic: responsive viewport and multi-pane layout for active web content.</li>
              <li>Panels are resizable and persist their width across sessions.</li>
            </ul>
          </DocCard>
        )}

        {isVisible('shortcuts') && (
          <DocCard title="Shortcuts" icon={Command}>
            <div className="space-y-1">
              {shortcutMatches.map(item => (
                <div
                  key={item.keys}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 transition-colors hover:bg-notilus-surface-2/50"
                >
                  <span className="text-[11px] text-muted-foreground">{item.action}</span>
                  <kbd className="rounded-md bg-notilus-surface-2/70 px-1.5 py-0.5 font-mono text-[9px] text-foreground">
                    {item.keys}
                  </kbd>
                </div>
              ))}
              {shortcutMatches.length === 0 && (
                <PanelEmptyState icon={Command} title="No shortcut matches this query" />
              )}
            </div>
          </DocCard>
        )}

        {isVisible('devtools') && (
          <DocCard title="DevTools" icon={Wrench}>
            <ul className="space-y-1 text-[11px] text-muted-foreground">
              <li>External tabs: opens Chromium DevTools targeting the active WebView guest.</li>
              <li>Internal pages: opens Notilus DevTools panel for app-level diagnostics.</li>
              <li>Inspect element from right click in WebView routes to guest DevTools.</li>
              <li>Bottom bar exposes Notilus console without replacing native external DevTools.</li>
            </ul>
          </DocCard>
        )}

        {isVisible('architecture') && (
          <DocCard title="Architecture" icon={Cpu}>
            <div className="space-y-1 text-[11px] text-muted-foreground">
              <p>
                <span className="text-foreground">Renderer:</span> React + TypeScript + Radix UI +
                Tailwind.
              </p>
              <p>
                <span className="text-foreground">Desktop shell:</span> Electron (main + preload
                bridge).
              </p>
              <p>
                <span className="text-foreground">External web engine:</span> Electron
                <code className="mx-1 rounded bg-notilus-surface-2/70 px-1 py-0.5 text-[10px] text-foreground">
                  &lt;webview&gt;
                </code>
                guests per external tab.
              </p>
              <p>
                <span className="text-foreground">Runtime tools:</span> Studio capture, terminal
                sessions, system metrics stream, and extension runtime injection.
              </p>
            </div>
          </DocCard>
        )}

        {visibleSections.length === 0 && (
          <PanelEmptyState
            icon={Rocket}
            title="No documentation section found"
            hint="Clear the filter or try another keyword."
          />
        )}
      </div>
    </SidebarPanelShell>
  );
}

function DocCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-xl bg-notilus-surface-2/35 p-3">
      <div className="inline-flex items-center gap-1.5 text-[10px] font-display uppercase tracking-[0.18em] text-primary/85">
        <Icon size={11} strokeWidth={1.5} />
        {title}
      </div>
      {children}
    </div>
  );
}
