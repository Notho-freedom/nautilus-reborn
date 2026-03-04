export type ViewportMode = 'normal' | 'blocking';

export type ViewportLayoutSource = 'chrome' | 'overlay' | 'panel' | 'dialog';

export interface OcclusionInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ViewportLayoutPayload {
  viewport: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  insets: OcclusionInsets;
  mode: ViewportMode;
  source: ViewportLayoutSource;
}

export type RuntimeMode = 'dual-window' | 'single-window-fallback';
