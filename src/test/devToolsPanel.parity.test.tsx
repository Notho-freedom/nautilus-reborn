import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DevToolsPanel } from '@/components/browser/DevToolsPanel';
import { devtoolsBridge } from '@/lib/devtoolsBridge';

vi.mock('@/lib/devtoolsBridge', () => ({
  devtoolsBridge: {
    subscribe: vi.fn(() => () => {}),
    executeScript: vi.fn(async () => 'ok'),
    clearConsole: vi.fn(async () => {}),
    clearNetwork: vi.fn(async () => {}),
    clearAll: vi.fn(async () => {}),
    setInspectMode: vi.fn(async () => {}),
    applyResponsivePreset: vi.fn(async () => {}),
    fetchDOMTree: vi.fn(async () => null),
    fetchPerformance: vi.fn(async () => null),
    fetchStorage: vi.fn(async () => ({ localStorage: [], sessionStorage: [], cookie: [] })),
    fetchSources: vi.fn(async () => []),
    inspectElement: vi.fn(async () => null),
  },
  fetchDevtoolsSnapshot: vi.fn(async () => ({
    domTree: null,
    performance: null,
    sources: [],
    storage: { localStorage: [], sessionStorage: [], cookie: [] },
  })),
}));

vi.mock('@/components/browser/BackendLabPanel', () => ({
  BackendLabPanel: () => <div>Backend Lab Content</div>,
}));

describe('DevToolsPanel parity basics', () => {
  it('renders tabs in V1 order and supports detach action', () => {
    const onDetach = vi.fn();

    render(
      <DevToolsPanel
        isOpen
        onClose={vi.fn()}
        height={320}
        onHeightChange={vi.fn()}
        onDetach={onDetach}
      />
    );

    const labels = ['Elements', 'Console', 'Network', 'Resources', 'Performance', 'Application', 'Backend Lab'];
    labels.forEach(label => {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Detach' }));
    expect(onDetach).toHaveBeenCalledTimes(1);
  });

  it('switches tabs with Ctrl+Shift shortcuts', () => {
    render(
      <DevToolsPanel
        isOpen
        onClose={vi.fn()}
        height={320}
        onHeightChange={vi.fn()}
      />
    );

    const networkTab = screen.getByRole('button', { name: 'Network' });
    expect(networkTab.className).not.toContain('bg-primary/15');

    fireEvent.keyDown(window, { key: 'E', ctrlKey: true, shiftKey: true });
    expect(networkTab.className).toContain('bg-primary/15');
  });

  it('handles Escape like V1: disables inspect mode first, then closes panel', () => {
    const onClose = vi.fn();

    render(
      <DevToolsPanel
        isOpen
        onClose={onClose}
        height={320}
        onHeightChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTitle('Inspect mode (Ctrl+Shift+C)'));
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(devtoolsBridge.setInspectMode).toHaveBeenCalledWith(false);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('opens DevTools settings from header action', () => {
    const onOpenSettings = vi.fn();

    render(
      <DevToolsPanel
        isOpen
        onClose={vi.fn()}
        height={320}
        onHeightChange={vi.fn()}
        onOpenSettings={onOpenSettings}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });
});
