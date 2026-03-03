import { useState, useCallback, useEffect, useMemo } from 'react';
import type { BrowserSnapshot, TabDescriptor, ViewportBounds } from '../../shared/browser-contract';
import { addHistoryItem } from '@/lib/history';
import {
  desktopActivateTab,
  desktopCloseTab,
  desktopCreateTab,
  desktopGetState,
  desktopGoBack,
  desktopGoForward,
  desktopNavigate,
  desktopOpenDevTools,
  desktopReload,
  desktopSetViewportBounds,
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

const DEFAULT_TAB: BrowserTab = {
  id: 'tab-1',
  title: 'Speed Dial',
  url: 'notilus://speed-dial',
  kind: 'internal',
  isLoading: false,
  canGoBack: false,
  canGoForward: false,
};

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

export function useBrowserState() {
  const [localTabs, setLocalTabs] = useState<BrowserTab[]>([DEFAULT_TAB]);
  const [localActiveTabId, setLocalActiveTabId] = useState('tab-1');
  const [desktopSnapshot, setDesktopSnapshot] = useState<BrowserSnapshot | null>(null);

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

  const tabs = desktopMode && desktopSnapshot ? desktopTabs : localTabs;
  const activeTabId = desktopMode && desktopSnapshot ? desktopSnapshot.activeTabId ?? '' : localActiveTabId;
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0] || DEFAULT_TAB;

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
    if (desktopMode) {
      void desktopCloseTab({ tabId: id });
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
      if (id === localActiveTabId) {
        const idx = prev.findIndex(t => t.id === id);
        const newActive = next[Math.min(idx, next.length - 1)];
        setLocalActiveTabId(newActive.id);
      }
      return next;
    });
  }, [desktopMode, localActiveTabId]);

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

  const setViewportBounds = useCallback((bounds: ViewportBounds) => {
    if (!desktopMode) return;
    void desktopSetViewportBounds(bounds);
  }, [desktopMode]);

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

  return {
    isDesktopMode: desktopMode,
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
    setActiveTabId,
    addTab,
    closeTab,
    updateTabUrl,
    navigateTo,
    goBack,
    goForward,
    reload,
    openNativeDevTools,
    setViewportBounds,
    toggleSidebar,
    toggleAiPanel,
    toggleDevTools,
    setDevToolsHeight,
    setSidebarOpen,
    setSidebarPanel,
    nextTab,
    prevTab,
  };
}
