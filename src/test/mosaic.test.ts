import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyMosaicPreset,
  closeMosaicTile,
  getActiveMosaicWorkspace,
  getAllMosaicLeafTiles,
  getMosaicLayout,
  getMosaicState,
  resetMosaicStateForTests,
  setMosaicLayout,
  splitMosaicTile,
} from '@/lib/mosaic';

describe('mosaic service', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetMosaicStateForTests();
  });

  it('initializes with one default workspace', () => {
    const state = getMosaicState();
    expect(state.workspaces).toHaveLength(1);
    expect(state.activeWorkspaceId).toBe(state.workspaces[0].id);
    expect(state.workspaces[0].isDefault).toBe(true);
  });

  it('applies V1 presets and builds recursive leaf tiles', () => {
    applyMosaicPreset('grid_2x2');
    const workspace = getActiveMosaicWorkspace();
    expect(workspace).toBeTruthy();
    const leaves = getAllMosaicLeafTiles(workspace?.rootTile);
    expect(leaves).toHaveLength(4);
  });

  it('supports split and close operations like V1', () => {
    const workspace = getActiveMosaicWorkspace();
    expect(workspace).toBeTruthy();
    const rootId = workspace!.rootTile.id;

    splitMosaicTile(rootId, 'horizontal');
    let leaves = getAllMosaicLeafTiles(getActiveMosaicWorkspace()!.rootTile);
    expect(leaves).toHaveLength(2);

    closeMosaicTile(leaves[1].id);
    leaves = getAllMosaicLeafTiles(getActiveMosaicWorkspace()!.rootTile);
    expect(leaves).toHaveLength(1);
  });

  it('keeps legacy layout API compatibility', () => {
    setMosaicLayout('2-col');
    expect(getMosaicLayout()).toBe('2-col');
    const leaves = getAllMosaicLeafTiles(getActiveMosaicWorkspace()!.rootTile);
    expect(leaves).toHaveLength(2);
  });
});
