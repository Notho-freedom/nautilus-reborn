import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bug,
  ChartBar,
  Database,
  Play,
  RefreshCw,
  Route,
  Server,
  Shield,
  Terminal,
  Trash2,
  Wrench,
} from 'lucide-react';
import { SidebarPanelShell } from './SidebarPanelShell';
import { useBackendLab } from '@/hooks/useBackendLab';
import { cn } from '@/lib/utils';
import type {
  CapturedRequest,
  ConsoleLogEntry,
  DiscoveredRoute,
  DiscoveredServer,
  LoadTestResult,
  TestResult,
  Vulnerability,
} from '@/types/backendLab';
import type { BackendLabJobStatus } from '../../../shared/browser-contract';

interface BackendLabPanelProps {
  onClose?: () => void;
  embedded?: boolean;
}

type BackendLabTabId =
  | 'overview'
  | 'servers'
  | 'routes'
  | 'tests'
  | 'security'
  | 'performance'
  | 'capture'
  | 'console';

const TABS: Array<{ id: BackendLabTabId; label: string; icon: React.ComponentType<any> }> = [
  { id: 'overview', label: 'Overview', icon: ChartBar },
  { id: 'servers', label: 'Servers', icon: Server },
  { id: 'routes', label: 'Routes', icon: Route },
  { id: 'tests', label: 'Tests API', icon: Bug },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'performance', label: 'Performance', icon: Wrench },
  { id: 'capture', label: 'Capture', icon: Database },
  { id: 'console', label: 'Console', icon: Terminal },
];

function statusColor(status?: string): string {
  if (!status) return 'text-muted-foreground';
  const value = status.toLowerCase();
  if (value === 'running' || value === 'healthy') return 'text-green-400';
  if (value === 'degraded' || value === 'unknown') return 'text-yellow-400';
  if (value === 'stopped' || value === 'unhealthy' || value === 'error') return 'text-red-400';
  return 'text-muted-foreground';
}

function methodColor(method: string): string {
  const value = method.toUpperCase();
  if (value === 'GET') return 'text-green-400';
  if (value === 'POST') return 'text-blue-400';
  if (value === 'PUT') return 'text-yellow-400';
  if (value === 'DELETE') return 'text-red-400';
  return 'text-muted-foreground';
}

