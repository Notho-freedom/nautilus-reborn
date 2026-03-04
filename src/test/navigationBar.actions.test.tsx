import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { NavigationBar } from '@/components/browser/NavigationBar';
import { TooltipProvider } from '@/components/ui/tooltip';

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

  render(
    <TooltipProvider>
      <NavigationBar {...props} />
    </TooltipProvider>
  );
  return props;
}

describe('NavigationBar actions', () => {
  it('opens snapshot popover and triggers both capture actions', async () => {
    const onSnapshotVisible = vi.fn().mockResolvedValue(undefined);
    const onSnapshotFullPage = vi.fn().mockResolvedValue(undefined);
    renderNavigationBar({ onSnapshotVisible, onSnapshotFullPage });

    fireEvent.click(screen.getByRole('button', { name: 'Snapshot' }));
    fireEvent.click(screen.getByText('Capture visible area'));
    await waitFor(() => {
      expect(onSnapshotVisible).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Snapshot' }));
    fireEvent.click(screen.getByText('Capture full page'));
    await waitFor(() => {
      expect(onSnapshotFullPage).toHaveBeenCalledTimes(1);
    });
  });

  it('renders translation button disabled', () => {
    renderNavigationBar();
    expect(screen.getByRole('button', { name: 'Translate (coming soon)' })).toBeDisabled();
  });

  it('applies focus border on URL container without glow/ring classes', () => {
    renderNavigationBar();
    const input = screen.getByPlaceholderText('https://example.com');
    const urlContainer = input.parentElement;
    expect(urlContainer).not.toBeNull();
    expect(urlContainer?.className).toContain('border-transparent');
    expect(urlContainer?.className).toContain('bg-transparent');

    fireEvent.focus(input);
    expect(urlContainer?.className).toContain('border-primary/50');
    expect(urlContainer?.className).toContain('bg-notilus-surface-1');
    expect(urlContainer?.className).not.toContain('ring-');
    expect(urlContainer?.className).not.toContain('glow-primary-sm');
  });

  it('wires action button as tooltip trigger', () => {
    renderNavigationBar();
    expect(screen.getByRole('button', { name: 'Back' })).toHaveAttribute('data-state', 'closed');
  });

  it('renders vertical separator before right-side action group', () => {
    renderNavigationBar();
    expect(screen.getByTestId('nav-right-separator')).toBeInTheDocument();
  });

  it('keeps URL action icons neutral (no primary tint)', () => {
    renderNavigationBar();
    expect(screen.getByRole('button', { name: 'Add favorite' }).className).not.toContain('text-primary');
    expect(screen.getByRole('button', { name: 'Pin tab' }).className).not.toContain('text-primary');
    expect(screen.getByRole('button', { name: 'Snapshot' }).className).not.toContain('text-primary');
  });

  it('selects full URL text on focus', async () => {
    renderNavigationBar();
    const input = screen.getByPlaceholderText('https://example.com') as HTMLInputElement;
    fireEvent.focus(input);
    await waitFor(() => {
      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe(input.value.length);
    });
    expect(input.className).toContain('selection:bg-primary');
  });

  it('renders settings button after profile', () => {
    renderNavigationBar();
    const allButtons = screen.getAllByRole('button');
    const profileIdx = allButtons.findIndex(button => button.getAttribute('aria-label') === 'Profile');
    const settingsIdx = allButtons.findIndex(button => button.getAttribute('aria-label') === 'Settings');

    expect(profileIdx).toBeGreaterThan(-1);
    expect(settingsIdx).toBe(profileIdx + 1);
  });

  it('uses tooltip mode and removes native title attributes', () => {
    renderNavigationBar();
    const back = screen.getByRole('button', { name: 'Back' });
    const snapshot = screen.getByRole('button', { name: 'Snapshot' });

    expect(back).not.toHaveAttribute('title');
    expect(snapshot).not.toHaveAttribute('title');
    expect(back).toHaveAttribute('data-state', 'closed');
  });
});
