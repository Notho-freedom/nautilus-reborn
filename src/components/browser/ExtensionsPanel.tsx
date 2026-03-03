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
  { id: '4', name: 'ColorZilla', description: 'Color picker & gradient', icon: Palette, enabled: true, version: '3.3' },
  { id: '5', name: 'React DevTools', description: 'Inspect React components', icon: Code2, enabled: true, version: '5.0.0' },
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
        <h3 className="text-xs font-display font-semibold text-primary uppercase tracking-widest flex items-center gap-1.5">
          <Puzzle size={12} /> Extensions
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {extensions.map(ext => (
          <div key={ext.id} className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border/50 hover:bg-muted/30 transition-colors duration-fast">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ext.enabled ? 'bg-primary/15 text-primary' : 'bg-notilus-surface-2 text-muted-foreground'}`}>
              <ext.icon size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-body text-foreground truncate">{ext.name}</div>
              <div className="text-[10px] font-body text-muted-foreground truncate">{ext.description}</div>
              <div className="text-[9px] font-body text-muted-foreground/50">v{ext.version}</div>
            </div>
            <button
              onClick={() => toggle(ext.id)}
              className={`w-9 h-5 rounded-full transition-colors duration-fast relative shrink-0 ${ext.enabled ? 'bg-primary' : 'bg-notilus-surface-2'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-fast ${ext.enabled ? 'left-[18px]' : 'left-0.5'}`} />
            </button>
          </div>
        ))}
      </div>

      <div className="p-2 border-t border-border">
        <div className="text-[10px] font-body text-muted-foreground text-center">
          {extensions.filter(e => e.enabled).length}/{extensions.length} enabled
        </div>
      </div>
    </div>
  );
}
