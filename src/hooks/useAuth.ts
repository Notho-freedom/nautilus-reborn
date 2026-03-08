import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import type { User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  display_name: string;
  avatar_url: string;
  email: string;
  github_token: string;
  github_username: string;
}

const EMPTY_PROFILE: UserProfile = {
  id: '',
  display_name: '',
  avatar_url: '',
  email: '',
  github_token: '',
  github_username: '',
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) {
      setProfile(data as unknown as UserProfile);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => void fetchProfile(session.user.id), 0);
        } else {
          setProfile(EMPTY_PROFILE);
        }
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        void fetchProfile(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(EMPTY_PROFILE);
  }, []);

  const updateGitHubCredentials = useCallback(async (token: string, username: string) => {
    if (!user) return;
    await supabase
      .from('profiles')
      .update({ github_token: token, github_username: username, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    setProfile(prev => ({ ...prev, github_token: token, github_username: username }));
  }, [user]);

  return {
    user,
    profile,
    isAuthenticated: Boolean(user),
    isLoading,
    signInWithGoogle,
    signOut,
    updateGitHubCredentials,
  };
}
