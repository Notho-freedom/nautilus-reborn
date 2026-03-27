import { describe, expect, it } from 'vitest';
import { matchEmbeddedAuthPolicy } from '../../shared/embedded-auth-policy';

describe('matchEmbeddedAuthPolicy', () => {
  it('prefers native mode for Google account auth pages', () => {
    expect(matchEmbeddedAuthPolicy('https://accounts.google.com/signin/v2/identifier')).toEqual({
      providerId: 'google',
      shouldPreferNative: true,
      authOrigin: 'https://accounts.google.com',
    });
  });

  it('does not match regular Google product origins', () => {
    expect(matchEmbeddedAuthPolicy('https://mail.google.com/mail/u/0/#inbox')).toBeNull();
    expect(matchEmbeddedAuthPolicy('https://drive.google.com/drive/home')).toBeNull();
  });

  it('does not match unrelated origins', () => {
    expect(matchEmbeddedAuthPolicy('https://example.com/login')).toBeNull();
  });
});
