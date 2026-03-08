export type MosaicTileType =
  | 'web'
  | 'terminal'
  | 'devtools'
  | 'widgets'
  | 'bookmarks'
  | 'history'
  | 'downloads'
  | 'ai'
  | 'settings'
  | 'webService'
  | 'documentation'
  | 'backendLab'
  | 'studio'
  | 'lighthouse'
  | 'github'
  | 'extensions'
  | 'cloudinary'
  | 'empty'
  | 'custom'
  | 'frontendResources'
  | 'frontendTools'
  | 'backendLanguages'
  | 'backendTools'
  | 'systemMetrics'
  | 'commandPrompt'
  | 'serviceStatus'
  | 'infrastructureMetrics'
  | 'devopsTools'
  | 'commandCenter'
  | 'dataScienceLibraries'
  | 'dataScienceTools'
  | 'quickLinks'
  | 'searchBar'
  | 'developerQuotes'
  | 'timeDisplay';

export type SplitDirection = 'horizontal' | 'vertical';

export type DropZone = 'left' | 'right' | 'top' | 'bottom' | 'center';

export interface MosaicTile {
  id: string;
  type: MosaicTileType;
  flexFactor: number;
  tabId: string | null;
  serviceId: string | null;
  metadata: Record<string, unknown>;
  children: MosaicTile[] | null;
  splitDirection: SplitDirection | null;
  isLocked: boolean;
  isMinimized: boolean;
}

export interface MosaicDragData {
  tile: MosaicTile;
  sourceTileId: string;
}

export type MosaicPresetId =
  | 'single'
  | 'side_by_side'
  | 'stacked'
  | 'triple_columns'
  | 'grid_2x2'
  | 'main_sidebar'
  | 'developer'
  | 'productivity'
  | 'focus';

// Kept for backward compatibility with old 2/3 pane API in V2.
export type MosaicLayoutId = MosaicPresetId | '2-col' | '3-col';

export interface MosaicLayoutPreset {
  id: MosaicPresetId;
  name: string;
  description: string;
  icon: string;
  rootTile: MosaicTile;
}

export interface MosaicWorkspace {
  id: string;
  name: string;
  rootTile: MosaicTile;
  createdAt: string;
  modifiedAt: string;
  isDefault: boolean;
}

export interface MosaicState {
  isInitialized: boolean;
  isActive: boolean;
  isVisible: boolean;
  activeWorkspaceId: string | null;
  workspaces: MosaicWorkspace[];
  hoveredTileId: string | null;
  focusedTileId: string | null;
  dragOverTileId: string | null;
  dragOverZone: DropZone | null;
}

export const MOSAIC_TILE_LABELS: Record<MosaicTileType, string> = {
  web: 'Page Web',
  terminal: 'Terminal',
  devtools: 'DevTools',
  widgets: 'Widgets',
  bookmarks: 'Favoris',
  history: 'Historique',
  downloads: 'Telechargements',
  ai: 'Assistant IA',
  settings: 'Parametres',
  webService: 'Service Web',
  documentation: 'Documentation',
  backendLab: 'Backend Lab',
  studio: 'Studio',
  lighthouse: 'Lighthouse',
  github: 'GitHub',
  extensions: 'Extensions',
  cloudinary: 'Cloudinary',
  empty: 'Vide',
  custom: 'Personnalise',
  frontendResources: 'Ressources Frontend',
  frontendTools: 'Outils Frontend',
  backendLanguages: 'Langages Backend',
  backendTools: 'Outils Backend',
  systemMetrics: 'Metriques Systeme',
  commandPrompt: 'Invite Commande',
  serviceStatus: 'Statut Services',
  infrastructureMetrics: 'Metriques Infrastructure',
  devopsTools: 'Outils DevOps',
  commandCenter: 'Centre Commande',
  dataScienceLibraries: 'Librairies Data Science',
  dataScienceTools: 'Outils Data Science',
  quickLinks: 'Liens Rapides',
  searchBar: 'Barre Recherche',
  developerQuotes: 'Citations Developpeur',
  timeDisplay: 'Affichage Heure',
};

export const MOSAIC_TILE_ORDER: MosaicTileType[] = [
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
