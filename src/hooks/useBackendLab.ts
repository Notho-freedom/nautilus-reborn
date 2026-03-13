import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BackendLabSidecarState } from '../../shared/browser-contract';
import type {
  CapturedRequest,
  ConsoleLogEntry,
  DiscoveredRoute,
  DiscoveredServer,
  LoadTestResult,
  OverviewStats,
  TestResult,
  Vulnerability,
} from '@/types/backendLab';
import {
  backendLabClearCaptures,
  backendLabClearConsoleLogs,
  backendLabDiscoverRoutes,
  backendLabGetCaptures,
  backendLabGetConsoleLogs,
  backendLabGetOverview,
  backendLabGetServers,
  backendLabGetTestResults,
  backendLabGetVulnerabilities,
  backendLabHealthCheck,
  backendLabReplayCapture,
  backendLabRunLoadTest,
  backendLabRunQuickTest,
  backendLabRunSecurityScan,
  backendLabScanServers,
  createBackendLabConsoleSocket,
} from '@/lib/backendLabClient';
import {
  desktopEnqueueBackendLabJob,
  desktopGetBackendLabJob,
  desktopGetBackendLabState,
  desktopRestartBackendLab,
  desktopStartBackendLab,
  desktopStopBackendLab,
  isDesktopRuntime,
  onDesktopBackendLabStateChanged,
} from '@/lib/electronBridge';
import type { BackendLabJobStatus } from '../../shared/browser-contract';

interface BackendLabLoadingState {
  refreshing: boolean;
  scanning: boolean;
  runningQuickTest: boolean;
  runningSecurityScan: boolean;
  runningLoadTest: boolean;
  clearingCaptures: boolean;
  clearingConsole: boolean;
}

type BackendLabJobKey = 'scanServers' | 'discoverRoutes' | 'runSecurityScan' | 'runLoadTest';

type BackendLabJobState = Record<BackendLabJobKey, BackendLabJobStatus | null>;

const EMPTY_LOADING_STATE: BackendLabLoadingState = {
  refreshing: false,
  scanning: false,
  runningQuickTest: false,
  runningSecurityScan: false,
  runningLoadTest: false,
  clearingCaptures: false,
  clearingConsole: false,
};

const DEFAULT_SIDECAR_STATE: BackendLabSidecarState = {
  isRunning: false,
  isStarting: false,
  isStopping: false,
  error: null,
  backendPath: null,
  healthUrl: 'http://127.0.0.1:8000/api/health',
  port: 8000,
  logs: [],
  lastHealthyAt: null,
  restartAttempts: 0,
};

function appendLimited<T>(previous: T[], next: T[], limit = 1000): T[] {
  const merged = [...previous, ...next];
  return merged.length > limit ? merged.slice(merged.length - limit) : merged;
}

