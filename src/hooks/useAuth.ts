import { useCallback, useState } from 'react';
import { getGitHubConnectionConfig, updateGitHubConnectionConfig } from '@/lib/githubRepos';

export interface GitHubCredentials {
  token: string;
  username: string;
}

export function useAuth() {
  const [credentials, setCredentials] = useState<GitHubCredentials>(() => getGitHubConnectionConfig());

  const isConnected = Boolean(credentials.token || credentials.username);

  const saveCredentials = useCallback((token: string, username: string) => {
    const next = updateGitHubConnectionConfig({ token, username });
    setCredentials(next);
  }, []);

  const disconnect = useCallback(() => {
    const next = updateGitHubConnectionConfig({ token: '', username: '' });
    setCredentials(next);
  }, []);

  return {
    isConnected,
    credentials,
    saveCredentials,
    disconnect,
  };
}
