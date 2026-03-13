const BLOCKED_HOSTS_KEY = 'notilus_native_view_hosts';
const SEED_BLOCKED_HOSTS = new Set([
  'chatgpt.com',
  'chat.openai.com',
  'openai.com',
  'whatsapp.com',
  'web.whatsapp.com',
]);

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '');
}

export function extractHost(url: string): string | null {
  if (!url) return null;
  try {
    return normalizeHost(new URL(url).hostname);
  } catch {
    return null;
  }
}

export function loadBlockedHosts(): Set<string> {
  if (typeof window === 'undefined') return new Set(SEED_BLOCKED_HOSTS);
  try {
    const raw = window.localStorage.getItem(BLOCKED_HOSTS_KEY);
    if (!raw) return new Set(SEED_BLOCKED_HOSTS);
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set(SEED_BLOCKED_HOSTS);
    const entries = parsed.filter((entry): entry is string => typeof entry === 'string');
    return new Set([...SEED_BLOCKED_HOSTS, ...entries.map(normalizeHost)]);
  } catch {
    return new Set(SEED_BLOCKED_HOSTS);
  }
}

export function persistBlockedHosts(hosts: Set<string>): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(BLOCKED_HOSTS_KEY, JSON.stringify([...hosts]));
}

export function shouldUseNativeView(url: string, blockedHosts?: Set<string>): boolean {
  const host = extractHost(url);
  if (!host) return false;
  const hosts = blockedHosts ?? loadBlockedHosts();
  return hosts.has(host);
}

export function addBlockedHostFromUrl(url: string, blockedHosts?: Set<string>): Set<string> {
  const host = extractHost(url);
  if (!host) return blockedHosts ?? loadBlockedHosts();
  const hosts = blockedHosts ?? loadBlockedHosts();
  if (!hosts.has(host)) {
    hosts.add(host);
    persistBlockedHosts(hosts);
  }
  return hosts;
}
