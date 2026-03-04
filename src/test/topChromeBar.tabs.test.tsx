import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TopChromeBar } from '@/components/browser/TopChromeBar';
import type { BrowserTab } from '@/hooks/useBrowserState';
import { TooltipProvider } from '@/components/ui/tooltip';

function renderTopChromeBar(tabs: BrowserTab[]) {
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
  };
  render(
    <TooltipProvider>
      <TopChromeBar {...props} />
    </TooltipProvider>
  );
  return props;
}

describe('TopChromeBar tabs behavior', () => {
  it('keeps regular tab titles rendered and separates pinned tabs', () => {
    const tabs: BrowserTab[] = [
      { id: 'tab-1', title: 'Regular long tab title alpha', url: 'https://alpha.example' },
      { id: 'tab-2', title: 'Pinned tab', url: 'https://pinned.example', isPinned: true },
      { id: 'tab-3', title: 'Regular beta', url: 'https://beta.example' },
    ];

    renderTopChromeBar(tabs);

    expect(screen.getByTestId('pinned-tab-tab-2')).toBeInTheDocument();
    expect(screen.queryByTestId('tab-button-tab-2')).not.toBeInTheDocument();
    const regularTitle = screen.getByText('Regular long tab title alpha');
    expect(regularTitle).toBeInTheDocument();
    expect(regularTitle.className).not.toContain('pr-4');
    expect(screen.getByText('Regular beta')).toBeInTheDocument();
    expect(screen.getByAltText('Notilus')).toBeInTheDocument();
    expect(screen.queryByText('NOTILUS')).not.toBeInTheDocument();

    const pinned = screen.getByTestId('pinned-tab-tab-2');
    expect(pinned.className).not.toContain('border');
    expect(pinned.className).not.toContain('bg-');
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
});
