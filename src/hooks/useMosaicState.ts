import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MosaicPresetId, MosaicState, MosaicTile, MosaicTileType, SplitDirection } from '@/types/mosaic';
import {
  activateMosaic,
  applyMosaicPreset,
  closeMosaicTile,
  createMosaicWorkspace,
  deactivateMosaic,
  getActiveMosaicWorkspace,
  getMosaicPresets,
  getMosaicState,
  setActiveMosaicWorkspace,
  setMosaicTileContent,
  setMosaicTileTab,
  splitMosaicTile,
  subscribeToMosaicStateUpdates,
  toggleMosaic,
} from '@/lib/mosaic';

export interface UseMosaicStateApi {
  state: MosaicState;
  isMosaicActive: boolean;
  activeWorkspace: ReturnType<typeof getActiveMosaicWorkspace>;
  presets: ReturnType<typeof getMosaicPresets>;
  toggle: (activeTabId?: string) => void;
  activate: (activeTabId?: string) => void;
  deactivate: () => void;
  createWorkspace: (name: string, rootTile?: MosaicTile) => void;
  setActiveWorkspace: (workspaceId: string) => void;
  applyPreset: (presetId: MosaicPresetId) => void;
  setTileContent: (
    tileId: string,
    type: MosaicTileType,
    options?: { tabId?: string | null; serviceId?: string | null; metadata?: Record<string, unknown> }
  ) => void;
  setTileTab: (tileId: string, tabId: string) => void;
  splitTile: (tileId: string, direction: SplitDirection, newTileType?: MosaicTileType) => void;
  closeTile: (tileId: string) => void;
}

export function useMosaicState(): UseMosaicStateApi {
  const [state, setState] = useState<MosaicState>(() => getMosaicState());
  const presets = useMemo(() => getMosaicPresets(), []);

  useEffect(() => {
    const refresh = () => setState(getMosaicState());
    refresh();
    return subscribeToMosaicStateUpdates(refresh);
  }, []);

  const activeWorkspace = useMemo(() => getActiveMosaicWorkspace(), [state]);
  const isMosaicActive = state.isActive && state.isVisible;

  const toggle = useCallback((activeTabId?: string) => toggleMosaic({ activeTabId }), []);
  const activate = useCallback((activeTabId?: string) => activateMosaic({ activeTabId }), []);
  const deactivate = useCallback(() => deactivateMosaic(), []);
  const createWorkspace = useCallback(
    (name: string, rootTile?: MosaicTile) => createMosaicWorkspace(name, rootTile),
    []
  );
  const setActiveWorkspace = useCallback((workspaceId: string) => setActiveMosaicWorkspace(workspaceId), []);
  const applyPreset = useCallback((presetId: MosaicPresetId) => applyMosaicPreset(presetId), []);

  const setTileContent = useCallback<
    UseMosaicStateApi['setTileContent']
  >((tileId, type, options) => setMosaicTileContent(tileId, type, options), []);
  const setTileTab = useCallback((tileId: string, tabId: string) => setMosaicTileTab(tileId, tabId), []);
  const splitTile = useCallback(
    (tileId: string, direction: SplitDirection, newTileType?: MosaicTileType) =>
      splitMosaicTile(tileId, direction, { newTileType }),
    []
  );
  const closeTile = useCallback((tileId: string) => closeMosaicTile(tileId), []);

  return {
    state,
    isMosaicActive,
    activeWorkspace,
    presets,
    toggle,
    activate,
    deactivate,
    createWorkspace,
    setActiveWorkspace,
    applyPreset,
    setTileContent,
    setTileTab,
    splitTile,
    closeTile,
  };
}
