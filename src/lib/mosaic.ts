import type {
  DropZone,
  MosaicLayoutId,
  MosaicLayoutPreset,
  MosaicPresetId,
  MosaicState,
  MosaicTile,
  MosaicTileType,
  MosaicWorkspace,
  SplitDirection,
} from '@/types/mosaic';

const MOSAIC_LAYOUT_KEY = 'notilus_mosaic_layout';
const MOSAIC_WORKSPACES_KEY = 'notilus_mosaic_workspaces';
const MOSAIC_ACTIVE_WORKSPACE_KEY = 'notilus_mosaic_active_workspace';
const MOSAIC_LAYOUT_CHANGED_EVENT = 'notilus:mosaic-layout-changed';
const MOSAIC_STATE_CHANGED_EVENT = 'notilus:mosaic-state-changed';

const DEFAULT_WORKSPACE_NAME = 'Workspace par defaut';

const INITIAL_STATE: MosaicState = {
  isInitialized: false,
  isActive: false,
  isVisible: true,
  activeWorkspaceId: null,
  workspaces: [],
  hoveredTileId: null,
  focusedTileId: null,
  dragOverTileId: null,
  dragOverZone: null,
};

let state: MosaicState = { ...INITIAL_STATE };

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `mosaic-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function dispatchMosaicEvents(options?: { layoutChanged?: boolean }) {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(MOSAIC_STATE_CHANGED_EVENT));
  if (options?.layoutChanged) {
    window.dispatchEvent(new Event(MOSAIC_LAYOUT_CHANGED_EVENT));
  }
}

function persistWorkspaces() {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(MOSAIC_WORKSPACES_KEY, JSON.stringify(state.workspaces));
    if (state.activeWorkspaceId) {
      window.localStorage.setItem(MOSAIC_ACTIVE_WORKSPACE_KEY, state.activeWorkspaceId);
    }
  } catch {
    // Ignore persistence failures.
  }
}

function persistLayout(layout: MosaicLayoutId) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(MOSAIC_LAYOUT_KEY, layout);
  } catch {
    // Ignore persistence failures.
  }
}

function cloneTile(tile: MosaicTile, regenerateIds = false): MosaicTile {
  return {
    id: regenerateIds ? createId() : tile.id,
    type: tile.type,
    flexFactor: tile.flexFactor,
    tabId: tile.tabId,
    serviceId: tile.serviceId,
    metadata: { ...tile.metadata },
    children: tile.children ? tile.children.map(child => cloneTile(child, regenerateIds)) : null,
    splitDirection: tile.splitDirection,
    isLocked: tile.isLocked,
    isMinimized: tile.isMinimized,
  };
}

function cloneWorkspace(workspace: MosaicWorkspace): MosaicWorkspace {
  return {
    ...workspace,
    rootTile: cloneTile(workspace.rootTile),
  };
}

function updateState(nextState: MosaicState, options?: { persist?: boolean; layoutChanged?: boolean }) {
  state = nextState;
  if (options?.persist) {
    persistWorkspaces();
  }
  dispatchMosaicEvents({ layoutChanged: options?.layoutChanged });
}

function normalizeFlex(value: number): number {
  if (!Number.isFinite(value)) return 1;
  if (value <= 0) return 1;
  return value;
}

function createTile(partial?: Partial<MosaicTile>): MosaicTile {
  return {
    id: partial?.id ?? createId(),
    type: partial?.type ?? 'empty',
    flexFactor: normalizeFlex(partial?.flexFactor ?? 1),
    tabId: partial?.tabId ?? null,
    serviceId: partial?.serviceId ?? null,
    metadata: { ...(partial?.metadata ?? {}) },
    children: partial?.children ? partial.children.map(child => cloneTile(child)) : null,
    splitDirection: partial?.splitDirection ?? null,
    isLocked: partial?.isLocked ?? false,
    isMinimized: partial?.isMinimized ?? false,
  };
}

function createSplitTile(
  direction: SplitDirection,
  children: MosaicTile[],
  flexFactor = 1
): MosaicTile {
  return createTile({
    type: 'custom',
    splitDirection: direction,
    children: children.map(child => cloneTile(child)),
    flexFactor,
  });
}

function createEmptyTile(flexFactor = 1): MosaicTile {
  return createTile({ type: 'empty', flexFactor });
}

function createDefaultWorkspace(): MosaicWorkspace {
  const timestamp = nowIso();
  return {
    id: createId(),
    name: DEFAULT_WORKSPACE_NAME,
    rootTile: createEmptyTile(),
    createdAt: timestamp,
    modifiedAt: timestamp,
    isDefault: true,
  };
}

function getPresetTemplates(): MosaicLayoutPreset[] {
  return [
    {
      id: 'single',
      name: 'Vue unique',
      description: 'Un seul panneau',
      icon: '▣',
      rootTile: createEmptyTile(),
    },
    {
      id: 'side_by_side',
      name: 'Cote a cote',
      description: 'Deux panneaux horizontaux',
      icon: '◫',
      rootTile: createSplitTile('horizontal', [createEmptyTile(), createEmptyTile()]),
    },
    {
      id: 'stacked',
      name: 'Empile',
      description: 'Deux panneaux verticaux',
      icon: '⬒',
      rootTile: createSplitTile('vertical', [createEmptyTile(), createEmptyTile()]),
    },
    {
      id: 'triple_columns',
      name: 'Triple colonnes',
      description: 'Trois panneaux en colonnes',
      icon: '▥',
      rootTile: createSplitTile('horizontal', [
        createEmptyTile(0.33),
        createEmptyTile(0.34),
        createEmptyTile(0.33),
      ]),
    },
    {
      id: 'grid_2x2',
      name: 'Grille 2x2',
      description: 'Quatre panneaux en grille',
      icon: '⊞',
      rootTile: createSplitTile('vertical', [
        createSplitTile('horizontal', [createEmptyTile(), createEmptyTile()]),
        createSplitTile('horizontal', [createEmptyTile(), createEmptyTile()]),
      ]),
    },
    {
      id: 'main_sidebar',
      name: 'Principal + Sidebar',
      description: 'Grand panneau avec sidebar',
      icon: '◧',
      rootTile: createSplitTile('horizontal', [createEmptyTile(0.7), createEmptyTile(0.3)]),
    },
    {
      id: 'developer',
      name: 'Developpeur',
      description: 'Layout ideal pour le developpement',
      icon: '⌘',
      rootTile: createSplitTile('horizontal', [
        createSplitTile('vertical', [createEmptyTile(0.7), createTile({ type: 'terminal', flexFactor: 0.3 })], 0.7),
        createTile({ type: 'devtools', flexFactor: 0.3 }),
      ]),
    },
    {
      id: 'productivity',
      name: 'Productivite',
      description: 'Avec AI et widgets',
      icon: '✧',
      rootTile: createSplitTile('horizontal', [
        createEmptyTile(0.6),
        createSplitTile('vertical', [createTile({ type: 'ai', flexFactor: 0.5 }), createTile({ type: 'widgets', flexFactor: 0.5 })], 0.4),
      ]),
    },
    {
      id: 'focus',
      name: 'Mode Focus',
      description: 'Concentration maximale',
      icon: '◉',
      rootTile: createSplitTile('horizontal', [
        createTile({ type: 'bookmarks', flexFactor: 0.15 }),
        createEmptyTile(0.7),
        createTile({ type: 'history', flexFactor: 0.15 }),
      ]),
    },
  ];
}

const LEGACY_TO_PRESET: Record<MosaicLayoutId, MosaicPresetId> = {
  single: 'single',
  '2-col': 'side_by_side',
  '3-col': 'triple_columns',
  side_by_side: 'side_by_side',
  stacked: 'stacked',
  triple_columns: 'triple_columns',
  grid_2x2: 'grid_2x2',
  main_sidebar: 'main_sidebar',
  developer: 'developer',
  productivity: 'productivity',
  focus: 'focus',
};

function presetToLayoutId(presetId: MosaicPresetId): MosaicLayoutId {
  if (presetId === 'side_by_side') return '2-col';
  if (presetId === 'triple_columns') return '3-col';
  return presetId;
}

function normalizeLayoutId(layout: MosaicLayoutId): MosaicPresetId {
  return LEGACY_TO_PRESET[layout] ?? 'single';
}

function ensureInitialized() {
  if (state.isInitialized) return;

  if (!isBrowser()) {
    const workspace = createDefaultWorkspace();
    state = {
      ...state,
      isInitialized: true,
      workspaces: [workspace],
      activeWorkspaceId: workspace.id,
    };
    return;
  }

  try {
    const rawWorkspaces = window.localStorage.getItem(MOSAIC_WORKSPACES_KEY);
    const rawActiveWorkspaceId = window.localStorage.getItem(MOSAIC_ACTIVE_WORKSPACE_KEY);
    const rawLayout = window.localStorage.getItem(MOSAIC_LAYOUT_KEY);

    const parsedWorkspaces = parsePersistedWorkspaces(rawWorkspaces);
    const workspaces = parsedWorkspaces.length > 0 ? parsedWorkspaces : [createDefaultWorkspace()];
    const activeWorkspaceId =
      rawActiveWorkspaceId && workspaces.some(workspace => workspace.id === rawActiveWorkspaceId)
        ? rawActiveWorkspaceId
        : workspaces[0].id;

    const normalizedLayout = normalizeLayoutFromStorage(rawLayout);
    persistLayout(normalizedLayout);

    state = {
      ...state,
      isInitialized: true,
      workspaces,
      activeWorkspaceId,
    };
  } catch {
    const workspace = createDefaultWorkspace();
    state = {
      ...state,
      isInitialized: true,
      workspaces: [workspace],
      activeWorkspaceId: workspace.id,
    };
  }
}

function normalizeLayoutFromStorage(raw: string | null): MosaicLayoutId {
  if (raw === 'single' || raw === '2-col' || raw === '3-col') return raw;
  if (
    raw === 'side_by_side' ||
    raw === 'stacked' ||
    raw === 'triple_columns' ||
    raw === 'grid_2x2' ||
    raw === 'main_sidebar' ||
    raw === 'developer' ||
    raw === 'productivity' ||
    raw === 'focus'
  ) {
    return raw;
  }
  return 'single';
}

function parsePersistedWorkspaces(rawWorkspaces: string | null): MosaicWorkspace[] {
  if (!rawWorkspaces) return [];
  try {
    const parsed = JSON.parse(rawWorkspaces) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(entry => parseWorkspace(entry))
      .filter((workspace): workspace is MosaicWorkspace => workspace !== null);
  } catch {
    return [];
  }
}

function parseWorkspace(raw: unknown): MosaicWorkspace | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Record<string, unknown>;

  const rootTile = parseTile(candidate.rootTile);
  if (!rootTile) return null;

  const id = typeof candidate.id === 'string' ? candidate.id : createId();
  const name = typeof candidate.name === 'string' && candidate.name.trim() ? candidate.name : 'Workspace';
  const createdAt = typeof candidate.createdAt === 'string' ? candidate.createdAt : nowIso();
  const modifiedAt = typeof candidate.modifiedAt === 'string' ? candidate.modifiedAt : nowIso();

  return {
    id,
    name,
    rootTile,
    createdAt,
    modifiedAt,
    isDefault: Boolean(candidate.isDefault),
  };
}

function parseTile(raw: unknown): MosaicTile | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Record<string, unknown>;
  const type = parseTileType(candidate.type);
  if (!type) return null;

  const childrenRaw = Array.isArray(candidate.children) ? candidate.children : null;
  const children = childrenRaw
    ? childrenRaw.map(child => parseTile(child)).filter((child): child is MosaicTile => child !== null)
    : null;

  const splitDirection = parseSplitDirection(candidate.splitDirection);

  return {
    id: typeof candidate.id === 'string' ? candidate.id : createId(),
    type,
    flexFactor: normalizeFlex(Number(candidate.flexFactor ?? 1)),
    tabId: typeof candidate.tabId === 'string' ? candidate.tabId : null,
    serviceId: typeof candidate.serviceId === 'string' ? candidate.serviceId : null,
    metadata:
      candidate.metadata && typeof candidate.metadata === 'object'
        ? { ...(candidate.metadata as Record<string, unknown>) }
        : {},
    children,
    splitDirection,
    isLocked: Boolean(candidate.isLocked),
    isMinimized: Boolean(candidate.isMinimized),
  };
}

function parseTileType(raw: unknown): MosaicTileType | null {
  if (typeof raw !== 'string') return null;
  const values: MosaicTileType[] = [
    'web',
    'terminal',
    'devtools',
    'widgets',
    'bookmarks',
    'history',
    'downloads',
    'ai',
    'settings',
    'webService',
    'documentation',
    'backendLab',
    'studio',
    'lighthouse',
    'github',
    'extensions',
    'cloudinary',
    'empty',
    'custom',
    'frontendResources',
    'frontendTools',
    'backendLanguages',
    'backendTools',
    'systemMetrics',
    'commandPrompt',
    'serviceStatus',
    'infrastructureMetrics',
    'devopsTools',
    'commandCenter',
    'dataScienceLibraries',
    'dataScienceTools',
    'quickLinks',
    'searchBar',
    'developerQuotes',
    'timeDisplay',
  ];
  return values.includes(raw as MosaicTileType) ? (raw as MosaicTileType) : null;
}

function parseSplitDirection(raw: unknown): SplitDirection | null {
  if (raw === 'horizontal' || raw === 'vertical') return raw;
  return null;
}

function getActiveWorkspaceIndex(): number {
  ensureInitialized();
  if (!state.activeWorkspaceId) return -1;
  return state.workspaces.findIndex(workspace => workspace.id === state.activeWorkspaceId);
}

function getActiveWorkspaceUnsafe(): MosaicWorkspace | null {
  const index = getActiveWorkspaceIndex();
  if (index < 0) return null;
  return state.workspaces[index];
}

function updateActiveWorkspace(
  updater: (workspace: MosaicWorkspace) => MosaicWorkspace,
  options?: { persist?: boolean; layoutChanged?: boolean }
) {
  const index = getActiveWorkspaceIndex();
  if (index < 0) return;
  const nextWorkspaces = state.workspaces.map(workspace => cloneWorkspace(workspace));
  const currentWorkspace = nextWorkspaces[index];
  const updated = updater(currentWorkspace);
  nextWorkspaces[index] = {
    ...updated,
    modifiedAt: nowIso(),
  };
  updateState(
    {
      ...state,
      workspaces: nextWorkspaces,
      activeWorkspaceId: nextWorkspaces[index].id,
    },
    options
  );
}

function updateTileRecursive(
  tile: MosaicTile,
  tileId: string,
  updater: (tile: MosaicTile) => MosaicTile
): MosaicTile {
  if (tile.id === tileId) {
    return updater(cloneTile(tile));
  }
  if (!tile.children || tile.children.length === 0) return cloneTile(tile);
  return {
    ...cloneTile(tile),
    children: tile.children.map(child => updateTileRecursive(child, tileId, updater)),
  };
}

function findTileRecursive(tile: MosaicTile | null, tileId: string): MosaicTile | null {
  if (!tile) return null;
  if (tile.id === tileId) return tile;
  if (!tile.children || tile.children.length === 0) return null;
  for (const child of tile.children) {
    const found = findTileRecursive(child, tileId);
    if (found) return found;
  }
  return null;
}

function removeTileRecursive(tile: MosaicTile, tileIdToRemove: string): MosaicTile | null {
  if (!tile.children || tile.children.length === 0) {
    return cloneTile(tile);
  }

  const nextChildren: MosaicTile[] = [];
  let removed = false;

  for (const child of tile.children) {
    if (child.id === tileIdToRemove) {
      removed = true;
      continue;
    }
    const updated = removeTileRecursive(child, tileIdToRemove);
    if (updated) {
      nextChildren.push(updated);
    }
  }

  if (removed && nextChildren.length === 1) {
    return {
      ...nextChildren[0],
      id: tile.id,
      flexFactor: tile.flexFactor,
    };
  }

  if (nextChildren.length === 0) return null;
  return {
    ...cloneTile(tile),
    children: nextChildren,
  };
}

function getLeafTiles(tile: MosaicTile | null): MosaicTile[] {
  if (!tile) return [];
  if (!tile.children || tile.children.length === 0) return [tile];
  return tile.children.flatMap(child => getLeafTiles(child));
}

function countActiveTilesRecursive(tile: MosaicTile | null): number {
  if (!tile) return 0;
  if (!tile.children || tile.children.length === 0) {
    return tile.type === 'empty' ? 0 : 1;
  }
  return tile.children.reduce((sum, child) => sum + countActiveTilesRecursive(child), 0);
}

export function getMosaicPresets(): MosaicLayoutPreset[] {
  return getPresetTemplates().map(preset => ({
    ...preset,
    rootTile: cloneTile(preset.rootTile),
  }));
}

export function getMosaicState(): MosaicState {
  ensureInitialized();
  return {
    ...state,
    workspaces: state.workspaces.map(workspace => cloneWorkspace(workspace)),
  };
}

export function subscribeToMosaicStateUpdates(listener: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener(MOSAIC_STATE_CHANGED_EVENT, listener);
  return () => {
    window.removeEventListener(MOSAIC_STATE_CHANGED_EVENT, listener);
  };
}

export function getActiveMosaicWorkspace(): MosaicWorkspace | null {
  ensureInitialized();
  const workspace = getActiveWorkspaceUnsafe();
  return workspace ? cloneWorkspace(workspace) : null;
}

export function getMosaicLayout(): MosaicLayoutId {
  ensureInitialized();
  if (!isBrowser()) return 'single';
  return normalizeLayoutFromStorage(window.localStorage.getItem(MOSAIC_LAYOUT_KEY));
}

export function setMosaicLayout(layout: MosaicLayoutId): MosaicLayoutId {
  ensureInitialized();
  const presetId = normalizeLayoutId(layout);
  const preset = getMosaicPresets().find(candidate => candidate.id === presetId);
  if (!preset) return layout;
  applyMosaicPreset(preset.id);
  const effective = presetToLayoutId(preset.id);
  persistLayout(effective);
  dispatchMosaicEvents({ layoutChanged: true });
  return effective;
}

export function subscribeToMosaicLayoutUpdates(listener: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener(MOSAIC_LAYOUT_CHANGED_EVENT, listener);
  return () => {
    window.removeEventListener(MOSAIC_LAYOUT_CHANGED_EVENT, listener);
  };
}

export function toggleMosaic(options?: { activeTabId?: string }) {
  ensureInitialized();
  const nextIsActive = !state.isActive;
  const nextState: MosaicState = {
    ...state,
    isActive: nextIsActive,
  };
  updateState(nextState, { persist: true });
  if (nextIsActive && options?.activeTabId) {
    const activeWorkspace = getActiveWorkspaceUnsafe();
    if (!activeWorkspace) return;
    if (activeWorkspace.rootTile.type === 'empty') {
      setMosaicTileTab(activeWorkspace.rootTile.id, options.activeTabId);
    }
  }
}

export function activateMosaic(options?: { activeTabId?: string }) {
  ensureInitialized();
  if (state.isActive) return;
  updateState({ ...state, isActive: true }, { persist: true });
  if (options?.activeTabId) {
    const activeWorkspace = getActiveWorkspaceUnsafe();
    if (!activeWorkspace) return;
    if (activeWorkspace.rootTile.type === 'empty') {
      setMosaicTileTab(activeWorkspace.rootTile.id, options.activeTabId);
    }
  }
}

export function deactivateMosaic() {
  ensureInitialized();
  if (!state.isActive) return;
  updateState({ ...state, isActive: false }, { persist: true });
}

export function setMosaicVisible(visible: boolean) {
  ensureInitialized();
  if (state.isVisible === visible) return;
  updateState({ ...state, isVisible: visible });
}

export function isMosaicActive(): boolean {
  ensureInitialized();
  return state.isActive && state.isVisible;
}

export function createMosaicWorkspace(name: string, rootTile?: MosaicTile): MosaicWorkspace {
  ensureInitialized();
  const timestamp = nowIso();
  const workspace: MosaicWorkspace = {
    id: createId(),
    name: name.trim() || 'Workspace',
    rootTile: rootTile ? cloneTile(rootTile, true) : createEmptyTile(),
    createdAt: timestamp,
    modifiedAt: timestamp,
    isDefault: false,
  };
  updateState(
    {
      ...state,
      workspaces: [...state.workspaces, workspace],
      activeWorkspaceId: workspace.id,
    },
    { persist: true }
  );
  return cloneWorkspace(workspace);
}

export function deleteMosaicWorkspace(workspaceId: string) {
  ensureInitialized();
  const workspace = state.workspaces.find(entry => entry.id === workspaceId);
  if (!workspace || workspace.isDefault) return;

  const nextWorkspaces = state.workspaces.filter(entry => entry.id !== workspaceId);
  const fallback = nextWorkspaces.find(entry => entry.isDefault) ?? nextWorkspaces[0] ?? createDefaultWorkspace();
  const normalizedWorkspaces = nextWorkspaces.length > 0 ? nextWorkspaces : [fallback];

  updateState(
    {
      ...state,
      workspaces: normalizedWorkspaces,
      activeWorkspaceId:
        state.activeWorkspaceId === workspaceId ? fallback.id : state.activeWorkspaceId ?? fallback.id,
    },
    { persist: true }
  );
}

export function setActiveMosaicWorkspace(workspaceId: string) {
  ensureInitialized();
  if (!state.workspaces.some(workspace => workspace.id === workspaceId)) return;
  if (state.activeWorkspaceId === workspaceId) return;
  updateState({ ...state, activeWorkspaceId: workspaceId }, { persist: true });
}

export function applyMosaicPreset(presetId: MosaicPresetId) {
  ensureInitialized();
  const preset = getMosaicPresets().find(candidate => candidate.id === presetId);
  if (!preset) return;

  updateActiveWorkspace(
    workspace => ({
      ...workspace,
      rootTile: cloneTile(preset.rootTile, true),
    }),
    { persist: true, layoutChanged: true }
  );

  persistLayout(presetToLayoutId(presetId));
}

export function findMosaicTile(tileId: string, startTile?: MosaicTile): MosaicTile | null {
  ensureInitialized();
  const root = startTile ?? getActiveWorkspaceUnsafe()?.rootTile ?? null;
  return findTileRecursive(root, tileId);
}

export function updateMosaicTile(tileId: string, updater: (tile: MosaicTile) => MosaicTile) {
  ensureInitialized();
  updateActiveWorkspace(
    workspace => ({
      ...workspace,
      rootTile: updateTileRecursive(workspace.rootTile, tileId, updater),
    }),
    { persist: true }
  );
}

export function setMosaicTileContent(
  tileId: string,
  type: MosaicTileType,
  options?: { tabId?: string | null; serviceId?: string | null; metadata?: Record<string, unknown> }
) {
  updateMosaicTile(tileId, tile => {
    const isWeb = type === 'web';
    const isWebService = type === 'webService';
    return {
      ...tile,
      type,
      tabId: isWeb ? options?.tabId ?? tile.tabId : null,
      serviceId: isWebService ? options?.serviceId ?? tile.serviceId : null,
      metadata: options?.metadata ? { ...tile.metadata, ...options.metadata } : tile.metadata,
    };
  });
}

export function setMosaicTileTab(tileId: string, tabId: string) {
  setMosaicTileContent(tileId, 'web', { tabId });
}

export function clearMosaicTile(tileId: string) {
  updateMosaicTile(tileId, tile => ({
    ...tile,
    type: 'empty',
    tabId: null,
    serviceId: null,
  }));
}

export function splitMosaicTile(
  tileId: string,
  direction: SplitDirection,
  options?: { newTileType?: MosaicTileType }
) {
  ensureInitialized();
  const tile = findMosaicTile(tileId);
  if (!tile) return;

  const newTile = createTile({ type: options?.newTileType ?? 'empty' });
  updateMosaicTile(tileId, current => {
    if (current.children && current.children.length > 0 && current.splitDirection === direction) {
      return {
        ...current,
        children: [...current.children.map(child => cloneTile(child)), newTile],
      };
    }
    const existingContent = cloneTile(current);
    return {
      ...createSplitTile(direction, [existingContent, newTile], current.flexFactor),
      id: current.id,
    };
  });
}

export function closeMosaicTile(tileId: string) {
  ensureInitialized();
  const workspace = getActiveWorkspaceUnsafe();
  if (!workspace) return;

  if (workspace.rootTile.id === tileId) {
    updateActiveWorkspace(
      current => ({
        ...current,
        rootTile: createEmptyTile(),
      }),
      { persist: true }
    );
    return;
  }

  const newRoot = removeTileRecursive(workspace.rootTile, tileId);
  if (!newRoot) return;
  updateActiveWorkspace(
    current => ({
      ...current,
      rootTile: newRoot,
    }),
    { persist: true }
  );
}

export function swapMosaicTiles(tileIdA: string, tileIdB: string) {
  ensureInitialized();
  const tileA = findMosaicTile(tileIdA);
  const tileB = findMosaicTile(tileIdB);
  if (!tileA || !tileB) return;

  updateMosaicTile(tileIdA, tile => ({
    ...tile,
    type: tileB.type,
    tabId: tileB.tabId,
    serviceId: tileB.serviceId,
    metadata: { ...tileB.metadata },
  }));

  updateMosaicTile(tileIdB, tile => ({
    ...tile,
    type: tileA.type,
    tabId: tileA.tabId,
    serviceId: tileA.serviceId,
    metadata: { ...tileA.metadata },
  }));
}

export function resizeMosaicTiles(parentId: string, childIndex: number, delta: number) {
  updateMosaicTile(parentId, parent => {
    if (!parent.children || childIndex >= parent.children.length - 1) return parent;
    const current = parent.children[childIndex];
    const next = parent.children[childIndex + 1];
    const minSize = 0.1;
    const maxSize = 0.9;
    const nextCurrent = Math.max(minSize, Math.min(maxSize, current.flexFactor + delta));
    const nextFollowing = Math.max(minSize, Math.min(maxSize, next.flexFactor - delta));
    if (nextCurrent + nextFollowing > current.flexFactor + next.flexFactor + 0.01) return parent;

    const children = parent.children.map(child => cloneTile(child));
    children[childIndex] = { ...children[childIndex], flexFactor: nextCurrent };
    children[childIndex + 1] = { ...children[childIndex + 1], flexFactor: nextFollowing };
    return { ...parent, children };
  });
}

export function moveMosaicTile(sourceTileId: string, targetTileId: string, zone: DropZone) {
  ensureInitialized();
  if (sourceTileId === targetTileId) return;

  const sourceTile = findMosaicTile(sourceTileId);
  const targetTile = findMosaicTile(targetTileId);
  if (!sourceTile || !targetTile) return;

  closeMosaicTile(sourceTileId);

  if (zone === 'center') {
    updateMosaicTile(targetTileId, tile => ({
      ...tile,
      type: sourceTile.type,
      tabId: sourceTile.tabId,
      serviceId: sourceTile.serviceId,
      metadata: { ...sourceTile.metadata },
    }));
    return;
  }

  const direction: SplitDirection = zone === 'left' || zone === 'right' ? 'horizontal' : 'vertical';
  const sourceCopy = cloneTile(sourceTile, true);
  const targetCopy = cloneTile(targetTile, true);
  const children =
    zone === 'left' || zone === 'top' ? [sourceCopy, targetCopy] : [targetCopy, sourceCopy];

  updateMosaicTile(targetTileId, tile => ({
    ...createSplitTile(direction, children, tile.flexFactor),
    id: tile.id,
  }));
}

export function setMosaicHoveredTile(tileId: string | null) {
  ensureInitialized();
  if (state.hoveredTileId === tileId) return;
  updateState({ ...state, hoveredTileId: tileId });
}

export function setMosaicFocusedTile(tileId: string | null) {
  ensureInitialized();
  if (state.focusedTileId === tileId) return;
  updateState({ ...state, focusedTileId: tileId });
}

export function setMosaicDragOver(tileId: string | null, zone: DropZone | null) {
  ensureInitialized();
  if (state.dragOverTileId === tileId && state.dragOverZone === zone) return;
  updateState({
    ...state,
    dragOverTileId: tileId,
    dragOverZone: zone,
  });
}

export function toggleMosaicTileMinimize(tileId: string) {
  updateMosaicTile(tileId, tile => ({ ...tile, isMinimized: !tile.isMinimized }));
}

export function toggleMosaicTileLock(tileId: string) {
  updateMosaicTile(tileId, tile => ({ ...tile, isLocked: !tile.isLocked }));
}

export function maximizeMosaicTile(tileId: string) {
  const tile = findMosaicTile(tileId);
  if (!tile) return;
  updateActiveWorkspace(
    workspace => ({
      ...workspace,
      rootTile: {
        ...cloneTile(tile, true),
        flexFactor: 1,
        children: null,
        splitDirection: null,
      },
    }),
    { persist: true }
  );
}

export function countActiveMosaicTiles(tile?: MosaicTile): number {
  ensureInitialized();
  const root = tile ?? getActiveWorkspaceUnsafe()?.rootTile ?? null;
  return countActiveTilesRecursive(root);
}

export function getAllMosaicLeafTiles(tile?: MosaicTile): MosaicTile[] {
  ensureInitialized();
  const root = tile ?? getActiveWorkspaceUnsafe()?.rootTile ?? null;
  return getLeafTiles(root).map(entry => cloneTile(entry));
}

export function assignTabsToMosaicLeaves(
  rootTile: MosaicTile,
  preferredTabIds: string[]
): { rootTile: MosaicTile; usedTabIds: string[] } {
  const assigned = cloneTile(rootTile);
  const leaves = getLeafTiles(assigned);
  const used = new Set<string>();
  const pool = preferredTabIds.filter(tabId => tabId && !used.has(tabId));

  for (const leaf of leaves) {
    if (leaf.type !== 'web') continue;
    if (leaf.tabId && pool.includes(leaf.tabId)) {
      used.add(leaf.tabId);
      continue;
    }
    const next = pool.find(tabId => !used.has(tabId));
    if (!next) {
      leaf.type = 'empty';
      leaf.tabId = null;
      continue;
    }
    leaf.tabId = next;
    used.add(next);
  }

  return { rootTile: assigned, usedTabIds: Array.from(used) };
}

export function resetMosaicStateForTests() {
  state = { ...INITIAL_STATE };
}
