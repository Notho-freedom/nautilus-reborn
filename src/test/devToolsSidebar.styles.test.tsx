import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DevToolsSidebar } from '@/components/browser/DevToolsSidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

describe('DevToolsSidebar styles', () => {
  it('uses expected active/inactive icon color classes and hides scrollbar', () => {
    const { container } = render(
      <TooltipProvider>
        <DevToolsSidebar
          isOpen
          activePanel="bookmarks"
          onToggle={vi.fn()}
          onOpenWebPanel={vi.fn()}
          activeWebServiceUrl={null}
        />
      </TooltipProvider>
    );

    const sidebarColumn = container.querySelector('.w-11');
    expect(sidebarColumn).not.toBeNull();
    expect(sidebarColumn?.className).toContain('no-scrollbar');

    const buttons = container.querySelectorAll('button');
    const activeButton = buttons[0];
    const inactiveButton = buttons[1];

    expect(activeButton?.className).toContain('text-white');
    expect(activeButton?.className).not.toContain('border-primary');
    expect(inactiveButton?.className).toContain('text-primary');
  });
});
