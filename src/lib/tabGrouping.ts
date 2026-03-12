import type { BrowserTab } from '@/hooks/useBrowserState';
import { extractDomainGroup } from '@/lib/urlDisplay';

export interface TabGroup {
  domain: string;
  color: string;
  tabs: BrowserTab[];
}

const DOMAIN_COLORS = [
  'hsl(210, 80%, 60%)',
  'hsl(150, 70%, 50%)',
  'hsl(30, 90%, 55%)',
  'hsl(270, 70%, 60%)',
  'hsl(340, 75%, 55%)',
  'hsl(185, 70%, 50%)',
  'hsl(45, 90%, 55%)',
  'hsl(0, 70%, 55%)',
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getDomainColor(domain: string): string {
  return DOMAIN_COLORS[hashString(domain) % DOMAIN_COLORS.length];
}

export function getDomainColorBg(domain: string, opacity = 0.15): string {
  const color = getDomainColor(domain);
  // Extract h, s, l from hsl(h, s%, l%)
  const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return `rgba(128,128,128,${opacity})`;
  return `hsla(${match[1]}, ${match[2]}%, ${match[3]}%, ${opacity})`;
}

export type TabGroupItem =
  | { kind: 'single'; tab: BrowserTab }
  | { kind: 'group'; group: TabGroup };

export function groupTabsByDomain(tabs: BrowserTab[]): TabGroupItem[] {
  const domainMap = new Map<string, BrowserTab[]>();
  const order: string[] = [];

  for (const tab of tabs) {
    const domain = extractDomainGroup(tab.url);
    if (!domainMap.has(domain)) {
      domainMap.set(domain, []);
      order.push(domain);
    }
    domainMap.get(domain)!.push(tab);
  }

  return order.map(domain => {
    const domainTabs = domainMap.get(domain)!;
    if (domainTabs.length === 1) {
      return { kind: 'single' as const, tab: domainTabs[0] };
    }
    return {
      kind: 'group' as const,
      group: {
        domain,
        color: getDomainColor(domain),
        tabs: domainTabs,
      },
    };
  });
}
