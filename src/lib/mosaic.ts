export type MosaicLayoutId = 'single' | '2-col' | '3-col';

const MOSAIC_LAYOUT_KEY = 'notilus_mosaic_layout';
const MOSAIC_LAYOUT_CHANGED_EVENT = 'notilus:mosaic-layout-changed';

function dispatchMosaicLayoutChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(MOSAIC_LAYOUT_CHANGED_EVENT));
}

export function getMosaicLayout(): MosaicLayoutId {
  if (typeof window === 'undefined') return 'single';
  const raw = window.localStorage.getItem(MOSAIC_LAYOUT_KEY);
  if (raw === 'single' || raw === '2-col' || raw === '3-col') return raw;
  return 'single';
}

export function setMosaicLayout(layout: MosaicLayoutId): MosaicLayoutId {
  if (typeof window === 'undefined') return layout;
  window.localStorage.setItem(MOSAIC_LAYOUT_KEY, layout);
  dispatchMosaicLayoutChanged();
  return layout;
}

export function subscribeToMosaicLayoutUpdates(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(MOSAIC_LAYOUT_CHANGED_EVENT, listener);
  return () => {
    window.removeEventListener(MOSAIC_LAYOUT_CHANGED_EVENT, listener);
  };
}
