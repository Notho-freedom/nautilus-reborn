import { useCallback, useEffect } from 'react';
import type { ExternalOverlayEvent, ExternalOverlayState } from '../../shared/overlay-contract';
import {
  desktopClearOverlay,
  desktopSetOverlayState,
  onDesktopOverlayEvent,
} from '@/lib/electronBridge';

interface UseExternalOverlayBridgeOptions {
  enabled: boolean;
  tabId: string | null;
  onEvent?: (event: ExternalOverlayEvent) => void;
}

export function useExternalOverlayBridge({
  enabled,
  tabId,
  onEvent,
}: UseExternalOverlayBridgeOptions) {
  useEffect(() => {
    if (!enabled) return;
    return onDesktopOverlayEvent(event => {
      if (!tabId) return;
      if (event.tabId !== tabId) return;
      onEvent?.(event);
    });
  }, [enabled, tabId, onEvent]);

  const setState = useCallback(
    (payload: Omit<ExternalOverlayState, 'tabId'>) => {
      if (!enabled || !tabId) return;
      void desktopSetOverlayState({
        tabId,
        overlays: payload.overlays,
        blocking: payload.blocking,
      });
    },
    [enabled, tabId]
  );

  const clear = useCallback(() => {
    if (!enabled) return;
    void desktopClearOverlay();
  }, [enabled]);

  return {
    setState,
    clear,
  };
}
