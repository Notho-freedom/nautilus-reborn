import { useState, useCallback, useEffect, useMemo } from 'react';
import type { BrowserSnapshot, TabDescriptor } from '../../shared/browser-contract';
import { addHistoryItem } from '@/lib/history';
import {
  desktopActivateTab,
  desktopCloseDevTools,
  desktopCloseTab,
  desktopCreateTab,
  desktopGetState,
  desktopGoBack,
  desktopGoForward,
  desktopNavigate,
  desktopOpenDevTools,
  desktopReload,
  desktopSetPinnedTabs,
  isDesktopRuntime,
  onDesktopStateChanged,
} from '@/lib/electronBridge';

export interface BrowserTab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  isLoading?: boolean;
  isPinned?: boolean;
  isPrivate?: boolean;
  canGoBack?: boolean;
  canGoForward?: boolean;
  kind?: 'internal' | 'external';
}

export interface BrowserState {
  tabs: BrowserTab[];
  activeTabId: string;
  sidebarOpen: boolean;
  sidebarPanel: string | null;
  aiPanelOpen: boolean;
  devToolsOpen: boolean;
  devToolsHeight: number;
  adsBlocked: number;
}

const PINNED_TABS_KEY = 'notilus_pinned_tabs';
const RECENTLY_CLOSED_TABS_KEY = 'notilus_recently_closed_tabs';
const RECENTLY_CLOSED_TABS_LIMIT = 30;
const TABS_KEY = 'notilus_tabs';
const ACTIVE_TAB_KEY = 'notilus_active_tab';

export interface RecentlyClosedTab {
  id: string;
  title: string;
  url: string;
  closedAt: string;
}

const DEFAULT_TAB: BrowserTab = {
  id: 'tab-1',
  title: 'Speed Dial',
  url: 'notilus://speed-dial',
  kind: 'internal',
  isLoading: false,
  canGoBack: false,
  canGoForward: false,
};

function readPinnedTabs(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(PINNED_TABS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

function writePinnedTabs(ids: string[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PINNED_TABS_KEY, JSON.stringify(ids));
}

function readRecentlyClosedTabs(): RecentlyClosedTab[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENTLY_CLOSED_TABS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is RecentlyClosedTab => {
        if (!entry || typeof entry !== 'object') return false;
        const candidate = entry as Partial<RecentlyClosedTab>;
        return Boolean(
          typeof candidate.id === 'string' &&
            typeof candidate.title === 'string' &&
            typeof candidate.url === 'string' &&
            typeof candidate.closedAt === 'string'
        );
      })
      .slice(0, RECENTLY_CLOSED_TABS_LIMIT);
  } catch {
    return [];
  }
}

