import { BookOpen, Keyboard, Zap, Info, Search } from 'lucide-react';
import { useState } from 'react';

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
  'API documentation browser',
  'Extension management',
  'Mosaic split-view layouts',
  'Web services quick access',
  'Ad blocker & tracker protection',
  'Multiple accent themes',
  'Keyboard shortcuts for everything',
];

export function DocumentationPanel() {
  const [search, setSearch] = useState('');

  const filteredShortcuts = SHORTCUTS.filter(s =>
    !search || s.action.toLowerCase().includes(search.toLowerCase()) || s.keys.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <h3 className="text-xs font-display font-semibold text-primary uppercase tracking-widest flex items-center gap-1.5">
          <BookOpen size={12} /> Documentation
        </h3>
        <div className="flex items-center h-8 rounded-lg bg-notilus-surface-1 border border-border px-2 gap-1.5 mt-2">
          <Search size={12} className="text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search docs..."
            className="flex-1 bg-transparent text-xs font-body text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-4">
        {/* About */}
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-display text-muted-foreground uppercase tracking-widest mb-2">
            <Info size={10} /> About Notilus
          </div>
          <div className="glass rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg notilus-gradient flex items-center justify-center animate-glow-breathe">
                <span className="text-[10px] font-display font-bold text-primary-foreground">N</span>
              </div>
              <div>
                <div className="text-xs font-display text-foreground tracking-wider">NOTILUS</div>
                <div className="text-[10px] font-body text-muted-foreground">v2.0.0 Beta</div>
              </div>
            </div>
            <p className="text-[11px] font-body text-muted-foreground leading-relaxed">
              A dev-first futuristic browser with integrated tools, AI assistant, and customizable workspace.
            </p>
          </div>
        </div>

        {/* Shortcuts */}
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-display text-muted-foreground uppercase tracking-widest mb-2">
            <Keyboard size={10} /> Shortcuts
          </div>
          <div className="space-y-0.5">
            {filteredShortcuts.map(s => (
              <div key={s.keys} className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted/30 transition-colors duration-fast">
                <span className="text-[11px] font-body text-muted-foreground">{s.action}</span>
                <kbd className="px-1.5 py-0.5 rounded-md bg-notilus-surface-2 border border-border text-[9px] font-mono text-foreground">{s.keys}</kbd>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-display text-muted-foreground uppercase tracking-widest mb-2">
            <Zap size={10} /> Features
          </div>
          <div className="space-y-1">
            {FEATURES.map(f => (
              <div key={f} className="flex items-start gap-1.5 px-2">
                <span className="text-primary text-[10px] mt-0.5">▸</span>
                <span className="text-[11px] font-body text-muted-foreground">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
