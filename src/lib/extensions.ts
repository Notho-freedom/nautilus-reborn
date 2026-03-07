import { type LucideIcon, Bug, Code2, Eye, Palette, Shield, Zap } from 'lucide-react';

export interface ExtensionItem {
  id: string;
  name: string;
  description: string;
  iconKey: string;
  enabled: boolean;
  version: string;
  homepageUrl?: string;
  matches?: string[];
  css?: string;
  js?: string;
}

export const EXTENSION_ICONS: Record<string, LucideIcon> = {
  shield: Shield,
  eye: Eye,
  zap: Zap,
  palette: Palette,
  code2: Code2,
  bug: Bug,
};

const EXTENSIONS_KEY = 'notilus_extensions';
const EXTENSIONS_UPDATED_EVENT = 'notilus:extensions-updated';

const DEFAULT_EXTENSIONS: ExtensionItem[] = [
  {
    id: 'ublock-origin',
    name: 'uBlock Origin',
    description: 'Ad & tracker blocker',
    iconKey: 'shield',
    enabled: true,
    version: '1.57.0',
    homepageUrl: 'https://ublockorigin.com/',
    matches: ['*://*/*'],
    css: [
      '[id*="ad" i]',
      '[class*="ad" i]',
      '[class*="sponsor" i]',
      'iframe[src*="doubleclick" i]',
      '[data-testid*="ad" i]',
      '.adsbygoogle',
      '{ display: none !important; }',
    ].join(' '),
  },
  {
    id: 'dark-reader',
    name: 'Dark Reader',
    description: 'Dark mode for websites',
    iconKey: 'eye',
    enabled: true,
    version: '4.9.80',
    homepageUrl: 'https://darkreader.org/',
    matches: ['*://*/*'],
    css: [
      'html { color-scheme: dark !important; }',
      'img, video { filter: brightness(0.92) contrast(1.02); }',
      'body { background-color: #0b0b0f !important; }',
    ].join(' '),
  },
  {
    id: 'vimium',
    name: 'Vimium',
    description: 'Keyboard navigation',
    iconKey: 'zap',
    enabled: false,
    version: '2.1.2',
    homepageUrl: 'https://vimium.github.io/',
    matches: ['*://*/*'],
    js: [
      '(() => {',
      '  if (window.__notilusVimiumHint) return;',
      '  window.__notilusVimiumHint = true;',
      '  window.addEventListener("keydown", (event) => {',
      '    if (event.key.toLowerCase() === "f" && !event.ctrlKey && !event.metaKey && !event.altKey) {',
      '      document.body.style.outline = "1px dashed rgba(255,45,85,0.7)";',
      '      setTimeout(() => { document.body.style.outline = ""; }, 350);',
      '    }',
      '  }, { passive: true });',
      '})();',
    ].join('\n'),
  },
  {
    id: 'colorzilla',
    name: 'ColorZilla',
    description: 'Color picker and gradient',
    iconKey: 'palette',
    enabled: true,
    version: '3.3',
    matches: ['*://*/*'],
    js: [
      '(() => {',
      '  if (window.__notilusColorZilla) return;',
      '  window.__notilusColorZilla = true;',
      '  document.documentElement.dataset.notilusColorzilla = "enabled";',
      '})();',
    ].join('\n'),
  },
  {
    id: 'react-devtools',
    name: 'React DevTools',
    description: 'Inspect React components',
    iconKey: 'code2',
    enabled: true,
    version: '5.0.0',
    homepageUrl: 'https://react.dev/learn/react-developer-tools',
    matches: ['*://*/*'],
  },
  {
    id: 'wappalyzer',
    name: 'Wappalyzer',
    description: 'Technology profiler',
    iconKey: 'bug',
    enabled: false,
    version: '6.10.67',
    homepageUrl: 'https://www.wappalyzer.com/',
    matches: ['*://*/*'],
    js: [
      '(() => {',
      '  if (window.__notilusWappalyzerBadge) return;',
      '  window.__notilusWappalyzerBadge = true;',
      '  const mark = document.createElement("meta");',
      '  mark.name = "notilus-wappalyzer";',
      '  mark.content = navigator.userAgent;',
      '  document.head.appendChild(mark);',
      '})();',
    ].join('\n'),
  },
];

function dispatchExtensionsUpdated() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(EXTENSIONS_UPDATED_EVENT));
}

function isExtensionItem(value: unknown): value is ExtensionItem {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ExtensionItem>;
  return Boolean(
    typeof candidate.id === 'string' &&
      typeof candidate.name === 'string' &&
      typeof candidate.description === 'string' &&
      typeof candidate.iconKey === 'string' &&
      typeof candidate.enabled === 'boolean' &&
      typeof candidate.version === 'string' &&
      (candidate.matches === undefined ||
        (Array.isArray(candidate.matches) &&
          candidate.matches.every(pattern => typeof pattern === 'string'))) &&
      (candidate.css === undefined || typeof candidate.css === 'string') &&
      (candidate.js === undefined || typeof candidate.js === 'string')
  );
}

function parseExtensions(value: string | null): ExtensionItem[] {
  if (!value) return [...DEFAULT_EXTENSIONS];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [...DEFAULT_EXTENSIONS];
    const items = parsed.filter(isExtensionItem);
    if (items.length === 0) return [...DEFAULT_EXTENSIONS];
    return items;
  } catch {
    return [...DEFAULT_EXTENSIONS];
  }
}

function readExtensions(): ExtensionItem[] {
  if (typeof window === 'undefined') return [...DEFAULT_EXTENSIONS];
  return parseExtensions(window.localStorage.getItem(EXTENSIONS_KEY));
}

function writeExtensions(items: ExtensionItem[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(EXTENSIONS_KEY, JSON.stringify(items));
  dispatchExtensionsUpdated();
}

export function getExtensions(): ExtensionItem[] {
  return readExtensions();
}

export function toggleExtension(id: string, enabled: boolean): ExtensionItem[] {
  const next = readExtensions().map(extension =>
    extension.id === id ? { ...extension, enabled } : extension
  );
  writeExtensions(next);
  return next;
}

export function subscribeToExtensionsUpdates(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EXTENSIONS_UPDATED_EVENT, listener);
  return () => {
    window.removeEventListener(EXTENSIONS_UPDATED_EVENT, listener);
  };
}
