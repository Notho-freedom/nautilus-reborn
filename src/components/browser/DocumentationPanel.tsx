import { BookOpen, Keyboard, Zap, Info } from 'lucide-react';

const SHORTCUTS = [
  { keys: 'Ctrl+T', action: 'New tab' },
  { keys: 'Ctrl+W', action: 'Close tab' },
  { keys: 'Ctrl+Tab', action: 'Next tab' },
  { keys: 'Ctrl+L', action: 'Focus URL bar' },
  { keys: 'Ctrl+D', action: 'Add bookmark' },
  { keys: 'F12', action: 'Toggle DevTools' },
  { keys: 'Ctrl+H', action: 'History' },
  { keys: 'Ctrl+J', action: 'Downloads' },
  { keys: 'Ctrl+,', action: 'Settings' },
  { keys: 'F5', action: 'Reload' },
];

const FEATURES = [
  'Built-in AI Assistant (Groq powered)',
  'System Monitor with real-time stats',
  'Integrated Terminal with command history',
  'Lighthouse performance audits',
  'Git status & branch management',
  'API documentation browser',
  'Extension management',
  'Mosaic split-view layouts',
  'Web services quick access',
  'Ad blocker & tracker protection',
];

export function DocumentationPanel() {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <h3 className="text-xs font-mono font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
          <BookOpen size={12} /> Documentation
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-4">
        {/* About */}
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
            <Info size={10} /> About Notilus
          </div>
          <div className="glass rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded notilus-gradient flex items-center justify-center">
                <span className="text-[8px] font-mono font-bold text-primary-foreground">N</span>
              </div>
              <div>
                <div className="text-[11px] font-mono text-foreground">Notilus Browser</div>
                <div className="text-[9px] text-muted-foreground">v2.3.0 Beta</div>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              A developer-first browser with integrated tools, AI assistant, and customizable workspace.
            </p>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
            <Keyboard size={10} /> Shortcuts
          </div>
          <div className="space-y-0.5">
            {SHORTCUTS.map(s => (
              <div key={s.keys} className="flex items-center justify-between px-2 py-1 rounded hover:bg-muted/30 transition-colors">
                <span className="text-[10px] text-muted-foreground">{s.action}</span>
                <kbd className="px-1.5 py-0.5 rounded bg-secondary text-[9px] font-mono text-foreground">{s.keys}</kbd>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
            <Zap size={10} /> Features
          </div>
          <div className="space-y-1">
            {FEATURES.map(f => (
              <div key={f} className="flex items-start gap-1.5 px-2">
                <span className="text-primary text-[10px] mt-0.5">•</span>
                <span className="text-[10px] text-muted-foreground">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
