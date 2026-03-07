import type { ExtensionItem } from './extensions';
import { getExtensions } from './extensions';

export interface RuntimeExtensionEffect {
  id: string;
  css?: string;
  js?: string;
}

function wildcardToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  const regexSource = `^${escaped.replace(/\*/g, '.*')}$`;
  return new RegExp(regexSource, 'i');
}

function matchesUrl(extension: ExtensionItem, url: string): boolean {
  const patterns = extension.matches;
  if (!patterns || patterns.length === 0) return true;
  return patterns.some(pattern => {
    try {
      return wildcardToRegExp(pattern).test(url);
    } catch {
      return false;
    }
  });
}

export function getRuntimeExtensionsForUrl(url: string): RuntimeExtensionEffect[] {
  return getExtensions()
    .filter(extension => extension.enabled)
    .filter(extension => matchesUrl(extension, url))
    .map(extension => ({
      id: extension.id,
      css: extension.css,
      js: extension.js,
    }));
}

export function buildRuntimeExtensionSignature(url: string): string {
  const effects = getRuntimeExtensionsForUrl(url);
  return JSON.stringify(
    effects.map(effect => ({
      id: effect.id,
      hasCss: Boolean(effect.css),
      hasJs: Boolean(effect.js),
    }))
  );
}
