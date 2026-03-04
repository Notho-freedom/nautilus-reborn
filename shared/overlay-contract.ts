export type ExternalOverlayKind = 'menu' | 'dialog';
export type OverlaySource = 'top-chrome' | 'navigation' | 'context';

export interface OverlayAnchorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExternalOverlayMenuItem {
  id: string;
  label: string;
  disabled?: boolean;
  tone?: 'default' | 'danger';
}

export interface ExternalOverlayMenu {
  id: string;
  kind: 'menu';
  source: OverlaySource;
  anchor: OverlayAnchorRect;
  width?: number;
  items: ExternalOverlayMenuItem[];
}

export interface ExternalOverlayDialogRow {
  id: string;
  section: 'open' | 'recent';
  title: string;
  domain: string;
}

export interface ExternalOverlayDialog {
  id: string;
  kind: 'dialog';
  source: OverlaySource;
  title: string;
  query: string;
  placeholder?: string;
  rows: ExternalOverlayDialogRow[];
  frame: { x: number; y: number; width: number; height: number };
}

export type ExternalOverlay = ExternalOverlayMenu | ExternalOverlayDialog;

export interface ExternalOverlayState {
  tabId: string | null;
  overlays: ExternalOverlay[];
  blocking: boolean;
}

export interface ExternalOverlayEvent {
  tabId: string;
  overlayId: string;
  action: string;
  value?: string;
}
