import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getGitHubConnectionConfig, updateGitHubConnectionConfig } from '@/lib/githubRepos';
import type { User } from '@supabase/supabase-js';

export interface GitHubCredentials {
  token: string;
  username: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [credentials, setCredentials] = useState<GitHubCredentials>(() => getGitHubConnectionConfig());

  // Listen to Supabase auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Sync GitHub info from provider
        const meta = session.user.user_metadata;
        if (meta?.user_name || meta?.preferred_username) {
          const username = meta.user_name || meta.preferred_username || '';
          const token = session.provider_token || credentials.token;
          if (username) {
            const next = updateGitHubConnectionConfig({ token, username });
            setCredentials(next);
          }
        }
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const meta = session.user.user_metadata;
        if (meta?.user_name || meta?.preferred_username) {
          const username = meta.user_name || meta.preferred_username || '';
          const token = session.provider_token || credentials.token;
          if (username) {
            const next = updateGitHubConnectionConfig({ token, username });
            setCredentials(next);
          }
        }
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isConnected = Boolean(user || credentials.token || credentials.username);

  const signInWithGitHub = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.origin,
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
    await supabase.auth.signOut();
    const next = updateGitHubConnectionConfig({ token: '', username: '' });
    setCredentials(next);
    setUser(null);
  }, []);

  return {
    user,
    loading,
    isConnected,
    credentials,
    signInWithGitHub,
    saveCredentials,
    disconnect,
  };
}
