import { RefObject, useEffect } from 'react';
import type { OcclusionInsets, ViewportLayoutPayload, ViewportMode } from '../../shared/viewport-contract';

interface UseViewportOcclusionOptions {
  enabled: boolean;
  viewportRef: RefObject<HTMLElement>;
  onLayoutChange: (payload: ViewportLayoutPayload) => void;
}

function isVisibleElement(node: Element): node is HTMLElement {
  if (!(node instanceof HTMLElement)) return false;
  if (node.offsetWidth <= 0 || node.offsetHeight <= 0) return false;
  const style = window.getComputedStyle(node);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  return true;
}

function clampInset(value: number, max: number): number {
  return Math.max(0, Math.min(Math.floor(value), Math.max(0, Math.floor(max))));
}

function computeInsets(viewport: DOMRect, overlays: HTMLElement[]): OcclusionInsets {
  let left = 0;
  let right = 0;
  let top = 0;
  let bottom = 0;

  for (const overlay of overlays) {
    const rect = overlay.getBoundingClientRect();
    const intersects =
      rect.left < viewport.right &&
      rect.right > viewport.left &&
      rect.top < viewport.bottom &&
      rect.bottom > viewport.top;
    if (!intersects) continue;

    if (rect.left <= viewport.left) {
      left = Math.max(left, rect.right - viewport.left);
    }
    if (rect.right >= viewport.right) {
      right = Math.max(right, viewport.right - rect.left);
    }
    if (rect.top <= viewport.top) {
      top = Math.max(top, rect.bottom - viewport.top);
    }
    if (rect.bottom >= viewport.bottom) {
      bottom = Math.max(bottom, viewport.bottom - rect.top);
    }
  }

  return {
    left: clampInset(left, viewport.width),
    right: clampInset(right, viewport.width),
    top: clampInset(top, viewport.height),
    bottom: clampInset(bottom, viewport.height),
  };
}

function hasBlockingOverlay(overlays: HTMLElement[]): boolean {
  return overlays.some(node => node.dataset.occlusionMode === 'blocking');
}

export function useViewportOcclusion({
  enabled,
  viewportRef,
  onLayoutChange,
}: UseViewportOcclusionOptions): void {
  useEffect(() => {
    if (!enabled) return;

    let frameId = 0;
    let lastSignature = '';
    const resizeObserver = new ResizeObserver(() => {
      schedule();
    });
    const mutationObserver = new MutationObserver(() => {
      schedule();
    });

    const schedule = () => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(flush);
    };

    const flush = () => {
      frameId = 0;
      const viewportNode = viewportRef.current;
      if (!viewportNode) return;
      const viewportRect = viewportNode.getBoundingClientRect();

      const overlayNodes = Array.from(
        document.querySelectorAll('[data-occluding-overlay="true"]')
      ).filter(isVisibleElement);
      const mode: ViewportMode = hasBlockingOverlay(overlayNodes) ? 'blocking' : 'normal';
      const insets = computeInsets(viewportRect, overlayNodes);

      const payload: ViewportLayoutPayload = {
        viewport: {
          x: Math.round(viewportRect.left),
          y: Math.round(viewportRect.top),
          width: Math.round(viewportRect.width),
          height: Math.round(viewportRect.height),
        },
        insets,
        mode,
        source: mode === 'blocking' ? 'dialog' : 'overlay',
      };

      const signature = JSON.stringify(payload);
      if (signature === lastSignature) return;
      lastSignature = signature;
      onLayoutChange(payload);
    };

    const viewportNode = viewportRef.current;
    if (viewportNode) {
      resizeObserver.observe(viewportNode);
    }
    mutationObserver.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'data-state', 'data-side', 'hidden', 'open'],
    });

    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    schedule();

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
    };
  }, [enabled, viewportRef, onLayoutChange]);
}
