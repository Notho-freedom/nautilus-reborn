import { useState } from 'react';
import { LayoutGrid, Columns2, Columns3, Rows2, SquareSplitHorizontal, Maximize } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayoutOption {
  id: string;
  name: string;
  icon: React.ElementType;
  preview: string[][]; // rows of cols
}

const LAYOUTS: LayoutOption[] = [
  { id: 'single', name: 'Focus', icon: Maximize, preview: [['1']] },
  { id: '2-col', name: '2 Columns', icon: Columns2, preview: [['1', '2']] },
  { id: '3-col', name: '3 Columns', icon: Columns3, preview: [['1', '2', '3']] },
  { id: '2-row', name: '2 Rows', icon: Rows2, preview: [['1'], ['2']] },
  { id: 'sidebar', name: 'Sidebar + Main', icon: SquareSplitHorizontal, preview: [['S', 'M M']] },
  { id: 'grid', name: '2×2 Grid', icon: LayoutGrid, preview: [['1', '2'], ['3', '4']] },
];

export function MosaicPanel() {
  const [active, setActive] = useState('single');

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <h3 className="text-xs font-mono font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
          <LayoutGrid size={12} /> Mosaic
        </h3>
        <p className="text-[9px] text-muted-foreground mt-1">Choose a layout for split-view</p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
        {LAYOUTS.map(layout => (
          <button
            key={layout.id}
            onClick={() => setActive(layout.id)}
            className={cn(
              "w-full p-3 rounded-lg border transition-all text-left",
              active === layout.id
                ? "border-primary/50 bg-primary/10"
                : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <layout.icon size={14} className={active === layout.id ? 'text-primary' : 'text-muted-foreground'} />
              <span className="text-[11px] font-mono text-foreground">{layout.name}</span>
            </div>
            {/* Mini preview */}
            <div className="space-y-0.5">
              {layout.preview.map((row, ri) => (
                <div key={ri} className="flex gap-0.5">
                  {row.map((cell, ci) => (
                    <div
                      key={ci}
                      className={cn(
                        "h-4 rounded-sm flex-1",
                        active === layout.id ? "bg-primary/30" : "bg-secondary"
                      )}
                      style={{ flex: cell.length > 1 ? cell.length : 1 }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>

      <div className="p-2 border-t border-border">
        <div className="text-[9px] text-muted-foreground text-center">Ctrl+Shift+M to toggle</div>
      </div>
    </div>
  );
}