export function useBackendLab() {
  const [sidecarState, setSidecarState] = useState<BackendLabSidecarState>(DEFAULT_SIDECAR_STATE);
  const [backendReachable, setBackendReachable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<BackendLabLoadingState>(EMPTY_LOADING_STATE);

  const [servers, setServers] = useState<DiscoveredServer[]>([]);
  const [routes, setRoutes] = useState<DiscoveredRoute[]>([]);
  const [tests, setTests] = useState<TestResult[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [loadTests, setLoadTests] = useState<LoadTestResult[]>([]);
  const [captures, setCaptures] = useState<CapturedRequest[]>([]);
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLogEntry[]>([]);
  const [jobStatus, setJobStatus] = useState<BackendLabJobState>({
    scanServers: null,
    discoverRoutes: null,
    runSecurityScan: null,
    runLoadTest: null,
  });

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  const pollJobRef = useRef<(
    jobId: string,
    jobKey: BackendLabJobKey,
    onComplete: (result: unknown) => void
  ) => Promise<void>>();

  const markLoading = useCallback((key: keyof BackendLabLoadingState, value: boolean) => {
    setLoading(previous => ({
      ...previous,
      [key]: value,
    }));
  }, []);

  const checkReachability = useCallback(async () => {
    try {
      await backendLabHealthCheck();
      setBackendReachable(true);
      setError(null);
      return true;
    } catch (cause) {
      setBackendReachable(false);
      setError(cause instanceof Error ? cause.message : 'Backend health check failed');
      return false;
    }
  }, []);

  const refreshAll = useCallback(async () => {
    markLoading('refreshing', true);
    try {
      const healthy = await checkReachability();
      if (!healthy) {
        return;
      }

      const [nextServers, nextCaptures, nextVulnerabilities, nextTests, nextOverview] = await Promise.all([
        backendLabGetServers(),
        backendLabGetCaptures(),
        backendLabGetVulnerabilities(),
        backendLabGetTestResults(),
        backendLabGetOverview(),
      ]);

      setServers(nextServers);
      setCaptures(nextCaptures);
      setVulnerabilities(nextVulnerabilities);
      setTests(nextTests);
      setOverview(nextOverview);

      if (nextServers.length > 0) {
        const routesByServer = await Promise.all(
          nextServers.map(server => backendLabDiscoverRoutes(server.id).catch(() => [] as DiscoveredRoute[]))
        );
        setRoutes(routesByServer.flat());
      } else {
        setRoutes([]);
      }

      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to refresh Backend Lab data');
    } finally {
      markLoading('refreshing', false);
    }
  }, [checkReachability, markLoading]);

  const scanServers = useCallback(async () => {
    markLoading('scanning', true);
    try {
      if (!isDesktopRuntime()) {
        const nextServers = await backendLabScanServers();
        setServers(nextServers);
        const routesByServer = await Promise.all(
          nextServers.map(server => backendLabDiscoverRoutes(server.id).catch(() => [] as DiscoveredRoute[]))
        );
        setRoutes(routesByServer.flat());
        setError(null);
        return;
      }

      const job = await desktopEnqueueBackendLabJob({ type: 'scanServers' });
      if (!job) {
        setError('Unable to queue server scan job.');
        return;
      }
      await pollJob(job.jobId, 'scanServers', result => {
        const servers = Array.isArray(result) ? (result as DiscoveredServer[]) : [];
        setServers(servers);
      });
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Server scan failed');
    } finally {
      markLoading('scanning', false);
    }
  }, [markLoading, pollJob]);

  const discoverRoutes = useCallback(async (serverId: string) => {
    try {
      if (!isDesktopRuntime()) {
        const discovered = await backendLabDiscoverRoutes(serverId);
        setRoutes(previous => {
          const filtered = previous.filter(route => route.server_id !== serverId);
          return [...filtered, ...discovered];
        });
        setError(null);
        return discovered;
      }

      const job = await desktopEnqueueBackendLabJob({
        type: 'discoverRoutes',
        payload: { serverId },
      });
      if (!job) {
        setError('Unable to queue route discovery.');
        return [];
      }
      let output: DiscoveredRoute[] = [];
      await pollJob(job.jobId, 'discoverRoutes', result => {
        output = Array.isArray(result) ? (result as DiscoveredRoute[]) : [];
        setRoutes(previous => {
          const filtered = previous.filter(route => route.server_id !== serverId);
          return [...filtered, ...output];
        });
      });
      setError(null);
      return output;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Route discovery failed');
      return [];
    }
  }, [pollJob]);

  const runQuickTest = useCallback(
    async (payload: { method: string; url: string; body?: string; headers?: Record<string, string> }) => {
      markLoading('runningQuickTest', true);
      try {
        const result = await backendLabRunQuickTest({
          method: payload.method,
          url: payload.url,
          body: payload.body,
          headers: payload.headers,
          bodyType: payload.body ? 'json' : 'none',
        });
        setTests(previous => [result, ...previous].slice(0, 100));
        setError(null);
        return result;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Quick test failed');
        return null;
      } finally {
        markLoading('runningQuickTest', false);
      }
    },
    [markLoading]
  );

  const runSecurityScan = useCallback(async () => {
    markLoading('runningSecurityScan', true);
    try {
      if (!isDesktopRuntime()) {
        const result = await backendLabRunSecurityScan({
          serverIds: servers.map(server => server.id),
        });
        setVulnerabilities(result.vulnerabilities);
        setError(null);
        return result;
      }
      const job = await desktopEnqueueBackendLabJob({
        type: 'runSecurityScan',
        payload: { serverIds: servers.map(server => server.id) },
      });
      if (!job) {
        setError('Unable to queue security scan.');
        return null;
      }
      let output: { vulnerabilities?: Vulnerability[] } | null = null;
      await pollJob(job.jobId, 'runSecurityScan', result => {
        output = (result as { vulnerabilities?: Vulnerability[] }) ?? null;
        setVulnerabilities(output?.vulnerabilities ?? []);
      });
      setError(null);
      return output;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Security scan failed');
      return null;
    } finally {
      markLoading('runningSecurityScan', false);
    }
  }, [markLoading, pollJob, servers]);

  const runLoadTest = useCallback(
    async (payload: {
      name: string;
      targetUrl: string;
      virtualUsers: number;
      durationSec: number;
      rampUpSec: number;
    }) => {
      markLoading('runningLoadTest', true);
      try {
        if (!isDesktopRuntime()) {
          const result = await backendLabRunLoadTest(payload);
          setLoadTests(previous => [result, ...previous].slice(0, 50));
          setError(null);
          return result;
        }
        const job = await desktopEnqueueBackendLabJob({
          type: 'runLoadTest',
          payload,
        });
        if (!job) {
          setError('Unable to queue load test.');
          return null;
        }
        let output: LoadTestResult | null = null;
        await pollJob(job.jobId, 'runLoadTest', result => {
          output = (result as LoadTestResult) ?? null;
          if (output) {
            setLoadTests(previous => [output as LoadTestResult, ...previous].slice(0, 50));
          }
        });
        setError(null);
        return output;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Load test failed');
        return null;
      } finally {
        markLoading('runningLoadTest', false);
      }
    },
    [markLoading, pollJob]
  );

  const replayCapture = useCallback(async (captureId: string) => {
    try {
      const replayed = await backendLabReplayCapture(captureId);
      setCaptures(previous => [replayed, ...previous].slice(0, 200));
      setError(null);
      return replayed;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Replay capture failed');
      return null;
    }
  }, []);

  const clearCaptures = useCallback(async () => {
    markLoading('clearingCaptures', true);
    try {
      await backendLabClearCaptures();
      setCaptures([]);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to clear captures');
    } finally {
      markLoading('clearingCaptures', false);
    }
  }, [markLoading]);

  const clearConsole = useCallback(async () => {
    markLoading('clearingConsole', true);
    try {
      await backendLabClearConsoleLogs();
      setConsoleLogs([]);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to clear console logs');
    } finally {
      markLoading('clearingConsole', false);
    }
  }, [markLoading]);

  const startSidecar = useCallback(async () => {
    const next = await desktopStartBackendLab();
    if (next) setSidecarState(next);
  }, []);

  const pollJob = useCallback(
    async (
      jobId: string,
      jobKey: BackendLabJobKey,
      onComplete: (result: unknown) => void
    ) => {
      const maxIterations = 180;
      for (let i = 0; i < maxIterations; i += 1) {
        const status = await desktopGetBackendLabJob({ jobId });
        if (status) {
          setJobStatus(previous => ({ ...previous, [jobKey]: status }));
          if (status.status === 'completed') {
            onComplete(status.result);
            return;
          }
          if (status.status === 'failed') {
            setError(status.error ?? 'Backend job failed');
            return;
          }
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      setError('Backend job timed out');
    },
    []
  );

  pollJobRef.current = pollJob;

  const stopSidecar = useCallback(async () => {
    const next = await desktopStopBackendLab();
    if (next) setSidecarState(next);
  }, []);

  const restartSidecar = useCallback(async () => {
    const next = await desktopRestartBackendLab();
    if (next) setSidecarState(next);
  }, []);

  useEffect(() => {
    if (!isDesktopRuntime()) return;

    let mounted = true;
    void desktopGetBackendLabState().then(state => {
      if (!mounted || !state) return;
      setSidecarState(state);
    });

    const unsubscribe = onDesktopBackendLabStateChanged(state => {
      if (!mounted) return;
      setSidecarState(state);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!sidecarState.isRunning) {
      setBackendReachable(false);
      return;
    }
    void refreshAll();
  }, [refreshAll, sidecarState.isRunning]);

  useEffect(() => {
    if (!backendReachable) {
      socketRef.current?.close();
      socketRef.current = null;
      if (reconnectTimerRef.current != null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      return;
    }

    let closedByEffect = false;

    const connect = () => {
      if (closedByEffect) return;

      const socket = createBackendLabConsoleSocket();
      socketRef.current = socket;

      socket.onmessage = event => {
        try {
          const parsed = JSON.parse(String(event.data)) as ConsoleLogEntry;
          setConsoleLogs(previous => appendLimited(previous, [parsed], 1000));
        } catch {
          // Ignore non-json messages.
        }
      };

      socket.onclose = () => {
        socketRef.current = null;
        if (closedByEffect) return;
        reconnectTimerRef.current = window.setTimeout(connect, 2_000);
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    void backendLabGetConsoleLogs(200)
      .then(initial => {
        if (closedByEffect) return;
        setConsoleLogs(initial);
      })
      .catch(() => {
        // Keep existing logs.
      });

    connect();

    return () => {
      closedByEffect = true;
      socketRef.current?.close();
      socketRef.current = null;
      if (reconnectTimerRef.current != null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [backendReachable]);

  const routesByServer = useMemo(() => {
    return routes.reduce<Record<string, DiscoveredRoute[]>>((acc, route) => {
      if (!acc[route.server_id]) {
        acc[route.server_id] = [];
      }
      acc[route.server_id].push(route);
      return acc;
    }, {});
  }, [routes]);

  return {
    sidecarState,
    backendReachable,
    loading,
    error,
    jobStatus,
    servers,
    routes,
    routesByServer,
    tests,
    vulnerabilities,
    loadTests,
    captures,
    overview,
    consoleLogs,
    refreshAll,
    scanServers,
    discoverRoutes,
    runQuickTest,
    runSecurityScan,
    runLoadTest,
    replayCapture,
    clearCaptures,
    clearConsole,
    startSidecar,
    stopSidecar,
    restartSidecar,
  };
}
