import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BackendLabPanel } from '@/components/browser/BackendLabPanel';

const mockHookState = {
  sidecarState: {
    isRunning: true,
    isStarting: false,
    isStopping: false,
    error: null,
    backendPath: 'backend.exe',
    healthUrl: 'http://127.0.0.1:8000/api/health',
    port: 8000,
    logs: [],
    lastHealthyAt: null,
    restartAttempts: 0,
  },
  backendReachable: true,
  loading: {
    refreshing: false,
    scanning: false,
    runningQuickTest: false,
    runningSecurityScan: false,
    runningLoadTest: false,
    clearingCaptures: false,
    clearingConsole: false,
  },
  error: null,
  servers: [],
  routes: [],
  routesByServer: {},
  tests: [],
  vulnerabilities: [],
  loadTests: [],
  captures: [],
  overview: null,
  consoleLogs: [],
  refreshAll: vi.fn(async () => {}),
  scanServers: vi.fn(async () => {}),
  discoverRoutes: vi.fn(async () => []),
  runQuickTest: vi.fn(async () => null),
  runSecurityScan: vi.fn(async () => null),
  runLoadTest: vi.fn(async () => null),
  replayCapture: vi.fn(async () => null),
  clearCaptures: vi.fn(async () => {}),
  clearConsole: vi.fn(async () => {}),
  startSidecar: vi.fn(async () => {}),
  stopSidecar: vi.fn(async () => {}),
  restartSidecar: vi.fn(async () => {}),
};

vi.mock('@/hooks/useBackendLab', () => ({
  useBackendLab: () => mockHookState,
}));

describe('BackendLabPanel', () => {
  it('renders the 8 V1 tabs in embedded mode', () => {
    render(<BackendLabPanel embedded />);

    ['Overview', 'Servers', 'Routes', 'Tests API', 'Security', 'Performance', 'Capture', 'Console'].forEach(
      label => {
        expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
      }
    );
  });
});
