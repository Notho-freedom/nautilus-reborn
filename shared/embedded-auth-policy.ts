export type EmbeddedAuthProviderId = 'google';

export interface EmbeddedAuthPolicyMatch {
  providerId: EmbeddedAuthProviderId;
  shouldPreferNative: boolean;
  authOrigin: string;
}

const GOOGLE_AUTH_ORIGIN = 'https://accounts.google.com';

export function matchEmbeddedAuthPolicy(url: string): EmbeddedAuthPolicyMatch | null {
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.origin === GOOGLE_AUTH_ORIGIN && parsed.hostname === 'accounts.google.com') {
    return {
      providerId: 'google',
      shouldPreferNative: true,
      authOrigin: GOOGLE_AUTH_ORIGIN,
    };
  }

  return null;
}
