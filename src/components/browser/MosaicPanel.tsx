import { useEffect, useMemo, useState } from 'react';
import { LayoutGrid, Plus, Power, PowerOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  countActiveMosaicTiles,
  getMosaicLayout,
  getMosaicPresets,
  setMosaicLayout,
  subscribeToMosaicLayoutUpdates,
} from '@/lib/mosaic';
import { useMosaicState } from '@/hooks/useMosaicState';
import type { MosaicLayoutId, MosaicPresetId } from '@/types/mosaic';
import { SidebarPanelShell } from './SidebarPanelShell';

const PRESET_PREVIEWS: Record<MosaicPresetId, string[][]> = {
  single: [['A']],
  side_by_side: [['A', 'B']],
  stacked: [['A'], ['B']],
  triple_columns: [['A', 'B', 'C']],
  grid_2x2: [
    ['A', 'B'],
    ['C', 'D'],
  ],
  main_sidebar: [['A', 'B']],
  developer: [
    ['A', 'C'],
    ['B', 'C'],
  ],
  productivity: [
    ['A', 'B'],
    ['A', 'C'],
  ],
  focus: [['A', 'B', 'C']],
};

function isPresetLayout(layout: MosaicLayoutId): layout is MosaicPresetId {
  return (
    layout === 'single' ||
    layout === 'side_by_side' ||
    layout === 'stacked' ||
    layout === 'triple_columns' ||
    layout === 'grid_2x2' ||
    layout === 'main_sidebar' ||
    layout === 'developer' ||
    layout === 'productivity' ||
    layout === 'focus'
  );
}

function resolveSelectedPreset(layout: MosaicLayoutId): MosaicPresetId {
  if (layout === '2-col') return 'side_by_side';
  if (layout === '3-col') return 'triple_columns';
  if (isPresetLayout(layout)) return layout;
  return 'single';
}

interface MosaicPanelProps {
  onClose?: () => void;
}

export function MosaicPanel({ onClose }: MosaicPanelProps = {}) {
  const mosaic = useMosaicState();
  const [layout, setLayout] = useState<MosaicLayoutId>(() => getMosaicLayout());
  const presets = useMemo(() => getMosaicPresets(), []);
  const selectedPresetId = resolveSelectedPreset(layout);
  const activeTilesCount = mosaic.activeWorkspace ? countActiveMosaicTiles(mosaic.activeWorkspace.rootTile) : 0;

  useEffect(() => {
    const refresh = () => setLayout(getMosaicLayout());
    refresh();
    return subscribeToMosaicLayoutUpdates(refresh);
  }, []);

  const handleCreateWorkspace = () => {
    const rawName = window.prompt('Nom du workspace Mosaic');
    if (!rawName) return;
    mosaic.createWorkspace(rawName.trim());
  };

  return (
    <SidebarPanelShell
      title="Mosaic"
      icon={LayoutGrid}
      onClose={onClose ?? (() => {})}
      footer="Parite V1: workspaces + presets + split tree"
    >
      <div className="space-y-3 p-3">
        <div className="rounded-lg bg-notilus-surface-2/40 p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-display tracking-[0.18em] text-muted-foreground/70 uppercase">
              Etat Mosaic
            </span>
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider',
                mosaic.isMosaicActive
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {mosaic.isMosaicActive ? 'Actif' : 'Inactif'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (mosaic.isMosaicActive) {
                mosaic.deactivate();
                return;
              }
              mosaic.activate();
            }}
            className={cn(
              'flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors',
              mosaic.isMosaicActive
                ? 'bg-notilus-surface-2/60 text-foreground hover:bg-notilus-surface-2'
                : 'bg-primary/10 text-primary hover:bg-primary/20'
            )}
          >
            {mosaic.isMosaicActive ? <PowerOff size={12} strokeWidth={1.5} /> : <Power size={12} strokeWidth={1.5} />}
            {mosaic.isMosaicActive ? 'Desactiver' : 'Activer'}
          </button>
        </div>

        <div className="rounded-lg bg-notilus-surface-2/40 p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-display tracking-[0.18em] text-muted-foreground/70 uppercase">
              Workspaces
            </span>
            <button
              type="button"
              onClick={handleCreateWorkspace}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-notilus-surface-2/60 hover:text-foreground"
              title="Nouveau workspace"
            >
              <Plus size={10} strokeWidth={1.5} />
              Nouveau
            </button>
          </div>
          <select
            value={mosaic.activeWorkspace?.id ?? ''}
            onChange={event => mosaic.setActiveWorkspace(event.target.value)}
            className="h-8 w-full rounded bg-notilus-surface-2/50 px-2 text-[11px] text-foreground outline-none focus:ring-1 focus:ring-primary/25"
          >
            {mosaic.state.workspaces.map(workspace => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Tiles actives: <span className="tabular-nums text-foreground">{activeTilesCount}</span>
          </p>
        </div>

        {presets.map(option => (
          <button
            key={option.id}
            onClick={() => {
              setMosaicLayout(option.id);
              setLayout(option.id);
              mosaic.activate();
            }}
            className={cn(
              'w-full rounded-xl p-3 text-left transition-all',
              selectedPresetId === option.id
                ? 'bg-primary/10 shadow-[0_0_18px_-8px_hsl(var(--primary)/0.4)]'
                : 'bg-notilus-surface-2/30 hover:bg-notilus-surface-2/55'
            )}
          >
            <div className="mb-1.5 flex items-center gap-2">
              <span className={cn('text-base leading-none', selectedPresetId === option.id ? 'text-primary' : 'text-muted-foreground')}>
                {option.icon}
              </span>
              <span className="text-xs font-display tracking-wider text-foreground">{option.name}</span>
            </div>
            <p className="mb-2 text-[10px] text-muted-foreground">{option.description}</p>
            <div className="space-y-0.5">
              {(PRESET_PREVIEWS[option.id] ?? PRESET_PREVIEWS.single).map((row, rowIndex) => (
                <div key={`${option.id}-row-${rowIndex}`} className="flex gap-0.5">
                  {row.map((cell, cellIndex) => (
                    <div
                      key={`${option.id}-cell-${rowIndex}-${cellIndex}`}
                      className={cn(
                        'h-4 flex-1 rounded-sm',
                        selectedPresetId === option.id ? 'bg-primary/30' : 'bg-notilus-surface-2'
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
