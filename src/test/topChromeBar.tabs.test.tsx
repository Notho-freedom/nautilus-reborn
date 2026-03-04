import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TopChromeBar } from '@/components/browser/TopChromeBar';
import type { BrowserTab } from '@/hooks/useBrowserState';
import { TooltipProvider } from '@/components/ui/tooltip';

function renderTopChromeBar(
  tabs: BrowserTab[],
  overrides: Partial<ComponentProps<typeof TopChromeBar>> = {}
) {
  const props = {
    tabs,
    activeTabId: tabs[0]?.id ?? '',
    onSelectTab: vi.fn(),
    onCloseTab: vi.fn(),
    onAddTab: vi.fn(),
    onDuplicateTab: vi.fn(),
    onTogglePinTab: vi.fn(),
    recentlyClosedTabs: [],
    onReopenClosedTab: vi.fn(),
    onClearClosedTabs: vi.fn(),
    ...overrides,
  };
  render(
    <TooltipProvider>
      <TopChromeBar {...props} />
    </TooltipProvider>
  );
  return props;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TopChromeBar tabs behavior', () => {
  it('keeps regular tab titles rendered, separates pinned tabs and uses layout-grid fallback for internal tabs', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          width: 1200,
          height: 40,
          top: 0,
          left: 0,
          right: 1200,
          bottom: 40,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect
    );

    const tabs: BrowserTab[] = [
      { id: 'tab-1', title: 'Speed Dial', url: 'notilus://speed-dial', kind: 'internal' },
      { id: 'tab-2', title: 'Pinned tab', url: 'https://pinned.example', isPinned: true },
      { id: 'tab-3', title: 'Regular beta', url: 'https://beta.example' },
    ];

    renderTopChromeBar(tabs);

    expect(screen.getByTestId('pinned-tab-tab-2')).toBeInTheDocument();
    expect(screen.queryByTestId('tab-button-tab-2')).not.toBeInTheDocument();
    const regularTitle = screen.getByText('Speed Dial');
    expect(regularTitle).toBeInTheDocument();
    expect(regularTitle.className).not.toContain('pr-4');
    expect(screen.getByText('Regular beta')).toBeInTheDocument();
    const logo = screen.getByAltText('Notilus');
    expect(logo).toBeInTheDocument();
    expect(logo.className).toContain('w-[22px]');
    expect(screen.queryByText('NOTILUS')).not.toBeInTheDocument();

    const pinned = screen.getByTestId('pinned-tab-tab-2');
    expect(pinned.className).not.toContain('border');
    expect(pinned.className).not.toContain('bg-');
    expect(screen.getByTestId('tab-button-tab-1').querySelector('.lucide-layout-grid')).not.toBeNull();
  });

  it('hides tab name when tab display reaches icon-only threshold', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          width: 120,
          height: 40,
          top: 0,
          left: 0,
          right: 120,
          bottom: 40,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect
    );

    const tabs: BrowserTab[] = [
      { id: 'tab-1', title: 'Very long title alpha', url: 'https://alpha.example' },
      { id: 'tab-2', title: 'Very long title beta', url: 'https://beta.example' },
      { id: 'tab-3', title: 'Very long title gamma', url: 'https://gamma.example' },
      { id: 'tab-4', title: 'Very long title delta', url: 'https://delta.example' },
    ];

    renderTopChromeBar(tabs);

    expect(screen.queryByText('Very long title alpha')).not.toBeInTheDocument();
  });

  it('opens hover panel with other tabs and switches on click', async () => {
    const tabs: BrowserTab[] = [
      { id: 'tab-1', title: 'Google Search', url: 'https://www.google.com/search?q=nautilus' },
      { id: 'tab-2', title: 'Gmail', url: 'https://mail.google.com/mail/u/0/#inbox' },
      { id: 'tab-3', title: 'GitHub', url: 'https://github.com' },
    ];

    const props = renderTopChromeBar(tabs);
    const firstTabButton = screen.getByTestId('tab-button-tab-1');

    fireEvent.mouseEnter(firstTabButton);
    fireEvent.pointerEnter(firstTabButton);

    await waitFor(() => {
      expect(screen.getByTestId('hover-tab-item-tab-1-tab-2')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('hover-tab-item-tab-1-tab-3')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('hover-tab-item-tab-1-tab-2'));
    expect(props.onSelectTab).toHaveBeenCalledWith('tab-2');
  });

  it('uses native title attributes for top chrome actions when external mode is active', () => {
    const tabs: BrowserTab[] = [
      { id: 'tab-1', title: 'Google', url: 'https://google.com' },
    ];
    renderTopChromeBar(tabs, { useNativeTitleMode: true });

    expect(screen.getByRole('button', { name: 'Search tabs' })).toHaveAttribute('title', 'Search tabs');
    expect(screen.getByRole('button', { name: 'New tab' })).toHaveAttribute('title', 'New tab');
  });

  it('uses tooltip mode and removes native title attributes when not in external mode', () => {
    const tabs: BrowserTab[] = [
      { id: 'tab-1', title: 'Speed Dial', url: 'notilus://speed-dial', kind: 'internal' },
    ];
    renderTopChromeBar(tabs, { useNativeTitleMode: false });

    expect(screen.getByRole('button', { name: 'Search tabs' })).not.toHaveAttribute('title');
    expect(screen.getByRole('button', { name: 'New tab' })).not.toHaveAttribute('title');
  });
});