function writeRecentlyClosedTabs(entries: RecentlyClosedTab[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(RECENTLY_CLOSED_TABS_KEY, JSON.stringify(entries));
}

function pushRecentlyClosed(
  entries: RecentlyClosedTab[],
  closedTab: Omit<RecentlyClosedTab, 'id' | 'closedAt'>
): RecentlyClosedTab[] {
  const nextEntry: RecentlyClosedTab = {
    id: `closed-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    title: closedTab.title,
    url: closedTab.url,
    closedAt: new Date().toISOString(),
  };
  const first = entries[0];
  if (first && first.title === nextEntry.title && first.url === nextEntry.url) {
    return [nextEntry, ...entries.slice(1)].slice(0, RECENTLY_CLOSED_TABS_LIMIT);
  }
  return [nextEntry, ...entries].slice(0, RECENTLY_CLOSED_TABS_LIMIT);
}

function isInternalUrl(url: string): boolean {
  return url.startsWith('notilus://');
}

function resolveTitle(url: string, fallbackTitle?: string): string {
  if (fallbackTitle?.trim()) return fallbackTitle;
  if (isInternalUrl(url)) return url.replace('notilus://', '').replace(/-/g, ' ') || 'speed dial';

  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return 'notilus://speed-dial';
  if (trimmed.startsWith('notilus://')) return trimmed;
  const hasProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed);
  return hasProtocol ? trimmed : `https://${trimmed}`;
}

function mapDesktopTab(tab: TabDescriptor): BrowserTab {
  return {
    id: tab.id,
    title: tab.title,
    url: tab.url,
    isLoading: tab.isLoading,
    canGoBack: tab.canGoBack,
    canGoForward: tab.canGoForward,
    kind: tab.kind,
  };
}

interface SerializedTab {
  id: string;
  title: string;
  url: string;
  kind?: 'internal' | 'external';
}

function readPersistedTabs(): { tabs: BrowserTab[]; activeTabId: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const rawTabs = window.localStorage.getItem(TABS_KEY);
    const rawActive = window.localStorage.getItem(ACTIVE_TAB_KEY);
    if (!rawTabs) return null;
    const parsed = JSON.parse(rawTabs) as SerializedTab[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const tabs: BrowserTab[] = parsed.map(t => ({
      id: t.id,
      title: t.title,
      url: t.url,
      kind: t.kind,
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
    }));
    const activeTabId = typeof rawActive === 'string' && tabs.some(t => t.id === rawActive) ? rawActive : tabs[0].id;
    return { tabs, activeTabId };
  } catch {
    return null;
  }
}

function writePersistedTabs(tabs: BrowserTab[], activeTabId: string): void {
  if (typeof window === 'undefined') return;
  const serialized: SerializedTab[] = tabs.map(t => ({
    id: t.id,
    title: t.title,
    url: t.url,
    kind: t.kind,
  }));
  window.localStorage.setItem(TABS_KEY, JSON.stringify(serialized));
  window.localStorage.setItem(ACTIVE_TAB_KEY, activeTabId);
}

export function useBrowserState() {
  const [localTabs, setLocalTabs] = useState<BrowserTab[]>(() => {
    const persisted = readPersistedTabs();
    return persisted ? persisted.tabs : [DEFAULT_TAB];
  });
  const [localActiveTabId, setLocalActiveTabId] = useState(() => {
    const persisted = readPersistedTabs();
    return persisted ? persisted.activeTabId : 'tab-1';
  });
  const [desktopSnapshot, setDesktopSnapshot] = useState<BrowserSnapshot | null>(null);
  const [pinnedTabIds, setPinnedTabIds] = useState<string[]>(() => readPinnedTabs());
  const [recentlyClosedTabs, setRecentlyClosedTabs] = useState<RecentlyClosedTab[]>(
    () => readRecentlyClosedTabs()
  );

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarPanel, setSidebarPanel] = useState<string | null>(null);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const [devToolsHeight, setDevToolsHeight] = useState(250);
  const [adsBlocked] = useState(147);

  const desktopMode = isDesktopRuntime();

  useEffect(() => {
    if (!desktopMode) {
      setDesktopSnapshot(null);
      return;
    }

    let mounted = true;
    void desktopGetState().then(snapshot => {
      if (!mounted || !snapshot) return;
      setDesktopSnapshot(snapshot);
    });

    const unsubscribe = onDesktopStateChanged(snapshot => {
      if (!mounted) return;
      setDesktopSnapshot(snapshot);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [desktopMode]);

  const desktopTabs = useMemo(() => {
    if (!desktopSnapshot) return [];
    return desktopSnapshot.tabs.map(mapDesktopTab);
  }, [desktopSnapshot]);

  const baseTabs = desktopMode && desktopSnapshot ? desktopTabs : localTabs;
  const pinnedSet = useMemo(() => new Set(pinnedTabIds), [pinnedTabIds]);
  const tabs = useMemo(
    () =>
      baseTabs.map(tab => ({
        ...tab,
        isPinned: pinnedSet.has(tab.id),
      })),
    [baseTabs, pinnedSet]
  );
  const activeTabId = desktopMode && desktopSnapshot ? desktopSnapshot.activeTabId ?? '' : localActiveTabId;
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0] || DEFAULT_TAB;

  useEffect(() => {
    writePinnedTabs(pinnedTabIds);
  }, [pinnedTabIds]);

  useEffect(() => {
    if (!desktopMode) return;
    void desktopSetPinnedTabs({ tabIds: pinnedTabIds });
  }, [desktopMode, pinnedTabIds]);

  useEffect(() => {
    writeRecentlyClosedTabs(recentlyClosedTabs);
  }, [recentlyClosedTabs]);

  useEffect(() => {
    const validIds = new Set(baseTabs.map(tab => tab.id));
    setPinnedTabIds(prev => {
      const filtered = prev.filter(id => validIds.has(id));
      if (filtered.length === prev.length) return prev;
      return filtered;
    });
  }, [baseTabs]);

  // Persist tabs to localStorage
  useEffect(() => {
    if (desktopMode) return;
    writePersistedTabs(localTabs, localActiveTabId);
  }, [localTabs, localActiveTabId, desktopMode]);

  const setActiveTabId = useCallback((id: string) => {
    if (desktopMode) {
      void desktopActivateTab({ tabId: id });
      return;
    }
    setLocalActiveTabId(id);
  }, [desktopMode]);

  const addTab = useCallback((url = 'notilus://speed-dial', title = 'New Tab') => {
    const normalizedUrl = normalizeUrl(url);
    const resolvedTitle = resolveTitle(normalizedUrl, title);

    if (desktopMode) {
      void desktopCreateTab({ url: normalizedUrl });
      if (!isInternalUrl(normalizedUrl)) {
        addHistoryItem(normalizedUrl, resolvedTitle);
      }
      return;
    }

    const id = `tab-${Date.now()}`;
    const newTab: BrowserTab = { id, title: resolvedTitle, url: normalizedUrl };
    setLocalTabs(prev => [...prev, newTab]);
    setLocalActiveTabId(id);

    if (!isInternalUrl(normalizedUrl)) {
      addHistoryItem(normalizedUrl, resolvedTitle);
    }
  }, [desktopMode]);

  const closeTab = useCallback((id: string) => {
    const closedTab = tabs.find(tab => tab.id === id);
    if (closedTab) {
      setRecentlyClosedTabs(prev =>
        pushRecentlyClosed(prev, {
          title: closedTab.title,
          url: closedTab.url,
        })
      );
    }

    if (desktopMode) {
      void desktopCloseTab({ tabId: id });
      setPinnedTabIds(prev => prev.filter(tabId => tabId !== id));
      return;
    }

    setLocalTabs(prev => {
      const next = prev.filter(t => t.id !== id);
      if (next.length === 0) {
        const fallback: BrowserTab = {
          id: `tab-${Date.now()}`,
          title: 'Speed Dial',
          url: 'notilus://speed-dial',
          kind: 'internal',
        };
        setLocalActiveTabId(fallback.id);
        return [fallback];
      }
      const nonPinnedTabs = next.filter(tab => !pinnedTabIds.includes(tab.id));
      if (nonPinnedTabs.length === 0) {
        const fallback: BrowserTab = {
          id: `tab-${Date.now()}`,
          title: 'Speed Dial',
          url: 'notilus://speed-dial',
          kind: 'internal',
        };
        setLocalActiveTabId(fallback.id);
        return [...next, fallback];
      }
      if (id === localActiveTabId) {
        const idx = prev.findIndex(t => t.id === id);
        const fallbackIndex = Math.max(0, Math.min(idx, nonPinnedTabs.length - 1));
        const newActive = nonPinnedTabs[fallbackIndex] ?? nonPinnedTabs[0];
        setLocalActiveTabId(newActive.id);
      }
      return next;
    });
    setPinnedTabIds(prev => prev.filter(tabId => tabId !== id));
  }, [desktopMode, localActiveTabId, pinnedTabIds, tabs]);

  const updateTabUrl = useCallback((id: string, url: string, title?: string) => {
    const normalizedUrl = normalizeUrl(url);

    if (desktopMode) {
      void desktopNavigate({ tabId: id, url: normalizedUrl });
      return;
    }

    setLocalTabs(prev =>
      prev.map(t => (t.id === id ? { ...t, url: normalizedUrl, title: title || t.title } : t))
    );
  }, [desktopMode]);

  const navigateTo = useCallback((url: string) => {
    const normalizedUrl = normalizeUrl(url);
    const title = resolveTitle(normalizedUrl);

    if (desktopMode) {
      void desktopNavigate({ tabId: activeTab?.id, url: normalizedUrl });
      if (!isInternalUrl(normalizedUrl)) {
        addHistoryItem(normalizedUrl, title);
      }
      return;
    }

    if (activeTab) {
      updateTabUrl(activeTab.id, normalizedUrl, title);
      if (!isInternalUrl(normalizedUrl)) {
        addHistoryItem(normalizedUrl, title);
      }
    }
  }, [desktopMode, activeTab, updateTabUrl]);

  const toggleSidebar = useCallback((panel?: string) => {
    if (panel && sidebarPanel === panel && sidebarOpen) {
      setSidebarOpen(false);
      setSidebarPanel(null);
    } else if (panel) {
      setSidebarPanel(panel);
      setSidebarOpen(true);
    } else {
      setSidebarOpen(prev => !prev);
      if (sidebarOpen) setSidebarPanel(null);
    }
  }, [sidebarOpen, sidebarPanel]);

  const toggleAiPanel = useCallback(() => {
    setAiPanelOpen(prev => !prev);
  }, []);

  const toggleDevTools = useCallback(() => {
    setDevToolsOpen(prev => !prev);
  }, []);

  const openNativeDevTools = useCallback(() => {
    if (!desktopMode) return;
    void desktopOpenDevTools({ tabId: activeTab?.id });
  }, [desktopMode, activeTab]);

  const closeNativeDevTools = useCallback(() => {
    if (!desktopMode) return;
    void desktopCloseDevTools({});
  }, [desktopMode]);

  const goBack = useCallback(() => {
    if (desktopMode) {
      void desktopGoBack({ tabId: activeTab?.id });
      return;
    }
    window.history.back();
  }, [desktopMode, activeTab]);

  const goForward = useCallback(() => {
    if (desktopMode) {
      void desktopGoForward({ tabId: activeTab?.id });
      return;
    }
    window.history.forward();
  }, [desktopMode, activeTab]);

  const reload = useCallback(() => {
    if (desktopMode) {
      void desktopReload({ tabId: activeTab?.id });
      return;
    }
    window.location.reload();
  }, [desktopMode, activeTab]);

  const nextTab = useCallback(() => {
    if (!tabs.length) return;
    const idx = tabs.findIndex(t => t.id === activeTabId);
    const next = tabs[(idx + 1) % tabs.length];
    if (next) setActiveTabId(next.id);
  }, [tabs, activeTabId, setActiveTabId]);

  const prevTab = useCallback(() => {
    if (!tabs.length) return;
    const idx = tabs.findIndex(t => t.id === activeTabId);
    const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
    if (prev) setActiveTabId(prev.id);
  }, [tabs, activeTabId, setActiveTabId]);

  const togglePinTab = useCallback((id: string) => {
    setPinnedTabIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(tabId => tabId !== id);
      }
      return [...prev, id];
    });
  }, []);

  const isTabPinned = useCallback((id: string) => {
    return pinnedSet.has(id);
  }, [pinnedSet]);

  const reopenClosedTab = useCallback((id: string) => {
    const target = recentlyClosedTabs.find(tab => tab.id === id);
    if (!target) return;
    addTab(target.url, target.title);
    setRecentlyClosedTabs(prev => prev.filter(tab => tab.id !== id));
  }, [addTab, recentlyClosedTabs]);

  const removeClosedTab = useCallback((id: string) => {
    setRecentlyClosedTabs(prev => prev.filter(tab => tab.id !== id));
  }, []);

  const clearClosedTabs = useCallback(() => {
    setRecentlyClosedTabs([]);
  }, []);

  return {
    isDesktopMode: desktopMode,
    isExternalActiveTab: Boolean(activeTab?.kind === 'external'),
    tabs,
    activeTabId: activeTabId || activeTab?.id || '',
    activeTab,
    sidebarOpen,
    sidebarPanel,
    aiPanelOpen,
    devToolsOpen,
    devToolsHeight,
    adsBlocked,
    canGoBack: Boolean(activeTab?.canGoBack),
    canGoForward: Boolean(activeTab?.canGoForward),
    isLoading: Boolean(activeTab?.isLoading),
    isPinned: Boolean(activeTab?.isPinned),
    recentlyClosedTabs,
    setActiveTabId,
    addTab,
    closeTab,
    updateTabUrl,
    navigateTo,
    goBack,
    goForward,
    reload,
    openNativeDevTools,
    closeNativeDevTools,
    toggleSidebar,
    toggleAiPanel,
    toggleDevTools,
    setDevToolsHeight,
    setSidebarOpen,
    setSidebarPanel,
    nextTab,
    prevTab,
    togglePinTab,
    isTabPinned,
    reopenClosedTab,
    removeClosedTab,
    clearClosedTabs,
  };
}
