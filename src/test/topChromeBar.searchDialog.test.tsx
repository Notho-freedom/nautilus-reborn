import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TopChromeBar } from '@/components/browser/TopChromeBar';
import type { BrowserTab, RecentlyClosedTab } from '@/hooks/useBrowserState';
import { TooltipProvider } from '@/components/ui/tooltip';

describe('TopChromeBar search dialog', () => {
  it('opens search dialog, filters items and reopens recently closed tab', async () => {
    const tabs: BrowserTab[] = [
      { id: 'tab-open-1', title: 'Open Alpha', url: 'https://alpha.example' },
      { id: 'tab-open-2', title: 'Open Beta', url: 'https://beta.example' },
    ];
    const recent: RecentlyClosedTab[] = [
      {
        id: 'closed-1',
        title: 'Closed Docs',
        url: 'https://docs.example',
        closedAt: new Date().toISOString(),
      },
    ];

    const onSelectTab = vi.fn();
    const onReopenClosedTab = vi.fn();

    render(
      <TooltipProvider>
        <TopChromeBar
          tabs={tabs}
          activeTabId="tab-open-1"
          onSelectTab={onSelectTab}
          onCloseTab={vi.fn()}
          onAddTab={vi.fn()}
          onDuplicateTab={vi.fn()}
          onTogglePinTab={vi.fn()}
          recentlyClosedTabs={recent}
          onReopenClosedTab={onReopenClosedTab}
          onClearClosedTabs={vi.fn()}
        />
      </TooltipProvider>
    );

    fireEvent.click(screen.getByTitle('Search tabs'));
    await waitFor(() => {
      expect(screen.getByTestId('tab-search-dialog')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Search by title or domain...'), {
      target: { value: 'docs' },
    });

    await waitFor(() => {
      expect(screen.getByTestId('search-recent-tab-closed-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('search-recent-tab-closed-1'));
    expect(onReopenClosedTab).toHaveBeenCalledWith('closed-1');
  });
});
