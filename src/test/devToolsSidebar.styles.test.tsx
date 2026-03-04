import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DevToolsSidebar } from '@/components/browser/DevToolsSidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

describe('DevToolsSidebar styles', () => {
  it('uses expected active/inactive icon color classes', () => {
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

    const buttons = container.querySelectorAll('button');
    const activeButton = buttons[0];
    const inactiveButton = buttons[1];

    expect(activeButton?.className).toContain('text-white');
    expect(activeButton?.className).toContain('border-primary/50');
    expect(inactiveButton?.className).toContain('text-primary');
  });
});
