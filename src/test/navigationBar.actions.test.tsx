import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { NavigationBar } from '@/components/browser/NavigationBar';

function renderNavigationBar(overrides?: Partial<ComponentProps<typeof NavigationBar>>) {
  const props: ComponentProps<typeof NavigationBar> = {
    url: 'https://example.com',
    onNavigate: vi.fn(),
    onHome: vi.fn(),
    onBack: vi.fn(),
    onForward: vi.fn(),
    onReload: vi.fn(),
    canGoBack: true,
    canGoForward: true,
    isLoading: false,
    isBookmarked: false,
    onToggleBookmark: vi.fn(),
    onTogglePin: vi.fn(),
    isPinned: false,
    onSnapshotVisible: vi.fn().mockResolvedValue(undefined),
    onSnapshotFullPage: vi.fn().mockResolvedValue(undefined),
    onSendToFlou: vi.fn(),
    adBlockEnabled: true,
    onToggleAdBlock: vi.fn(),
    onOpenExtensions: vi.fn(),
    onOpenDownloads: vi.fn(),
    onToggleAI: vi.fn(),
    ...overrides,
  };

  render(<NavigationBar {...props} />);
  return props;
}

describe('NavigationBar actions', () => {
  it('opens snapshot popover and triggers both capture actions', async () => {
    const onSnapshotVisible = vi.fn().mockResolvedValue(undefined);
    const onSnapshotFullPage = vi.fn().mockResolvedValue(undefined);
    renderNavigationBar({ onSnapshotVisible, onSnapshotFullPage });

    fireEvent.click(screen.getByTitle('Snapshot'));
    fireEvent.click(screen.getByText('Capture visible area'));
    await waitFor(() => {
      expect(onSnapshotVisible).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByTitle('Snapshot'));
    fireEvent.click(screen.getByText('Capture full page'));
    await waitFor(() => {
      expect(onSnapshotFullPage).toHaveBeenCalledTimes(1);
    });
  });

  it('renders translation button disabled', () => {
    renderNavigationBar();
    expect(screen.getByTitle('Translate (coming soon)')).toBeDisabled();
  });

  it('applies focus border on URL container without glow/ring classes', () => {
    renderNavigationBar();
    const input = screen.getByPlaceholderText('https://example.com');
    const urlContainer = input.parentElement;
    expect(urlContainer).not.toBeNull();
    expect(urlContainer?.className).toContain('border-transparent');

    fireEvent.focus(input);
    expect(urlContainer?.className).toContain('border-primary/50');
    expect(urlContainer?.className).not.toContain('ring-');
    expect(urlContainer?.className).not.toContain('glow-primary-sm');
  });
});
