import { beforeEach, describe, expect, it } from 'vitest';
import { getExtensions, toggleExtension } from '@/lib/extensions';

describe('extensions storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('loads default extension catalog', () => {
    const extensions = getExtensions();
    expect(extensions.length).toBeGreaterThan(0);
    expect(extensions.some(extension => extension.id === 'react-devtools')).toBe(true);
  });

  it('persists toggle state', () => {
    const before = getExtensions().find(extension => extension.id === 'vimium');
    expect(before).toBeDefined();
    toggleExtension('vimium', true);
    const after = getExtensions().find(extension => extension.id === 'vimium');
    expect(after?.enabled).toBe(true);
  });
});
