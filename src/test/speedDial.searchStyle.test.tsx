import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SpeedDial } from '@/components/browser/SpeedDial';

describe('SpeedDial search style', () => {
  it('matches URL bar rest and focus states', () => {
    render(<SpeedDial onNavigate={vi.fn()} />);
    const input = screen.getByPlaceholderText(/Search with .* or enter URL\.\.\./);
    const container = input.parentElement;

    expect(container).not.toBeNull();
    expect(container?.className).toContain('bg-transparent');
    expect(container?.className).toContain('border-transparent');
    expect(container?.className).toContain('hover:bg-primary/10');

    fireEvent.focus(input);
    expect(container?.className).toContain('bg-notilus-surface-1');
    expect(container?.className).toContain('border-primary/50');
    expect(input.className).toContain('selection:bg-primary');
  });
});
