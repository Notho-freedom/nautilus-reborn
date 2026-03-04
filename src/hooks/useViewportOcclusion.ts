import { RefObject, useEffect, useState } from 'react';
import type { ViewportOcclusionInsets } from './useBrowserState';

const EDGE_THRESHOLD = 24;
const EMPTY_INSETS: ViewportOcclusionInsets = { top: 0, right: 0, bottom: 0, left: 0 };

interface UseViewportOcclusionOptions {
  enabled: boolean;
  viewportRef: RefObject<HTMLElement>;
  baseInsets?: Partial<ViewportOcclusionInsets>;
}

function isVisible(element: HTMLElement): boolean {
  if (element.dataset.state === 'closed') return false;
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || '1') > 0;
}

function intersects(a: DOMRect, b: DOMRect): boolean {
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}

function clampInsets(insets: ViewportOcclusionInsets, width: number, height: number): ViewportOcclusionInsets {
  const left = Math.max(0, Math.min(Math.round(insets.left), width));
  const right = Math.max(0, Math.min(Math.round(insets.right), Math.max(0, width - left)));
  const top = Math.max(0, Math.min(Math.round(insets.top), height));
  const bottom = Math.max(0, Math.min(Math.round(insets.bottom), Math.max(0, height - top)));

  return { top, right, bottom, left };
}

function computeDomOcclusion(viewportRect: DOMRect): ViewportOcclusionInsets {
  const modal = document.querySelector<HTMLElement>('[role="dialog"][data-state="open"]');
  if (modal && isVisible(modal)) {
    return {
      top: viewportRect.height,
      right: 0,
      bottom: 0,
      left: 0,
    };
  }

  const overlays = Array.from(
    document.querySelectorAll<HTMLElement>('[data-occlude-webview="true"]')
  ).filter(isVisible);

  const next: ViewportOcclusionInsets = { ...EMPTY_INSETS };

  for (const overlay of overlays) {
    const rect = overlay.getBoundingClientRect();
    if (!intersects(rect, viewportRect)) continue;

    const touchesTop = rect.top <= viewportRect.top + EDGE_THRESHOLD;
    const touchesLeft = rect.left <= viewportRect.left + EDGE_THRESHOLD;
    const touchesRight = rect.right >= viewportRect.right - EDGE_THRESHOLD;
    const touchesBottom = rect.bottom >= viewportRect.bottom - EDGE_THRESHOLD;

    if (touchesTop) {
      next.top = Math.max(next.top, rect.bottom - viewportRect.top);
    }

    if (touchesLeft) {
      next.left = Math.max(next.left, rect.right - viewportRect.left);
    }

    if (touchesRight) {
      next.right = Math.max(next.right, viewportRect.right - rect.left);
    }

    if (touchesBottom) {
      next.bottom = Math.max(next.bottom, viewportRect.bottom - rect.top);
    }
  }

  return clampInsets(next, viewportRect.width, viewportRect.height);
}

export function useViewportOcclusion({
  enabled,
  viewportRef,
  baseInsets,
}: UseViewportOcclusionOptions): ViewportOcclusionInsets {
  const [insets, setInsets] = useState<ViewportOcclusionInsets>(EMPTY_INSETS);

  useEffect(() => {
    if (!enabled) {
      setInsets(EMPTY_INSETS);
      return;
    }

    let frame = 0;

    const recompute = () => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const viewportRect = viewport.getBoundingClientRect();
        const dynamic = computeDomOcclusion(viewportRect);

        const merged = clampInsets(
          {
            top: Math.max(dynamic.top, baseInsets?.top ?? 0),
            right: Math.max(dynamic.right, baseInsets?.right ?? 0),
            bottom: Math.max(dynamic.bottom, baseInsets?.bottom ?? 0),
            left: Math.max(dynamic.left, baseInsets?.left ?? 0),
          },
          viewportRect.width,
          viewportRect.height
        );

        setInsets(prev => {
          if (
            prev.top === merged.top &&
            prev.right === merged.right &&
            prev.bottom === merged.bottom &&
            prev.left === merged.left
          ) {
            return prev;
          }
          return merged;
        });
      });
    };

    recompute();

    const observer = new MutationObserver(recompute);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-state', 'style', 'class'],
    });

    window.addEventListener('resize', recompute, true);
    window.addEventListener('scroll', recompute, true);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', recompute, true);
      window.removeEventListener('scroll', recompute, true);
      cancelAnimationFrame(frame);
    };
  }, [enabled, viewportRef, baseInsets?.top, baseInsets?.right, baseInsets?.bottom, baseInsets?.left]);

  return insets;
}
