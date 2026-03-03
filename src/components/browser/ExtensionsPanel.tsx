import { useState } from 'react';
import { Puzzle, Shield, Eye, Zap, Palette, Code2, Bug } from 'lucide-react';

interface Extension {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  enabled: boolean;
  version: string;
}

const MOCK_EXTENSIONS: Extension[] = [
  { id: '1', name: 'uBlock Origin', description: 'Ad & tracker blocker', icon: Shield, enabled: true, version: '1.57.0' },
  { id: '2', name: 'Dark Reader', description: 'Dark mode for websites', icon: Eye, enabled: true, version: '4.9.80' },
  { id: '3', name: 'Vimium', description: 'Keyboard navigation', icon: Zap, enabled: false, version: '2.1.2' },
  { id: '4', name: 'ColorZilla', description: 'Color picker & gradient generator', icon: Palette, enabled: true, version: '3.3' },
  { id: '5', name: 'React DevTools', description: 'Inspect React component hierarchy', icon: Code2, enabled: true, version: '5.0.0' },
  { id: '6', name: 'Wappalyzer', description: 'Technology profiler', icon: Bug, enabled: false, version: '6.10.67' },
];

export function ExtensionsPanel() {
  const [extensions, setExtensions] = useState(MOCK_EXTENSIONS);

  const toggle = (id: string) => {
    setExtensions(prev => prev.map(e => e.id === id ? { ...e, enabled: !e.enabled } : e));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <h3 className="text-xs font-mono font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
          <Puzzle size={12} /> Extensions
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {extensions.map(ext => (
          <div key={ext.id} className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border/50 hover:bg-muted/30 transition-colors">
            <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${ext.enabled ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'}`}>
              <ext.icon size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-foreground truncate">{ext.name}</div>
              <div className="text-[9px] text-muted-foreground truncate">{ext.description}</div>
            </div>
            <button
              onClick={() => toggle(ext.id)}
              className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ${ext.enabled ? 'bg-primary' : 'bg-secondary'}`}
            >
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${ext.enabled ? 'left-[18px]' : 'left-0.5'}`} />
            </button>
          </div>
        ))}
      </div>

      <div className="p-2 border-t border-border">
        <div className="text-[9px] text-muted-foreground text-center">
          {extensions.filter(e => e.enabled).length}/{extensions.length} enabled
        </div>
      </div>
    </div>
  );
}
