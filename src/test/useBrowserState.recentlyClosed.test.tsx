import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useBrowserState } from '@/hooks/useBrowserState';

describe('useBrowserState recently closed tabs', () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete window.notilusDesktop;
  });

  afterEach(() => {
    delete window.notilusDesktop;
  });

  it('stores closed tabs and reopens them', () => {
    const { result } = renderHook(() => useBrowserState());

    act(() => {
      result.current.addTab('https://example.com', 'Example');
    });

    const closedTabId = result.current.activeTabId;

    act(() => {
      result.current.closeTab(closedTabId);
    });

    expect(result.current.recentlyClosedTabs).toHaveLength(1);
    expect(result.current.recentlyClosedTabs[0]?.title).toBe('Example');

    const recentId = result.current.recentlyClosedTabs[0]!.id;
    act(() => {
      result.current.reopenClosedTab(recentId);
    });

    expect(result.current.recentlyClosedTabs).toHaveLength(0);
    expect(result.current.tabs.some(tab => tab.url.includes('example.com'))).toBe(true);
  });

  it('deduplicates consecutive identical closures and enforces max size', () => {
    const { result } = renderHook(() => useBrowserState());

    act(() => {
      result.current.addTab('https://repeat.example', 'Repeat');
    });
    const firstId = result.current.activeTabId;
    act(() => {
      result.current.closeTab(firstId);
    });

    act(() => {
      result.current.addTab('https://repeat.example', 'Repeat');
    });
    const secondId = result.current.activeTabId;
    act(() => {
      result.current.closeTab(secondId);
    });

    expect(result.current.recentlyClosedTabs).toHaveLength(1);
    expect(result.current.recentlyClosedTabs[0]?.url).toContain('repeat.example');

    for (let i = 0; i < 35; i += 1) {
      act(() => {
        result.current.addTab(`https://site-${i}.example`, `Site ${i}`);
      });
      const activeId = result.current.activeTabId;
      act(() => {
        result.current.closeTab(activeId);
      });
    }

    expect(result.current.recentlyClosedTabs.length).toBe(30);
  });
});
