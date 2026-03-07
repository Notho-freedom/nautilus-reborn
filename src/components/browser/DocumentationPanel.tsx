import { BookOpen, Keyboard, Zap, Info, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { SidebarPanelShell } from './SidebarPanelShell';

const SHORTCUTS = [
  { keys: 'Ctrl+T', action: 'New tab' },
  { keys: 'Ctrl+W', action: 'Close tab' },
  { keys: 'Ctrl+Tab', action: 'Next tab' },
  { keys: 'Ctrl+Shift+Tab', action: 'Previous tab' },
  { keys: 'Ctrl+L', action: 'Focus URL bar' },
  { keys: 'Ctrl+D', action: 'Add bookmark' },
  { keys: 'F12', action: 'Toggle DevTools' },
  { keys: 'Ctrl+Shift+I', action: 'Toggle DevTools' },
  { keys: 'Ctrl+Shift+M', action: 'Toggle Mosaic' },
  { keys: 'Ctrl+Shift+L', action: 'Lighthouse' },
  { keys: 'Ctrl+Shift+S', action: 'Studio' },
  { keys: 'Ctrl+H', action: 'History' },
  { keys: 'Ctrl+J', action: 'Downloads' },
  { keys: 'Ctrl+,', action: 'Settings' },
  { keys: 'F5', action: 'Reload' },
];

const FEATURES = [
  'Hyper AI Assistant (Multi-model)',
  'System Monitor with live metrics',
  'Integrated Terminal',
  'Lighthouse performance audits',
  'Studio (Responsive, Screenshot, Live Edit, Recorder, Mockup)',
  'Git status & branch management',
  'GitHub repos browser',
  'Frontend & Backend Labs',
  'Extension management',
  'Mosaic split-view layouts',
  'Web services quick access',
  'Ad blocker & tracker protection',
  'Multiple accent themes',
  'Keyboard shortcuts for everything',
];

interface DocumentationPanelProps {
  onClose?: () => void;
}

function CollapsibleSection({ title, icon, children, defaultOpen = false }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 w-full text-[10px] font-display text-muted-foreground uppercase tracking-widest mb-1.5 hover:text-foreground transition-colors">
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        {icon}
        <span>{title}</span>
      </button>
      {open && <div className="ml-4">{children}</div>}
    </div>
  );
}

export function DocumentationPanel({ onClose }: DocumentationPanelProps = {}) {
  const [search, setSearch] = useState('');

  const filteredShortcuts = SHORTCUTS.filter(s =>
    !search || s.action.toLowerCase().includes(search.toLowerCase()) || s.keys.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SidebarPanelShell
      title="Documentation"
      icon={BookOpen}
      searchable
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search docs..."
      onClose={onClose ?? (() => {})}
    >
      <div className="p-3 space-y-4">
        <CollapsibleSection title="About Notilus" icon={<Info size={10} />} defaultOpen>
          <div className="glass rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <img src="/logo_n_no_bg.png" alt="Notilus" className="w-8 h-8 rounded-lg object-contain" />
              <div>
                <div className="text-xs font-display text-foreground tracking-wider">NOTILUS</div>
                <div className="text-[10px] font-body text-muted-foreground">v2.0.0 Beta</div>
              </div>
            </div>
            <p className="text-[11px] font-body text-muted-foreground leading-relaxed">
              A dev-first futuristic browser with integrated tools, AI assistant, and customizable workspace.
            </p>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Getting Started" icon={<BookOpen size={10} />}>
          <div className="space-y-1.5 text-[11px] font-body text-muted-foreground">
            <p>Welcome to Notilus — a browser built for developers.</p>
            <p>Use the sidebar to access tools like Git, Terminal, System Monitor, and Dev Labs.</p>
            <p>The bottom bar gives quick access to Frontend/Backend labs and Notilus DevTools.</p>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Shortcuts" icon={<Keyboard size={10} />} defaultOpen>
          <div className="space-y-0.5">
            {filteredShortcuts.map(s => (
              <div key={s.keys} className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted/30 transition-colors duration-fast">
                <span className="text-[11px] font-body text-muted-foreground">{s.action}</span>
                <kbd className="px-1.5 py-0.5 rounded-md bg-notilus-surface-2 border border-border text-[9px] font-mono text-foreground">{s.keys}</kbd>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Features" icon={<Zap size={10} />}>
          <div className="space-y-1">
            {FEATURES.map(f => (
              <div key={f} className="flex items-start gap-1.5 px-2">
                <span className="text-primary text-[10px] mt-0.5">▸</span>
                <span className="text-[11px] font-body text-muted-foreground">{f}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Architecture" icon={<Info size={10} />}>
          <div className="space-y-1.5 text-[11px] font-body text-muted-foreground">
            <p>Built with <span className="text-foreground">React 18</span> + <span className="text-foreground">TypeScript</span> + <span className="text-foreground">Vite</span></p>
            <p>Desktop mode: <span className="text-foreground">Electron</span> with WebContentsView</p>
            <p>UI: <span className="text-foreground">Tailwind CSS</span> + <span className="text-foreground">Radix UI</span></p>
          </div>
        </CollapsibleSection>
      </div>
    </SidebarPanelShell>
  );
}
