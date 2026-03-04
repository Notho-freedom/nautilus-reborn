import { useEffect, useMemo, useRef } from 'react';
import type { BrowserTab } from '@/hooks/useBrowserState';
import {
  desktopBindTabWebContents,
  desktopUnbindTabWebContents,
  desktopUpdateTabRuntime,
} from '@/lib/electronBridge';

interface DesktopWebviewLayerProps {
  tabs: BrowserTab[];
  activeTabId: string;
  onCreateTab: (url: string) => void;
}

function deriveTitle(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function isInvalidRuntimeUrl(url: string): boolean {
  if (!url) return true;
  if (url === 'about:blank') return true;
  if (url.startsWith('chrome-error://')) return true;
  return false;
}

function resolveRuntimeUrl(rawUrl: string, fallbackUrl: string): string {
  const candidate = rawUrl.trim();
  return isInvalidRuntimeUrl(candidate) ? fallbackUrl : candidate;
}

function normalizeComparableUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  if (rawUrl.startsWith('notilus://')) return rawUrl;
  try {
    const parsed = new URL(rawUrl);
    parsed.hash = '';
    const normalizedPath = parsed.pathname.replace(/\/+$/, '');
    parsed.pathname = normalizedPath || '/';
    const normalized = parsed.toString();
    return normalized.endsWith('/') && parsed.pathname === '/' ? normalized.slice(0, -1) : normalized;
  } catch {
    return rawUrl;
  }
}

function extractPopupUrl(rawEvent: Event): string | null {
  const event = rawEvent as unknown as Record<string, unknown>;
  const detail = (event.detail as Record<string, unknown> | undefined) ?? {};

  const candidates = [
    event.url,
    event.targetUrl,
    event.newURL,
    detail.url,
    detail.targetURL,
    detail.targetUrl,
    detail.newURL,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const trimmed = candidate.trim();
    if (!trimmed) continue;
    return trimmed;
  }
  return null;
}

