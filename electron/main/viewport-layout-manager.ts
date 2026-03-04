import type { Rectangle } from 'electron';
import type { ViewportBounds } from '../../shared/browser-contract';
import type { ViewportLayoutPayload } from '../../shared/viewport-contract';
import { TabManager } from './tab-manager';
import { WindowStackManager } from './window-stack-manager';

interface ComputedViewportLayout {
  singleWindowViewBounds: ViewportBounds;
  dualWindowBounds: Rectangle;
  dualWindowViewBounds: ViewportBounds;
  shouldShowContentWindow: boolean;
}

const DEFAULT_PAYLOAD: ViewportLayoutPayload = {
  viewport: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
  mode: 'normal',
  source: 'chrome',
};

function toSafeInt(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.floor(value);
}

function clampNonNegative(value: number): number {
  return Math.max(0, toSafeInt(value));
}

function sanitizePayload(payload: ViewportLayoutPayload): ViewportLayoutPayload {
  return {
    viewport: {
      x: clampNonNegative(payload.viewport.x),
      y: clampNonNegative(payload.viewport.y),
      width: clampNonNegative(payload.viewport.width),
      height: clampNonNegative(payload.viewport.height),
    },
    insets: {
      top: clampNonNegative(payload.insets.top),
      right: clampNonNegative(payload.insets.right),
      bottom: clampNonNegative(payload.insets.bottom),
      left: clampNonNegative(payload.insets.left),
    },
    mode: payload.mode,
    source: payload.source,
  };
}

export function computeViewportLayout(
  chromeContentBounds: Rectangle,
  rawPayload: ViewportLayoutPayload
): ComputedViewportLayout {
  const payload = sanitizePayload(rawPayload);
  const x = payload.viewport.x + payload.insets.left;
  const y = payload.viewport.y + payload.insets.top;
  const width = payload.viewport.width - payload.insets.left - payload.insets.right;
  const height = payload.viewport.height - payload.insets.top - payload.insets.bottom;

  const validBounds = width > 0 && height > 0;
  const shouldShowContentWindow = payload.mode !== 'blocking' && validBounds;

  const singleWindowViewBounds: ViewportBounds = {
    x: clampNonNegative(x),
    y: clampNonNegative(y),
    width: clampNonNegative(width),
    height: clampNonNegative(height),
  };

  const dualWidth = clampNonNegative(width);
  const dualHeight = clampNonNegative(height);
  const dualWindowBounds: Rectangle = {
    x: clampNonNegative(chromeContentBounds.x + x),
    y: clampNonNegative(chromeContentBounds.y + y),
    width: dualWidth,
    height: dualHeight,
  };

  const dualWindowViewBounds: ViewportBounds = {
    x: 0,
    y: 0,
    width: dualWidth,
    height: dualHeight,
  };

  return {
    singleWindowViewBounds,
    dualWindowBounds,
    dualWindowViewBounds,
    shouldShowContentWindow,
  };
}

interface ViewportLayoutManagerOptions {
  windowStack: WindowStackManager;
  tabManager: TabManager;
  debug: boolean;
}

export class ViewportLayoutManager {
  private payload: ViewportLayoutPayload = DEFAULT_PAYLOAD;
  private rafScheduled = false;
  private readonly disposeFns: Array<() => void> = [];

  constructor(private readonly options: ViewportLayoutManagerOptions) {
    const schedule = () => this.scheduleApply();
    const chromeWindow = this.options.windowStack.getChromeWindow();

    chromeWindow.on('move', schedule);
    chromeWindow.on('resize', schedule);
    chromeWindow.on('maximize', schedule);
    chromeWindow.on('unmaximize', schedule);
    chromeWindow.on('show', schedule);
    chromeWindow.on('restore', schedule);

    const unsubscribeRuntime = this.options.windowStack.onRuntimeModeChanged(schedule);
    this.disposeFns.push(unsubscribeRuntime);
  }

  dispose(): void {
    for (const dispose of this.disposeFns) {
      dispose();
    }
    this.disposeFns.length = 0;
  }

  setLayout(payload: ViewportLayoutPayload): void {
    this.payload = sanitizePayload(payload);
    this.scheduleApply();
  }

  reapply(): void {
    this.scheduleApply();
  }

  private scheduleApply(): void {
    if (this.rafScheduled) return;
    this.rafScheduled = true;
    setTimeout(() => {
      this.rafScheduled = false;
      this.apply();
    }, 16);
  }

  private apply(): void {
    const chromeWindow = this.options.windowStack.getChromeWindow();
    if (chromeWindow.isDestroyed()) return;

    const chromeBounds = chromeWindow.getContentBounds();
    const computed = computeViewportLayout(chromeBounds, this.payload);
    const activeExternalVisible = this.options.tabManager.hasActiveExternalTab();

    if (this.options.windowStack.getRuntimeMode() === 'dual-window') {
      this.options.tabManager.setViewportBounds(computed.dualWindowViewBounds);
      this.options.windowStack.applyContentLayout(
        computed.dualWindowBounds,
        computed.shouldShowContentWindow && activeExternalVisible
      );
    } else {
      this.options.tabManager.setViewportBounds(computed.singleWindowViewBounds);
    }

    this.log(
      `apply source=${this.payload.source} mode=${this.payload.mode} runtime=${this.options.windowStack.getRuntimeMode()} visible=${computed.shouldShowContentWindow && activeExternalVisible}`
    );
  }

  private log(message: string): void {
    if (!this.options.debug && process.env.NOTILUS_OVERLAY_DEBUG !== '1') return;
    console.info(`[viewport-layout] ${message}`);
  }
}
