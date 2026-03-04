import { describe, expect, it } from 'vitest';
import {
  desktopGetState,
  desktopSetPinnedTabs,
  getDesktopBridge,
  isDesktopRuntime,
  onDesktopStateChanged,
} from '@/lib/electronBridge';

describe('electronBridge fallback', () => {
  it('returns null bridge in web runtime', () => {
    delete window.notilusDesktop;
    expect(getDesktopBridge()).toBeNull();
    expect(isDesktopRuntime()).toBe(false);
  });

  it('returns null snapshot when desktop bridge is unavailable', async () => {
    delete window.notilusDesktop;
    await expect(desktopGetState()).resolves.toBeNull();
    await expect(desktopSetPinnedTabs({ tabIds: [] })).resolves.toBeUndefined();
  });

  it('returns noop unsubscribe when desktop bridge is unavailable', () => {
    delete window.notilusDesktop;
    const unsubscribe = onDesktopStateChanged(() => {});
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });
});
