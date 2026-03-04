import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SpeedDial } from '@/components/browser/SpeedDial';
import { DEFAULT_WALLPAPERS } from '@/lib/defaultWallpapers';
import { initializeSettings, resetSettings, updateSettings } from '@/lib/settings';

const STORAGE_KEY = 'notilus_v2_speed_dial_wallpaper';

describe('SpeedDial wallpapers', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetSettings();
    initializeSettings();
    vi.restoreAllMocks();
  });

  it('selects and persists a default wallpaper in modern home style', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    render(<SpeedDial onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('speed-dial-wallpaper-image')).toBeInTheDocument();
    });
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(DEFAULT_WALLPAPERS[0]);
    expect(screen.getByTestId('speed-dial-wallpaper-image')).toHaveAttribute(
      'src',
      DEFAULT_WALLPAPERS[0]
    );
  });

  it('replaces invalid persisted wallpaper with a valid default entry', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'https://invalid.example.com/wallpaper.jpg');
    vi.spyOn(Math, 'random').mockReturnValue(0);

    render(<SpeedDial onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe(DEFAULT_WALLPAPERS[0]);
    });
    expect(screen.getByTestId('speed-dial-wallpaper-image')).toHaveAttribute(
      'src',
      DEFAULT_WALLPAPERS[0]
    );
  });

  it('disables wallpaper image for non-modern home styles', () => {
    updateSettings({ homePageStyle: 'minimal' });

    render(<SpeedDial onNavigate={vi.fn()} />);

    expect(screen.queryByTestId('speed-dial-wallpaper-image')).not.toBeInTheDocument();
    expect(screen.getByTestId('speed-dial-gradient-overlay')).toBeInTheDocument();
  });

  it('falls back to gradient when wallpaper image fails to load', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    render(<SpeedDial onNavigate={vi.fn()} />);

    const wallpaper = await screen.findByTestId('speed-dial-wallpaper-image');
    fireEvent.error(wallpaper);

    await waitFor(() => {
      expect(screen.queryByTestId('speed-dial-wallpaper-image')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('speed-dial-gradient-overlay')).toBeInTheDocument();
  });
});
