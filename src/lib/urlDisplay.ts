import { getDomain } from 'tldts';

export function extractDisplayDomain(url: string): string {
  if (!url) return '';

  if (url.startsWith('notilus://')) {
    return url.replace('notilus://', 'notilus/');
  }

  try {
    return new URL(url).hostname;
  } catch {
    return url.replace(/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//, '');
  }
}

export function extractDomainGroup(url: string): string {
  if (!url) return '';
  if (url.startsWith('notilus://')) return 'notilus://';

  const host = extractDisplayDomain(url);
  if (!host) return '';

  const domain = getDomain(host);
  return domain ?? host;
}
