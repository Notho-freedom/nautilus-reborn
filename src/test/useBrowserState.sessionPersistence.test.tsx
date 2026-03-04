import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useBrowserState } from '@/hooks/useBrowserState';

describe('useBrowserState panel layout', () => {
  it('stores sidebar panel width and occlusion insets', () => {
    const { result } = renderHook(() => useBrowserState());

    act(() => {
      result.current.setSidebarPanel('history');
      result.current.setSidebarOpen(true);
    });

    act(() => {
      result.current.setSidebarPanelWidth(412);
    });

    expect(result.current.sidebarPanelWidth).toBe(412);

    act(() => {
      result.current.setViewportOcclusionInsets({ top: 12, right: 3, bottom: 2, left: 44 });
    });

    expect(result.current.viewportOcclusionInsets).toEqual({ top: 12, right: 3, bottom: 2, left: 44 });
  });
});
