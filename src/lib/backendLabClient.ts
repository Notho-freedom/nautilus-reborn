import type {
  CapturedRequest,
  ConsoleLogEntry,
  DiscoveredRoute,
  DiscoveredServer,
  LoadTestResult,
  OverviewStats,
  SecurityScanResult,
  TestResult,
  Vulnerability,
} from '@/types/backendLab';

const DEFAULT_BACKEND_LAB_BASE_URL = 'http://127.0.0.1:8000';

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export function resolveBackendLabBaseUrl(): string {
  const envValue = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.
    VITE_BACKEND_LAB_URL;
  const candidate = (envValue ?? '').trim();
  if (!candidate) {
    return DEFAULT_BACKEND_LAB_BASE_URL;
  }
  return trimTrailingSlash(candidate);
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  timeoutMs?: number;
}

async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 30_000;
  const timer = window.setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const baseUrl = resolveBackendLabBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    body: options.body != null ? JSON.stringify(options.body) : undefined,
    signal: controller.signal,
  }).finally(() => {
    window.clearTimeout(timer);
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function backendLabHealthCheck(): Promise<{ status: string; service?: string }> {
  return requestJson('/api/backend-lab/analytics/health', { timeoutMs: 5_000 });
}

export async function backendLabScanServers(): Promise<DiscoveredServer[]> {
  const payload = await requestJson<{ servers_found?: DiscoveredServer[] }>('/api/backend-lab/servers/scan', {
    method: 'POST',
    body: {
      enable_fingerprinting: true,
    },
    timeoutMs: 120_000,
  });
  return payload.servers_found ?? [];
}

export async function backendLabGetServers(): Promise<DiscoveredServer[]> {
  return requestJson('/api/backend-lab/servers/servers');
}

export async function backendLabDiscoverRoutes(serverId: string): Promise<DiscoveredRoute[]> {
  return requestJson(`/api/backend-lab/routes/discover/${encodeURIComponent(serverId)}`, {
    method: 'POST',
    body: {
      use_openapi: true,
      use_graphql: true,
      use_fuzzing: true,
    },
    timeoutMs: 120_000,
  });
}

export async function backendLabGetRoutes(serverId: string): Promise<DiscoveredRoute[]> {
  return requestJson(`/api/backend-lab/routes/${encodeURIComponent(serverId)}`);
}

export async function backendLabRunQuickTest(payload: {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  bodyType?: string;
}): Promise<TestResult> {
  return requestJson('/api/backend-lab/tests/run', {
    method: 'POST',
    body: {
      method: payload.method,
      url: payload.url,
      headers: payload.headers ?? {},
      body: payload.body ?? null,
      body_type: payload.bodyType ?? 'none',
    },
    timeoutMs: 45_000,
  });
}

export async function backendLabGetTestResults(limit = 100): Promise<TestResult[]> {
  return requestJson(`/api/backend-lab/tests/results?limit=${limit}`);
}

export async function backendLabRunSecurityScan(payload?: {
  serverIds?: string[];
  routeIds?: string[];
}): Promise<SecurityScanResult> {
  return requestJson('/api/backend-lab/security/scan', {
    method: 'POST',
    body: {
      server_ids: payload?.serverIds ?? [],
      route_ids: payload?.routeIds ?? [],
      test_injections: true,
      test_xss: true,
      test_headers: true,
      test_cors: true,
      test_rate_limiting: true,
    },
    timeoutMs: 300_000,
  });
}

export async function backendLabGetVulnerabilities(): Promise<Vulnerability[]> {
  return requestJson('/api/backend-lab/security/vulnerabilities');
}

export async function backendLabRunLoadTest(payload: {
  name: string;
  targetUrl: string;
  virtualUsers: number;
  durationSec: number;
  rampUpSec: number;
}): Promise<LoadTestResult> {
  return requestJson('/api/backend-lab/performance/load', {
    method: 'POST',
    body: {
      name: payload.name,
      target_url: payload.targetUrl,
      virtual_users: payload.virtualUsers,
      duration_sec: payload.durationSec,
      ramp_up_time_sec: payload.rampUpSec,
    },
    timeoutMs: 300_000,
  });
}

export async function backendLabGetLoadTestResult(runId: string): Promise<LoadTestResult> {
  return requestJson(`/api/backend-lab/performance/runs/${encodeURIComponent(runId)}`);
}

export async function backendLabGetCaptures(limit = 100): Promise<CapturedRequest[]> {
  return requestJson(`/api/backend-lab/intercept/captures?limit=${limit}`);
}

export async function backendLabReplayCapture(captureId: string): Promise<CapturedRequest> {
  return requestJson(`/api/backend-lab/intercept/captures/${encodeURIComponent(captureId)}/replay`, {
    method: 'POST',
    timeoutMs: 60_000,
  });
}

export async function backendLabClearCaptures(): Promise<void> {
  await requestJson('/api/backend-lab/intercept/captures', {
    method: 'DELETE',
    timeoutMs: 30_000,
  });
}

export async function backendLabGetOverview(): Promise<OverviewStats> {
  return requestJson('/api/backend-lab/analytics/overview');
}

export async function backendLabGetConsoleLogs(limit = 200): Promise<ConsoleLogEntry[]> {
  return requestJson(`/api/backend-lab/console/logs?limit=${limit}`);
}

export async function backendLabClearConsoleLogs(): Promise<void> {
  await requestJson('/api/backend-lab/console/logs', {
    method: 'DELETE',
  });
}

export function createBackendLabConsoleSocket(): WebSocket {
  const baseUrl = resolveBackendLabBaseUrl();
  const wsUrl = baseUrl.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
  return new WebSocket(`${wsUrl}/api/backend-lab/console/ws`);
}
