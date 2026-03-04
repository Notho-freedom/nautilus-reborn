import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_WALLPAPERS,
  isDefaultWallpaperUrl,
  pickRandomDefaultWallpaper,
  resolveInitialWallpaper,
} from '@/lib/defaultWallpapers';

describe('defaultWallpapers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('contains exactly 48 default cloudinary wallpapers', () => {
    expect(DEFAULT_WALLPAPERS).toHaveLength(48);
  });

  it('validates default wallpaper urls', () => {
    expect(isDefaultWallpaperUrl(DEFAULT_WALLPAPERS[0])).toBe(true);
    expect(isDefaultWallpaperUrl('https://invalid.example.com/wallpaper.jpg')).toBe(false);
  });

  it('resolves persisted wallpaper when valid', () => {
    const stored = DEFAULT_WALLPAPERS[12];
    expect(resolveInitialWallpaper(stored)).toBe(stored);
  });

  it('regenerates wallpaper when persisted value is invalid', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const next = resolveInitialWallpaper('https://invalid.example.com/wallpaper.jpg');
    expect(next).toBe(DEFAULT_WALLPAPERS[0]);
  });

  it('picks a wallpaper from the known list', () => {
    const picked = pickRandomDefaultWallpaper();
    expect(DEFAULT_WALLPAPERS.includes(picked)).toBe(true);
  });
});