export function DesktopWebviewLayer({
  tabs,
  activeTabId,
  onCreateTab,
}: DesktopWebviewLayerProps) {
  const externalTabs = useMemo(
    () => tabs.filter(tab => tab.kind === 'external'),
    [tabs]
  );

  const webviewRefs = useRef(new Map<string, ElectronWebviewElement>());
  const listenersCleanupRef = useRef(new Map<string, () => void>());
  const requestedUrlRef = useRef(new Map<string, string>());
  const runtimeSignatureRef = useRef(new Map<string, string>());
  const domReadyTabsRef = useRef(new Set<string>());
  const initialSrcByTabId = useRef(new Map<string, string>());

  useEffect(() => {
    const activeTabIds = new Set(externalTabs.map(tab => tab.id));

    for (const tab of externalTabs) {
      if (initialSrcByTabId.current.has(tab.id)) continue;
      initialSrcByTabId.current.set(tab.id, tab.url);
    }

    for (const [tabId, cleanup] of listenersCleanupRef.current) {
      if (activeTabIds.has(tabId)) continue;
      cleanup();
      listenersCleanupRef.current.delete(tabId);
      webviewRefs.current.delete(tabId);
      requestedUrlRef.current.delete(tabId);
      runtimeSignatureRef.current.delete(tabId);
      domReadyTabsRef.current.delete(tabId);
      initialSrcByTabId.current.delete(tabId);
    }

    for (const tab of externalTabs) {
      const webview = webviewRefs.current.get(tab.id);
      if (!webview || listenersCleanupRef.current.has(tab.id)) continue;

      const emitRuntime = async () => {
        if (!domReadyTabsRef.current.has(tab.id)) return;

        let rawUrl = '';
        let rawTitle = '';
        let isLoading = false;
        let canGoBack = false;
        let canGoForward = false;

        try {
          rawUrl = webview.getURL();
          rawTitle = webview.getTitle();
          isLoading = webview.isLoading();
          canGoBack = webview.canGoBack();
          canGoForward = webview.canGoForward();
        } catch {
          return;
        }

        const currentUrl = resolveRuntimeUrl(rawUrl, tab.url);
        const runtimeTitle = rawTitle.trim() || tab.title || deriveTitle(currentUrl);
        const payload = {
          tabId: tab.id,
          url: currentUrl,
          title: runtimeTitle,
          isLoading,
          canGoBack,
          canGoForward,
        };
        const signature = JSON.stringify(payload);
        if (runtimeSignatureRef.current.get(tab.id) === signature) return;
        runtimeSignatureRef.current.set(tab.id, signature);
        await desktopUpdateTabRuntime(payload);
      };

      const handleDomReady = async () => {
        let webContentsId: number;
        try {
          webContentsId = webview.getWebContentsId();
        } catch {
          return;
        }
        if (typeof webContentsId === 'number' && Number.isFinite(webContentsId)) {
          domReadyTabsRef.current.add(tab.id);
          await desktopBindTabWebContents({ tabId: tab.id, webContentsId });
          await emitRuntime();
        }
      };

      const handlePopup = (event: Event) => {
        const targetUrl = extractPopupUrl(event);
        if (!targetUrl) return;
        (event as { preventDefault?: () => void }).preventDefault?.();
        onCreateTab(targetUrl);
      };

      const listeners: Array<[string, EventListener]> = [
        ['dom-ready', () => void handleDomReady()],
        ['did-start-loading', () => void emitRuntime()],
        ['did-stop-loading', () => void emitRuntime()],
        ['did-navigate', () => void emitRuntime()],
        ['did-navigate-in-page', () => void emitRuntime()],
        ['page-title-updated', () => void emitRuntime()],
        ['did-fail-load', () => void emitRuntime()],
        ['new-window', handlePopup],
        ['did-create-window', handlePopup],
      ];

      for (const [name, listener] of listeners) {
        webview.addEventListener(name, listener);
      }

      listenersCleanupRef.current.set(tab.id, () => {
        for (const [name, listener] of listeners) {
          webview.removeEventListener(name, listener);
        }
        domReadyTabsRef.current.delete(tab.id);
        void desktopUnbindTabWebContents({ tabId: tab.id });
      });
    }
  }, [externalTabs, onCreateTab]);

  useEffect(() => {
    return () => {
      for (const cleanup of listenersCleanupRef.current.values()) {
        cleanup();
      }
      listenersCleanupRef.current.clear();
      webviewRefs.current.clear();
      requestedUrlRef.current.clear();
      runtimeSignatureRef.current.clear();
      domReadyTabsRef.current.clear();
      initialSrcByTabId.current.clear();
    };
  }, []);

  useEffect(() => {
    for (const tab of externalTabs) {
      const webview = webviewRefs.current.get(tab.id);
      if (!webview) continue;
      if (!domReadyTabsRef.current.has(tab.id)) continue;

      const targetUrl = tab.url;
      const lastRequestedUrl = requestedUrlRef.current.get(tab.id);
      const normalizedTargetUrl = normalizeComparableUrl(targetUrl);
      if (lastRequestedUrl === normalizedTargetUrl) continue;

      let currentUrl = '';
      try {
        currentUrl = webview.getURL();
      } catch {
        continue;
      }
      const normalizedCurrentUrl = normalizeComparableUrl(resolveRuntimeUrl(currentUrl, targetUrl));
      if (normalizedCurrentUrl !== normalizedTargetUrl) {
        void webview.loadURL(targetUrl).catch(() => {
          // Ignore transient guest navigation errors.
        });
      }
      requestedUrlRef.current.set(tab.id, normalizedTargetUrl);
    }
  }, [externalTabs]);

  return (
    <div data-testid="desktop-webview-layer" className="absolute inset-0">
      {externalTabs.map(tab => {
        const isActive = tab.id === activeTabId;
        const shouldShow = isActive;
        const initialSrc = initialSrcByTabId.current.get(tab.id) ?? tab.url;

        return (
          <webview
            key={tab.id}
            ref={element => {
              if (!element) {
                webviewRefs.current.delete(tab.id);
                return;
              }
              webviewRefs.current.set(tab.id, element);
            }}
            src={initialSrc}
            partition="persist:notilus-default"
            allowpopups="true"
            className="absolute inset-0 h-full w-full bg-transparent"
            style={{
              visibility: shouldShow ? 'visible' : 'hidden',
              pointerEvents: shouldShow ? 'auto' : 'none',
            }}
            data-tab-id={tab.id}
            data-active={shouldShow ? 'true' : 'false'}
            data-testid={`desktop-webview-${tab.id}`}
          />
        );
      })}
    </div>
  );
}