function formatDuration(ms?: number): string {
  if (ms == null || Number.isNaN(ms)) return '-';
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.round(ms)}ms`;
}

function formatTime(value?: string): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}

function formatSeverity(value?: string): string {
  if (!value) return 'info';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function severityTone(value?: string): string {
  const normalized = (value ?? '').toLowerCase();
  if (normalized === 'critical' || normalized === 'high') return 'text-red-400';
  if (normalized === 'medium') return 'text-yellow-400';
  if (normalized === 'low') return 'text-blue-400';
  return 'text-muted-foreground';
}

function TestResultItem({ result }: { result: TestResult }) {
  return (
    <div className="rounded border border-border/35 bg-card/50 p-2 text-[11px]">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'rounded px-1.5 py-0.5 text-[9px] uppercase',
            result.status === 'passed'
              ? 'bg-green-500/15 text-green-400'
              : result.status === 'failed' || result.status === 'error'
                ? 'bg-red-500/15 text-red-400'
                : 'bg-muted text-muted-foreground'
          )}
        >
          {result.status}
        </span>
        <span className="text-muted-foreground">{result.test_id ?? result.id}</span>
        <span className="ml-auto text-muted-foreground">{formatDuration(result.duration_ms)}</span>
      </div>
      {result.error_message ? (
        <div className="mt-1 break-all text-[10px] text-red-400">{result.error_message}</div>
      ) : null}
    </div>
  );
}

function VulnerabilityItem({ vulnerability }: { vulnerability: Vulnerability }) {
  return (
    <div className="rounded border border-border/35 bg-card/50 p-2 text-[11px]">
      <div className="flex items-center gap-2">
        <span className={cn('rounded px-1.5 py-0.5 text-[9px] uppercase', severityTone(vulnerability.severity))}>
          {formatSeverity(vulnerability.severity)}
        </span>
        <span className="truncate text-foreground">{vulnerability.title}</span>
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground">{vulnerability.description}</div>
      <div className="mt-1 text-[10px] text-muted-foreground">
        Type: {vulnerability.type} • Server: {vulnerability.server_id}
      </div>
    </div>
  );
}

function LoadTestItem({ result }: { result: LoadTestResult }) {
  const metrics = result.metrics ?? {};
  return (
    <div className="rounded border border-border/35 bg-card/50 p-2 text-[11px]">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'rounded px-1.5 py-0.5 text-[9px] uppercase',
            result.status === 'completed'
              ? 'bg-green-500/15 text-green-400'
              : result.status === 'failed'
                ? 'bg-red-500/15 text-red-400'
                : 'bg-blue-500/15 text-blue-400'
          )}
        >
          {result.status}
        </span>
        <span className="text-muted-foreground">{result.id}</span>
      </div>
      <div className="mt-1 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
        <span>Requests: {metrics.total_requests ?? '-'}</span>
        <span>RPS: {metrics.requests_per_second?.toFixed(2) ?? '-'}</span>
        <span>Errors: {metrics.failed_requests ?? '-'}</span>
        <span>Avg: {formatDuration(metrics.response_times?.avg_ms)}</span>
      </div>
    </div>
  );
}

function JobStatusBadge({ status }: { status: BackendLabJobStatus | null }) {
  if (!status) return null;
  const tone =
    status.status === 'completed'
      ? 'bg-green-500/15 text-green-400'
      : status.status === 'failed'
        ? 'bg-red-500/15 text-red-400'
        : status.status === 'running'
          ? 'bg-blue-500/15 text-blue-300'
          : 'bg-muted text-muted-foreground';
  return (
    <span className={cn('rounded px-1.5 py-0.5 text-[9px] uppercase', tone)}>
      {status.status}
    </span>
  );
}

function CaptureItem({
  capture,
  onReplay,
}: {
  capture: CapturedRequest;
  onReplay: (captureId: string) => void;
}) {
  return (
    <div className="rounded border border-border/35 bg-card/50 p-2 text-[11px]">
      <div className="flex items-center gap-2">
        <span className={cn('text-[10px] font-semibold', methodColor(capture.method))}>{capture.method}</span>
        <span className="truncate text-foreground">{capture.url}</span>
        <span className="ml-auto text-muted-foreground">{capture.status_code ?? '-'}</span>
      </div>
      <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>{formatTime(capture.timestamp)}</span>
        <span>{formatDuration(capture.duration_ms)}</span>
        <button
          type="button"
          onClick={() => onReplay(capture.id)}
          className="ml-auto rounded px-2 py-0.5 text-primary transition-colors hover:bg-primary/10"
        >
          Replay
        </button>
      </div>
    </div>
  );
}

function ConsoleLine({ entry }: { entry: ConsoleLogEntry }) {
  return (
    <div className="rounded border border-border/35 bg-card/50 px-2 py-1 text-[10px] font-mono">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span>{formatTime(entry.timestamp)}</span>
        <span>{entry.level}</span>
      </div>
      <div className="break-all text-foreground">{entry.message}</div>
    </div>
  );
}

function BackendLabContent({ embedded }: { embedded: boolean }) {
  const lab = useBackendLab();
  const [activeTab, setActiveTab] = useState<BackendLabTabId>('overview');
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);

  const [quickMethod, setQuickMethod] = useState('GET');
  const [quickUrl, setQuickUrl] = useState('http://127.0.0.1:8000/api/health');
  const [quickBody, setQuickBody] = useState('');

  const [loadName, setLoadName] = useState('Default load test');
  const [loadUrl, setLoadUrl] = useState('http://127.0.0.1:8000/api/health');
  const [loadUsers, setLoadUsers] = useState(10);
  const [loadDuration, setLoadDuration] = useState(30);
  const [loadRamp, setLoadRamp] = useState(5);
  const jobStatus = lab.jobStatus;

  const filteredRoutes = useMemo(() => {
    if (!selectedServerId) return lab.routes;
    return lab.routes.filter(route => route.server_id === selectedServerId);
  }, [lab.routes, selectedServerId]);

  const offline = !lab.backendReachable;

  return (
    <div className={cn('notilus-devtools-scope flex h-full flex-col', embedded ? '' : 'bg-background')}>
      <div className="flex items-center gap-2 border-b border-border/35 bg-card/40 px-3 py-2">
        <span className={cn('h-2 w-2 rounded-full', lab.sidecarState.isRunning ? 'bg-green-400' : 'bg-red-400')} />
        <span className="text-xs text-muted-foreground">
          {lab.sidecarState.isRunning ? 'Sidecar running' : 'Sidecar stopped'} • {lab.sidecarState.healthUrl}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              void lab.startSidecar();
            }}
            className="rounded px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            Start
          </button>
          <button
            type="button"
            onClick={() => {
              void lab.stopSidecar();
            }}
            className="rounded px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            Stop
          </button>
          <button
            type="button"
            onClick={() => {
              void lab.restartSidecar();
            }}
            className="rounded px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            Restart
          </button>
          <button
            type="button"
            onClick={() => {
              void lab.refreshAll();
            }}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <RefreshCw size={11} />
            Refresh
          </button>
        </div>
      </div>

      {lab.error ? (
        <div className="mx-3 mt-2 flex items-center gap-2 rounded border border-secondary/40 bg-red-500/10 px-2 py-1 text-[11px] text-red-300">
          <AlertTriangle size={12} />
          {lab.error}
        </div>
      ) : null}

      <div className="flex items-center gap-1 border-b border-border/35 bg-card/30 px-2 py-1">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'inline-flex h-7 items-center gap-1 rounded px-2 text-[10px] transition-colors',
                activeTab === tab.id
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
            >
              <Icon size={11} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-3 text-[11px] scrollbar-thin">
        {offline ? (
          <div className="rounded border border-border/35 bg-card/50 p-4 text-muted-foreground">
            Backend Lab is offline. Start the sidecar then refresh.
          </div>
        ) : null}

        {!offline && activeTab === 'overview' ? (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded border border-border/35 bg-card/50 p-3">
              <div className="text-[10px] text-muted-foreground">Servers</div>
              <div className="text-xl text-foreground">{lab.overview?.total_servers ?? lab.servers.length}</div>
              <div className="text-[10px] text-muted-foreground">Healthy {lab.overview?.healthy_servers ?? '-'}</div>
            </div>
            <div className="rounded border border-border/35 bg-card/50 p-3">
              <div className="text-[10px] text-muted-foreground">Routes</div>
              <div className="text-xl text-foreground">{lab.overview?.total_routes ?? lab.routes.length}</div>
              <div className="text-[10px] text-muted-foreground">Tested {lab.overview?.tested_routes ?? '-'}</div>
            </div>
            <div className="rounded border border-border/35 bg-card/50 p-3">
              <div className="text-[10px] text-muted-foreground">Vulnerabilities</div>
              <div className="text-xl text-foreground">
                {lab.overview?.total_vulnerabilities ?? lab.vulnerabilities.length}
              </div>
              <div className="text-[10px] text-muted-foreground">Critical {lab.overview?.critical_count ?? '-'}</div>
            </div>
            <div className="col-span-3 rounded border border-border/35 bg-card/50 p-3">
              <div className="mb-2 text-[10px] text-muted-foreground">Quick test</div>
              <form
                className="grid grid-cols-[90px_1fr_120px] gap-2"
                onSubmit={event => {
                  event.preventDefault();
                  void lab.runQuickTest({
                    method: quickMethod,
                    url: quickUrl,
                    body: quickBody || undefined,
                  });
                }}
              >
                <select
                  value={quickMethod}
                  onChange={event => setQuickMethod(event.target.value)}
                  className="h-8 rounded border border-border/35 bg-card px-2"
                >
                  {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(method => (
                    <option key={method}>{method}</option>
                  ))}
                </select>
                <input
                  value={quickUrl}
                  onChange={event => setQuickUrl(event.target.value)}
                  className="h-8 rounded border border-border/35 bg-card px-2"
                  placeholder="Target URL"
                />
                <button
                  type="submit"
                  disabled={lab.loading.runningQuickTest}
                  className="inline-flex h-8 items-center justify-center gap-1 rounded bg-primary/15 text-primary disabled:opacity-50"
                >
                  <Play size={12} />
                  Run
                </button>
              </form>
            </div>
          </div>
        ) : null}

        {!offline && activeTab === 'servers' ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void lab.scanServers();
                }}
                className="inline-flex h-8 items-center gap-1 rounded bg-primary/15 px-3 text-primary"
                disabled={lab.loading.scanning}
              >
                <RefreshCw size={12} />
                Scan
              </button>
              <JobStatusBadge status={jobStatus.scanServers} />
            </div>
            {lab.servers.map(server => (
              <div key={server.id} className="rounded border border-border/35 bg-card/50 p-2">
                <div className="flex items-center gap-2">
                  <span className={cn('text-[10px] font-semibold', statusColor(server.status))}>{server.status}</span>
                  <span className="text-foreground">{server.name ?? `${server.host}:${server.port}`}</span>
                  <span className="text-muted-foreground">{server.framework ?? 'unknown'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedServerId(server.id);
                      void lab.discoverRoutes(server.id);
                    }}
                    className="ml-auto rounded px-2 py-1 text-[10px] text-primary transition-colors hover:bg-primary/10"
                  >
                    Discover routes
                  </button>
                </div>
                {selectedServerId === server.id ? (
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <JobStatusBadge status={jobStatus.discoverRoutes} />
                    <span>Route discovery</span>
                  </div>
                ) : null}
              </div>
            ))}
            {lab.servers.length === 0 ? <div className="text-muted-foreground">No servers discovered.</div> : null}
          </div>
        ) : null}

        {!offline && activeTab === 'routes' ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <select
                value={selectedServerId ?? ''}
                onChange={event => setSelectedServerId(event.target.value || null)}
                className="h-8 rounded border border-border/35 bg-card px-2"
              >
                <option value="">All servers</option>
                {lab.servers.map(server => (
                  <option key={server.id} value={server.id}>
                    {server.name ?? `${server.host}:${server.port}`}
                  </option>
                ))}
              </select>
            </div>
            {filteredRoutes.map(route => (
              <div key={route.id} className="rounded border border-border/35 bg-card/50 p-2">
                <div className="flex items-center gap-2">
                  <span className={cn('text-[10px] font-semibold', methodColor(route.method))}>{route.method}</span>
                  <span className="font-mono text-foreground">{route.path}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{route.server_id}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  tests {route.test_count ?? 0} • vulnerabilities {route.vulnerability_count ?? 0}
                </div>
              </div>
            ))}
            {filteredRoutes.length === 0 ? <div className="text-muted-foreground">No routes discovered.</div> : null}
          </div>
        ) : null}

        {!offline && activeTab === 'tests' ? (
          <div className="space-y-2">
            <form
              className="grid grid-cols-[90px_1fr] gap-2"
              onSubmit={event => {
                event.preventDefault();
                void lab.runQuickTest({
                  method: quickMethod,
                  url: quickUrl,
                  body: quickBody || undefined,
                });
              }}
            >
              <select
                value={quickMethod}
                onChange={event => setQuickMethod(event.target.value)}
                className="h-8 rounded border border-border/35 bg-card px-2"
              >
                {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(method => (
                  <option key={method}>{method}</option>
                ))}
              </select>
              <input
                value={quickUrl}
                onChange={event => setQuickUrl(event.target.value)}
                className="h-8 rounded border border-border/35 bg-card px-2"
                placeholder="Target URL"
              />
              <textarea
                value={quickBody}
                onChange={event => setQuickBody(event.target.value)}
                className="col-span-2 h-20 rounded border border-border/35 bg-card px-2 py-1"
                placeholder="JSON body (optional)"
              />
              <button
                type="submit"
                disabled={lab.loading.runningQuickTest}
                className="col-span-2 inline-flex h-8 items-center justify-center gap-1 rounded bg-primary/15 text-primary disabled:opacity-50"
              >
                <Play size={12} />
                Run quick test
              </button>
            </form>
            {lab.tests.map(result => (
              <TestResultItem key={result.id} result={result} />
            ))}
            {lab.tests.length === 0 ? <div className="text-muted-foreground">No test results yet.</div> : null}
          </div>
        ) : null}

        {!offline && activeTab === 'security' ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                void lab.runSecurityScan();
              }}
              disabled={lab.loading.runningSecurityScan}
              className="inline-flex h-8 items-center gap-1 rounded bg-primary/15 px-3 text-primary disabled:opacity-50"
            >
              <Shield size={12} />
              Run security scan
            </button>
            <JobStatusBadge status={jobStatus.runSecurityScan} />
            {lab.vulnerabilities.map(vulnerability => (
              <VulnerabilityItem key={vulnerability.id} vulnerability={vulnerability} />
            ))}
            {lab.vulnerabilities.length === 0 ? (
              <div className="text-muted-foreground">No vulnerabilities found.</div>
            ) : null}
          </div>
        ) : null}

        {!offline && activeTab === 'performance' ? (
          <div className="space-y-2">
            <form
              className="grid grid-cols-2 gap-2"
              onSubmit={event => {
                event.preventDefault();
                void lab.runLoadTest({
                  name: loadName,
                  targetUrl: loadUrl,
                  virtualUsers: loadUsers,
                  durationSec: loadDuration,
                  rampUpSec: loadRamp,
                });
              }}
            >
              <input
                value={loadName}
                onChange={event => setLoadName(event.target.value)}
                className="h-8 rounded border border-border/35 bg-card px-2"
                placeholder="Test name"
              />
              <input
                value={loadUrl}
                onChange={event => setLoadUrl(event.target.value)}
                className="h-8 rounded border border-border/35 bg-card px-2"
                placeholder="Target URL"
              />
              <input
                type="number"
                min={1}
                value={loadUsers}
                onChange={event => setLoadUsers(Number(event.target.value) || 1)}
                className="h-8 rounded border border-border/35 bg-card px-2"
                placeholder="Virtual users"
              />
              <input
                type="number"
                min={1}
                value={loadDuration}
                onChange={event => setLoadDuration(Number(event.target.value) || 1)}
                className="h-8 rounded border border-border/35 bg-card px-2"
                placeholder="Duration"
              />
              <input
                type="number"
                min={0}
                value={loadRamp}
                onChange={event => setLoadRamp(Number(event.target.value) || 0)}
                className="h-8 rounded border border-border/35 bg-card px-2"
                placeholder="Ramp-up"
              />
              <button
                type="submit"
                disabled={lab.loading.runningLoadTest}
                className="inline-flex h-8 items-center justify-center gap-1 rounded bg-primary/15 text-primary disabled:opacity-50"
              >
                <Play size={12} />
                Run
              </button>
            </form>
            <JobStatusBadge status={jobStatus.runLoadTest} />
            {lab.loadTests.map(result => (
              <LoadTestItem key={result.id} result={result} />
            ))}
            {lab.loadTests.length === 0 ? <div className="text-muted-foreground">No load test runs yet.</div> : null}
          </div>
        ) : null}

        {!offline && activeTab === 'capture' ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                void lab.clearCaptures();
              }}
              disabled={lab.loading.clearingCaptures}
              className="inline-flex h-8 items-center gap-1 rounded bg-muted/70 px-3 text-muted-foreground transition-colors hover:text-foreground"
            >
              <Trash2 size={12} />
              Clear captures
            </button>
            {lab.captures.map(capture => (
              <CaptureItem
                key={capture.id}
                capture={capture}
                onReplay={captureId => {
                  void lab.replayCapture(captureId);
                }}
              />
            ))}
            {lab.captures.length === 0 ? <div className="text-muted-foreground">No captures yet.</div> : null}
          </div>
        ) : null}

        {!offline && activeTab === 'console' ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                void lab.clearConsole();
              }}
              disabled={lab.loading.clearingConsole}
              className="inline-flex h-8 items-center gap-1 rounded bg-muted/70 px-3 text-muted-foreground transition-colors hover:text-foreground"
            >
              <Trash2 size={12} />
              Clear logs
            </button>
            {lab.consoleLogs.map((entry, index) => (
              <ConsoleLine key={`${entry.timestamp}-${index}`} entry={entry} />
            ))}
            {lab.consoleLogs.length === 0 ? <div className="text-muted-foreground">No console logs yet.</div> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function BackendLabPanel({ onClose, embedded = false }: BackendLabPanelProps) {
  if (embedded) {
    return <BackendLabContent embedded />;
  }

  return (
    <SidebarPanelShell title="Backend Lab" icon={Server} onClose={onClose ?? (() => {})} contentClassName="overflow-hidden">
      <BackendLabContent embedded={false} />
    </SidebarPanelShell>
  );
}

