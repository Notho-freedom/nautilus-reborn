import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SidePanelShell } from '@/components/browser/panels/SidePanelShell';

describe('SidePanelShell', () => {
  it('renders optional controls', () => {
    render(
      <SidePanelShell
        panelId="history"
        title="History"
        subtitle="Recent pages"
        width={340}
        minWidth={260}
        maxWidth={700}
        searchable
        searchValue=""
        searchPlaceholder="Search history"
        onSearchChange={vi.fn()}
        filters={[{ id: 'all', label: 'All', active: true, onClick: vi.fn() }]}
        quickActions={[{ id: 'clear', label: 'Clear', onClick: vi.fn() }]}
        onClose={vi.fn()}
        onWidthChange={vi.fn()}
      >
        <div>Body</div>
      </SidePanelShell>
    );

    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search history')).toBeInTheDocument();
    expect(screen.getByTitle('Panel options')).toBeInTheDocument();
  });

  it('emits width updates while dragging resize handle', () => {
    const onWidthChange = vi.fn();

    const { container } = render(
      <SidePanelShell
        panelId="bookmarks"
        title="Bookmarks"
        width={320}
        minWidth={260}
        maxWidth={640}
        onClose={vi.fn()}
        onWidthChange={onWidthChange}
      >
        <div>Body</div>
      </SidePanelShell>
    );

    const handle = container.querySelector('[role="separator"]');
    expect(handle).toBeTruthy();

    fireEvent.mouseDown(handle!, { clientX: 320 });
    fireEvent.mouseMove(window, { clientX: 360 });
    fireEvent.mouseUp(window);

    expect(onWidthChange).toHaveBeenCalled();
    expect(onWidthChange.mock.calls.at(-1)?.[0]).toBe(360);
  });
});
