import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getGitHubConnectionConfig, updateGitHubConnectionConfig } from '@/lib/githubRepos';
import type { Session, User } from '@supabase/supabase-js';

export interface GitHubCredentials {
  token: string;
  username: string;
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
  const [githubAvatarUrl, setGitHubAvatarUrl] = useState('');

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
      setGitHubAvatarUrl(resolveGitHubAvatarUrl(signedUser, merged.username));
      updateGitHubConnectionConfig(merged);

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

  const signInWithGitHub = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: resolveOAuthRedirect(),
        scopes: 'repo read:user',
      },
    });
    if (error) {
      console.error('GitHub OAuth error:', error.message);
    }
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
  }, []);

  return {
    user,
    loading,
    isConnected,
    isSupabaseGitHubSession,
    githubAvatarUrl,
    credentials,
    signInWithGitHub,
    saveCredentials,
    disconnect,
  };
}
