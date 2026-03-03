import type { BrowserDesktopApi } from '../../shared/browser-contract';

declare global {
  interface Window {
    notilusDesktop?: BrowserDesktopApi;
  }
}

export {};

