import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getGitHubConnectionConfig, updateGitHubConnectionConfig } from '@/lib/githubRepos';
import type { Session, User } from '@supabase/supabase-js';

export interface GitHubCredentials {
  token: string;
  username: string;
}

interface SignInWithGitHubOptions {
  openInNautilusTab?: boolean;
  openAuthInTab?: (url: string) => void;
}

interface GitHubOAuthCompletionResult {
  handled: boolean;
  success: boolean;
}

function parseHashParams(hash: string): URLSearchParams {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw) return new URLSearchParams();
  if (raw.startsWith('/')) {
    const queryStart = raw.indexOf('?');
    if (queryStart >= 0) {
      return new URLSearchParams(raw.slice(queryStart + 1));
    }
    return new URLSearchParams();
  }
  return new URLSearchParams(raw);
}

function hasOAuthPayload(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hashParams = parseHashParams(parsed.hash);
    const searchParams = parsed.searchParams;
    return Boolean(
      searchParams.get('code') ||
        searchParams.get('error') ||
        searchParams.get('error_description') ||
        hashParams.get('access_token') ||
        hashParams.get('refresh_token') ||
        hashParams.get('error') ||
        hashParams.get('error_description')
    );
  } catch {
    return false;
  }
}

function resolveGitHubAvatarUrl(user: User | null, fallbackUsername?: string): string {
  if (!user) return '';
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const avatarCandidate = meta.avatar_url ?? meta.picture;
  if (typeof avatarCandidate === 'string' && avatarCandidate.trim()) {
    return avatarCandidate.trim();
  }
  const usernameCandidate = resolveGitHubUsername(user) || (fallbackUsername ?? '').trim();
  if (!usernameCandidate) return '';
  return `https://github.com/${usernameCandidate}.png?size=80`;
}

function normalizeCredentials(value: Partial<GitHubCredentials>): GitHubCredentials {
  return {
    token: (value.token ?? '').trim(),
    username: (value.username ?? '').trim(),
  };
}

function resolveGitHubUsername(user: User | null): string {
  if (!user) return '';
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const candidates = [
    meta.user_name,
    meta.preferred_username,
    meta.username,
    meta.login,
    user.email?.split('@')[0],
  ];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const trimmed = candidate.trim();
    if (trimmed) return trimmed;
  }
  return '';
}

async function readProfileCredentials(userId: string): Promise<GitHubCredentials> {
  const { data, error } = await supabase
    .from('profiles')
    .select('github_token,github_username')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return { token: '', username: '' };
  }

  return normalizeCredentials({
    token: data.github_token ?? '',
    username: data.github_username ?? '',
  });
}

async function upsertProfileCredentials(
  user: User,
  credentials: GitHubCredentials
): Promise<void> {
  const payload = {
    id: user.id,
    email: user.email ?? null,
    github_token: credentials.token || null,
    github_username: credentials.username || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
  if (error) {
    // Non-blocking: UI continues with session/local credentials.
    console.warn('[auth] unable to sync GitHub profile in Supabase:', error.message);
  }
}

const PROFILE_CACHE_KEY = 'notilus_profile_cache';

interface CachedProfile {
  avatarUrl: string;
  username: string;
  updatedAt: string;
}

function readCachedProfile(): CachedProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedProfile;
  } catch {
    return null;
  }
}

function writeCachedProfile(profile: CachedProfile) {
  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
  } catch { /* noop */ }
}

