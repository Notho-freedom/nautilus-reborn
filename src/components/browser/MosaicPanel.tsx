import { useEffect, useState } from 'react';
import { Columns2, Columns3, LayoutGrid, Maximize } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMosaicLayout, setMosaicLayout, type MosaicLayoutId } from '@/lib/mosaic';
import { SidebarPanelShell } from './SidebarPanelShell';

const LAYOUTS: Array<{
  id: MosaicLayoutId;
  name: string;
  description: string;
  icon: React.ElementType;
  preview: string[][];
}> = [
  {
    id: 'single',
    name: 'Focus',
    description: 'Single pane, maximum focus.',
    icon: Maximize,
    preview: [['A']],
  },
  {
    id: '2-col',
    name: 'Dual',
    description: 'Two panes side-by-side.',
    icon: Columns2,
    preview: [['A', 'B']],
  },
  {
    id: '3-col',
    name: 'Tri-pane',
    description: 'Left main + right split.',
    icon: Columns3,
    preview: [['A', 'B'], ['A', 'C']],
  },
];

interface MosaicPanelProps {
  onClose?: () => void;
}

export function MosaicPanel({ onClose }: MosaicPanelProps = {}) {
  const [layout, setLayout] = useState<MosaicLayoutId>(() => getMosaicLayout());

  useEffect(() => {
    setMosaicLayout(layout);
  }, [layout]);

  return (
    <SidebarPanelShell
      title="Mosaic"
      icon={LayoutGrid}
      onClose={onClose ?? (() => {})}
      footer="Applies to external tabs in desktop mode"
    >
      <div className="space-y-2 p-3">
        {LAYOUTS.map(option => (
          <button
            key={option.id}
            onClick={() => setLayout(option.id)}
            className={cn(
              'w-full rounded-xl border p-3 text-left transition-all',
              layout === option.id
                ? 'border-primary/50 bg-primary/10'
                : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
            )}
          >
            <div className="mb-1.5 flex items-center gap-2">
              <option.icon
                size={14}
                className={layout === option.id ? 'text-primary' : 'text-muted-foreground'}
              />
              <span className="text-xs font-display tracking-wider text-foreground">{option.name}</span>
            </div>
            <p className="mb-2 text-[10px] text-muted-foreground">{option.description}</p>
            <div className="space-y-0.5">
              {option.preview.map((row, rowIndex) => (
                <div key={`${option.id}-row-${rowIndex}`} className="flex gap-0.5">
                  {row.map((cell, cellIndex) => (
                    <div
                      key={`${option.id}-cell-${rowIndex}-${cellIndex}`}
                      className={cn(
                        'h-4 flex-1 rounded-sm',
                        layout === option.id ? 'bg-primary/30' : 'bg-notilus-surface-2'
                      )}
                    >
                      <span className="sr-only">{cell}</span>
                    </div>
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
