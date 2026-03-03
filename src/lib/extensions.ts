import { type LucideIcon, Bug, Code2, Eye, Palette, Shield, Zap } from 'lucide-react';

export interface ExtensionItem {
  id: string;
  name: string;
  description: string;
  iconKey: string;
  enabled: boolean;
  version: string;
  homepageUrl?: string;
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
  },
  {
    id: 'dark-reader',
    name: 'Dark Reader',
    description: 'Dark mode for websites',
    iconKey: 'eye',
    enabled: true,
    version: '4.9.80',
    homepageUrl: 'https://darkreader.org/',
  },
  {
    id: 'vimium',
    name: 'Vimium',
    description: 'Keyboard navigation',
    iconKey: 'zap',
    enabled: false,
    version: '2.1.2',
    homepageUrl: 'https://vimium.github.io/',
  },
  {
    id: 'colorzilla',
    name: 'ColorZilla',
    description: 'Color picker and gradient',
    iconKey: 'palette',
    enabled: true,
    version: '3.3',
  },
  {
    id: 'react-devtools',
    name: 'React DevTools',
    description: 'Inspect React components',
    iconKey: 'code2',
    enabled: true,
    version: '5.0.0',
    homepageUrl: 'https://react.dev/learn/react-developer-tools',
  },
  {
    id: 'wappalyzer',
    name: 'Wappalyzer',
    description: 'Technology profiler',
    iconKey: 'bug',
    enabled: false,
    version: '6.10.67',
    homepageUrl: 'https://www.wappalyzer.com/',
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
      typeof candidate.version === 'string'
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