function resolveOAuthRedirect(): string {
  const configured = import.meta.env.VITE_SUPABASE_AUTH_REDIRECT_URL;
  if (typeof configured === 'string' && configured.trim()) {
    return configured.trim();
  }
  return window.location.origin;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [credentials, setCredentials] = useState<GitHubCredentials>(() => getGitHubConnectionConfig());
  const [isSupabaseGitHubSession, setIsSupabaseGitHubSession] = useState(false);
  const [githubAvatarUrl, setGitHubAvatarUrl] = useState(() => readCachedProfile()?.avatarUrl ?? '');
  const [isGitHubAuthFlowPending, setIsGitHubAuthFlowPending] = useState(false);

  useEffect(() => {
    let mounted = true;

    const hydrateFromSession = async (session: Session | null) => {
      if (!mounted) return;

      const local = getGitHubConnectionConfig();
      const signedUser = session?.user ?? null;
      setUser(signedUser);

      if (!signedUser) {
        setCredentials(local);
        setIsSupabaseGitHubSession(false);
        setGitHubAvatarUrl('');
        setLoading(false);
        return;
      }

      const sessionCredentials = normalizeCredentials({
        token: session?.provider_token ?? '',
        username: resolveGitHubUsername(signedUser),
      });

      const profileCredentials = await readProfileCredentials(signedUser.id);
      if (!mounted) return;

      const merged = normalizeCredentials({
        token:
          sessionCredentials.token ||
          profileCredentials.token ||
          local.token,
        username:
          sessionCredentials.username ||
          profileCredentials.username ||
          local.username,
      });

      setCredentials(merged);
      setIsSupabaseGitHubSession(Boolean(sessionCredentials.token || sessionCredentials.username));
      const avatarUrl = resolveGitHubAvatarUrl(signedUser, merged.username);
      setGitHubAvatarUrl(avatarUrl);
      setIsGitHubAuthFlowPending(false);
      updateGitHubConnectionConfig(merged);

      // Cache profile locally for instant hydration
      if (avatarUrl || merged.username) {
        writeCachedProfile({
          avatarUrl,
          username: merged.username,
          updatedAt: new Date().toISOString(),
        });
      }

      if (sessionCredentials.token || sessionCredentials.username) {
        void upsertProfileCredentials(signedUser, merged);
      }
      setLoading(false);
    };

    void supabase.auth.getSession().then(({ data: { session } }) => {
      void hydrateFromSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void hydrateFromSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isConnected = Boolean(user || credentials.token || credentials.username);

  const signInWithGitHub = useCallback(async (options?: SignInWithGitHubOptions) => {
    const redirectTo = resolveOAuthRedirect();
    const shouldOpenInNautilusTab = Boolean(options?.openInNautilusTab && options.openAuthInTab);

    if (shouldOpenInNautilusTab) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo,
          scopes: 'repo read:user',
          skipBrowserRedirect: true,
        },
      });
      if (error) {
        console.error('GitHub OAuth error:', error.message);
        return;
      }
      if (data?.url) {
        setIsGitHubAuthFlowPending(true);
        options?.openAuthInTab?.(data.url);
        return;
      }
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo,
        scopes: 'repo read:user',
      },
    });
    if (error) {
      console.error('GitHub OAuth error:', error.message);
    }
  }, []);

  const completeGitHubOAuthFromUrl = useCallback(async (url: string): Promise<GitHubOAuthCompletionResult> => {
    if (!hasOAuthPayload(url)) {
      return { handled: false, success: false };
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return { handled: false, success: false };
    }

    const searchParams = parsed.searchParams;
    const hashParams = parseHashParams(parsed.hash);
    const errorMessage =
      searchParams.get('error_description') ||
      hashParams.get('error_description') ||
      searchParams.get('error') ||
      hashParams.get('error');

    if (errorMessage) {
      setIsGitHubAuthFlowPending(false);
      console.error('GitHub OAuth callback error:', errorMessage);
      return { handled: true, success: false };
    }

    const code = searchParams.get('code');
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      setIsGitHubAuthFlowPending(false);
      if (error) {
        console.error('GitHub OAuth code exchange error:', error.message);
        return { handled: true, success: false };
      }
      return { handled: true, success: true };
    }

    const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      setIsGitHubAuthFlowPending(false);
      if (error) {
        console.error('GitHub OAuth token session error:', error.message);
        return { handled: true, success: false };
      }
      return { handled: true, success: true };
    }

    return { handled: false, success: false };
  }, []);

  const saveCredentials = useCallback((token: string, username: string) => {
    const next = updateGitHubConnectionConfig({ token, username });
    setCredentials(next);
  }, []);

  const disconnect = useCallback(async () => {
    if (user) {
      void upsertProfileCredentials(user, { token: '', username: '' });
    }
    await supabase.auth.signOut();
    const next = updateGitHubConnectionConfig({ token: '', username: '' });
    setCredentials(next);
    setUser(null);
    setIsSupabaseGitHubSession(false);
    setGitHubAvatarUrl('');
    setIsGitHubAuthFlowPending(false);
  }, []);

  return {
    user,
    loading,
    isConnected,
    isSupabaseGitHubSession,
    isGitHubAuthFlowPending,
    githubAvatarUrl,
    credentials,
    signInWithGitHub,
    completeGitHubOAuthFromUrl,
    saveCredentials,
    disconnect,
  };
}
