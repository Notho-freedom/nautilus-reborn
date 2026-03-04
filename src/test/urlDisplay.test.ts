import { describe, expect, it } from 'vitest';
import { extractDisplayDomain, extractDomainGroup } from '@/lib/urlDisplay';

describe('urlDisplay helpers', () => {
  it('groups subdomains under the same root domain', () => {
    expect(extractDomainGroup('https://www.google.com')).toBe('google.com');
    expect(extractDomainGroup('https://mail.google.com')).toBe('google.com');
  });

  it('separates different domains', () => {
    expect(extractDomainGroup('https://github.com')).not.toBe(extractDomainGroup('https://google.com'));
  });

  it('handles internal or invalid urls safely', () => {
    expect(extractDomainGroup('notilus://speed-dial')).toBe('notilus://');
    expect(extractDisplayDomain('notaurl')).toBe('notaurl');
  });
});
