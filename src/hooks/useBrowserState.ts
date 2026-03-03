import { useState, useCallback } from 'react';

export interface BrowserTab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  isLoading?: boolean;
  isPinned?: boolean;
  isPrivate?: boolean;
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
};

export function useBrowserState() {
  const [tabs, setTabs] = useState<BrowserTab[]>([DEFAULT_TAB]);
  const [activeTabId, setActiveTabId] = useState('tab-1');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarPanel, setSidebarPanel] = useState<string | null>(null);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const [devToolsHeight, setDevToolsHeight] = useState(250);
  const [adsBlocked] = useState(147);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const addTab = useCallback((url = 'notilus://speed-dial', title = 'New Tab') => {
    const id = `tab-${Date.now()}`;
    const newTab: BrowserTab = { id, title, url };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(id);
  }, []);

  const closeTab = useCallback((id: string) => {
    setTabs(prev => {
      const next = prev.filter(t => t.id !== id);
      if (next.length === 0) {
        const fallback: BrowserTab = { id: `tab-${Date.now()}`, title: 'Speed Dial', url: 'notilus://speed-dial' };
        setActiveTabId(fallback.id);
        return [fallback];
      }
      if (id === activeTabId) {
        const idx = prev.findIndex(t => t.id === id);
        const newActive = next[Math.min(idx, next.length - 1)];
        setActiveTabId(newActive.id);
      }
      return next;
    });
  }, [activeTabId]);

  const updateTabUrl = useCallback((id: string, url: string, title?: string) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, url, title: title || t.title } : t));
  }, []);

  const navigateTo = useCallback((url: string) => {
    if (activeTab) {
      const title = url.startsWith('notilus://') ? url.replace('notilus://', '').replace(/-/g, ' ') : url;
      updateTabUrl(activeTab.id, url, title);
    }
  }, [activeTab, updateTabUrl]);

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

  const nextTab = useCallback(() => {
    const idx = tabs.findIndex(t => t.id === activeTabId);
    const next = tabs[(idx + 1) % tabs.length];
    if (next) setActiveTabId(next.id);
  }, [tabs, activeTabId]);

  const prevTab = useCallback(() => {
    const idx = tabs.findIndex(t => t.id === activeTabId);
    const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
    if (prev) setActiveTabId(prev.id);
  }, [tabs, activeTabId]);

  return {
    tabs, activeTabId, activeTab, sidebarOpen, sidebarPanel, aiPanelOpen,
    devToolsOpen, devToolsHeight, adsBlocked,
    setActiveTabId, addTab, closeTab, updateTabUrl, navigateTo,
    toggleSidebar, toggleAiPanel, toggleDevTools, setDevToolsHeight,
    setSidebarOpen, setSidebarPanel, nextTab, prevTab,
  };
}
