import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useViewportOcclusion } from '@/hooks/useViewportOcclusion';

function rect(x: number, y: number, width: number, height: number): DOMRect {
  return {
    x,
    y,
    width,
    height,
    top: y,
    right: x + width,
    bottom: y + height,
    left: x,
    toJSON: () => ({}),
  } as DOMRect;
}

describe('useViewportOcclusion', () => {
  it('applies base left inset and top occlusion for chrome overlays', async () => {
    const viewport = document.createElement('div');
    viewport.getBoundingClientRect = () => rect(100, 100, 800, 500);
    document.body.appendChild(viewport);

    const overlay = document.createElement('div');
    overlay.setAttribute('data-occlude-webview', 'true');
    overlay.setAttribute('data-state', 'open');
    overlay.getBoundingClientRect = () => rect(120, 100, 220, 90);
    document.body.appendChild(overlay);

    const viewportRef = { current: viewport };

    const { result, unmount } = renderHook(() =>
      useViewportOcclusion({ enabled: true, viewportRef, baseInsets: { left: 160 } })
    );

    await waitFor(() => {
      expect(result.current.left).toBeGreaterThanOrEqual(160);
      expect(result.current.top).toBeGreaterThan(0);
    });

    unmount();
    overlay.remove();
    viewport.remove();
  });

  it('hides the webview area when a dialog is open', async () => {
    const viewport = document.createElement('div');
    viewport.getBoundingClientRect = () => rect(0, 0, 640, 360);
    document.body.appendChild(viewport);

    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('data-state', 'open');
    dialog.getBoundingClientRect = () => rect(100, 40, 400, 280);
    document.body.appendChild(dialog);

    const viewportRef = { current: viewport };

    const { result, unmount } = renderHook(() =>
      useViewportOcclusion({ enabled: true, viewportRef })
    );

    await waitFor(() => {
      expect(result.current.top).toBe(360);
    });

    unmount();
    dialog.remove();
    viewport.remove();
  });
});
