import type * as React from 'react';
import type { BrowserDesktopApi } from '../../shared/browser-contract';

interface ElectronWebviewElement extends HTMLElement {
  getWebContentsId: () => number;
  getURL: () => string;
  getTitle: () => string;
  isLoading: () => boolean;
  canGoBack: () => boolean;
  canGoForward: () => boolean;
  loadURL: (url: string) => Promise<void>;
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
  setZoomFactor?: (factor: number) => void;
  getZoomFactor?: () => number;
  insertCSS?: (css: string) => Promise<string>;
  executeJavaScript?: <T = unknown>(code: string, userGesture?: boolean) => Promise<T>;
}

declare global {
  interface Window {
    notilusDesktop?: BrowserDesktopApi;
  }

  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<
        React.HTMLAttributes<ElectronWebviewElement>,
        ElectronWebviewElement
      > & {
        src?: string;
        partition?: string;
        preload?: string;
        allowpopups?: boolean | string;
        webpreferences?: string;
      };
    }
  }
}

export {};
