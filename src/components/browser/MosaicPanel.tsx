import { useState } from 'react';
import { LayoutGrid, Columns2, Columns3, Rows2, SquareSplitHorizontal, Maximize, MonitorSmartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SidebarPanelShell } from './SidebarPanelShell';

interface LayoutOption {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  preview: string[][];
}

const LAYOUTS: LayoutOption[] = [
  { id: 'single', name: 'Focus', description: 'Single view, maximum focus', icon: Maximize, preview: [['1']] },
  { id: '2-col', name: '2 Columns', description: 'Side by side comparison', icon: Columns2, preview: [['1', '2']] },
  { id: '3-col', name: '3 Columns', description: 'Triple panel workflow', icon: Columns3, preview: [['1', '2', '3']] },
  { id: '2-row', name: '2 Rows', description: 'Top and bottom split', icon: Rows2, preview: [['1'], ['2']] },
  { id: 'sidebar', name: 'Sidebar + Main', description: 'Dev layout with sidebar', icon: SquareSplitHorizontal, preview: [['S', 'M M']] },
  { id: 'grid', name: '2×2 Grid', description: 'Four-way productivity', icon: LayoutGrid, preview: [['1', '2'], ['3', '4']] },
  { id: 'dev', name: 'Dev Mode', description: 'Code + Preview + Terminal', icon: MonitorSmartphone, preview: [['C', 'P'], ['T T']] },
];

interface MosaicPanelProps {
  onClose?: () => void;
}

export function MosaicPanel({ onClose }: MosaicPanelProps = {}) {
  const [active, setActive] = useState('single');

  return (
    <SidebarPanelShell
      title="Mosaic"
      icon={LayoutGrid}
      onClose={onClose ?? (() => {})}
      footer="Ctrl+Shift+M to toggle"
    >
      <div className="p-3 space-y-2">
        {LAYOUTS.map(layout => (
          <button
            key={layout.id}
            onClick={() => setActive(layout.id)}
            className={cn(
              "w-full p-3 rounded-xl border transition-all duration-fast text-left",
              active === layout.id
                ? "border-primary/50 bg-primary/10 glow-primary-sm"
                : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
            )}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <layout.icon size={14} className={active === layout.id ? 'text-primary' : 'text-muted-foreground'} />
              <span className="text-xs font-display text-foreground tracking-wider">{layout.name}</span>
            </div>
            <p className="text-[10px] font-body text-muted-foreground mb-2">{layout.description}</p>
            <div className="space-y-0.5">
              {layout.preview.map((row, ri) => (
                <div key={ri} className="flex gap-0.5">
                  {row.map((cell, ci) => (
                    <div
                      key={ci}
                      className={cn("h-4 rounded-sm flex-1", active === layout.id ? "bg-primary/30" : "bg-notilus-surface-2")}
                      style={{ flex: cell.length > 1 ? cell.length : 1 }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>
    </SidebarPanelShell>
  );
}
