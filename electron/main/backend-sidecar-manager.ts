import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createServer } from 'node:net';
import { dirname, join, normalize } from 'node:path';
import { existsSync } from 'node:fs';
import type { BackendLabSidecarState } from '../../shared/browser-contract';

interface BackendSidecarManagerOptions {
  debug: boolean;
  onStateChanged?: (state: BackendLabSidecarState) => void;
}

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 8000;
const BACKEND_PORT_ENV = 'NOTILUS_BACKEND_PORT';
const BACKEND_EXE_NAME = 'notilus-backend.exe';
const BACKEND_EXE_ENV = 'NOTILUS_BACKEND_EXE';
const MAX_LOGS = 120;
const MAX_RESTART_ATTEMPTS = 3;
const HEALTH_CHECK_INTERVAL_MS = 30_000;
const STARTUP_HEALTH_RETRIES = 40;
const STARTUP_HEALTH_DELAY_MS = 1_000;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

function sanitizeEnvPath(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function resolvePort(): number {
  const explicit = process.env[BACKEND_PORT_ENV] ?? process.env.PORT;
  const parsed = Number.parseInt(String(explicit ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 65535) {
    return DEFAULT_PORT;
  }
  return parsed;
}

export class BackendSidecarManager {
  private process: ChildProcessWithoutNullStreams | null = null;
  private healthTimer: NodeJS.Timeout | null = null;
  private readonly logs: string[] = [];
  private readonly searchedPaths: string[] = [];
  private backendPath: string | null = null;
  private readonly host = DEFAULT_HOST;
  private readonly port = resolvePort();
  private readonly healthUrl = `http://${this.host}:${this.port}/api/health`;
  private readonly state: BackendLabSidecarState = {
    isRunning: false,
    isStarting: false,
    isStopping: false,
    error: null,
    backendPath: null,
    healthUrl: this.healthUrl,
    port: this.port,
    logs: [],
    lastHealthyAt: null,
    restartAttempts: 0,
  };

  constructor(private readonly options: BackendSidecarManagerOptions) {}

  getState(): BackendLabSidecarState {
    return {
      ...this.state,
      logs: [...this.logs],
    };
  }

  async start(): Promise<BackendLabSidecarState> {
    if (this.state.isRunning || this.state.isStarting) {
      return this.getState();
    }

    this.patchState({ isStarting: true, error: null });

    if (await this.checkHealth()) {
      this.attachToRunningBackend('Backend already healthy before spawn.');
      return this.getState();
    }

    if (await this.isPortInUse(this.port)) {
      this.patchState({
        isStarting: false,
        isRunning: false,
        error: this.buildDiagnostic(`Port ${this.port} is occupied and backend health check failed.`),
      });
      return this.getState();
    }

    this.resolveBackendPath();
    if (!this.backendPath) {
      this.patchState({
        isStarting: false,
        isRunning: false,
        error: this.buildDiagnostic(`Backend executable not found (${BACKEND_EXE_NAME}).`),
      });
      return this.getState();
    }

    try {
      const workingDir = this.resolveWorkingDirectory(this.backendPath);
      this.addLog('INFO', `Starting backend at ${this.backendPath}`);
      this.addLog('INFO', `Working directory ${workingDir}`);

      this.process = spawn(this.backendPath, [], {
        cwd: workingDir,
        windowsHide: true,
        stdio: 'pipe',
        env: {
          ...process.env,
          PORT: String(this.port),
        },
      });

      this.process.stdout.on('data', chunk => {
        this.addLog('OUT', String(chunk));
      });
      this.process.stderr.on('data', chunk => {
        this.addLog('ERR', String(chunk));
      });

      this.process.once('exit', code => {
        const exitCode = typeof code === 'number' ? code : null;
        if (this.state.isStopping) return;
        this.addLog('WARN', `Backend process exited with code ${exitCode ?? 'unknown'}.`);
        this.process = null;
        this.stopPeriodicHealthCheck();
        this.patchState({
          isRunning: false,
          isStarting: false,
          error: this.buildDiagnostic(
            `Backend stopped unexpectedly (code: ${exitCode ?? 'unknown'}).`
          ),
        });
      });

      const healthy = await this.waitForHealth({
        retries: STARTUP_HEALTH_RETRIES,
        delayMs: STARTUP_HEALTH_DELAY_MS,
      });

      if (!healthy) {
        this.patchState({
          isStarting: false,
          isRunning: false,
          error: this.buildDiagnostic(
            `Backend did not become healthy after ${STARTUP_HEALTH_RETRIES} retries.`
          ),
        });
        await this.stop();
        return this.getState();
      }

      this.patchState({
        isStarting: false,
        isRunning: true,
        isStopping: false,
        error: null,
        lastHealthyAt: new Date().toISOString(),
        restartAttempts: 0,
      });
      this.startPeriodicHealthCheck();
      return this.getState();
    } catch (error) {
      this.patchState({
        isStarting: false,
        isRunning: false,
        error: this.buildDiagnostic(`Failed to start backend: ${String(error)}`),
      });
      await this.stop();
      return this.getState();
    }
  }

  async stop(): Promise<BackendLabSidecarState> {
    this.stopPeriodicHealthCheck();

    if (!this.process) {
      this.patchState({
        isStopping: false,
        isRunning: false,
        isStarting: false,
      });
      return this.getState();
    }

    this.patchState({ isStopping: true });

    const proc = this.process;
    try {
      proc.kill('SIGTERM');
      await Promise.race([
        new Promise(resolve => proc.once('exit', resolve)),
        delay(2_000),
      ]);

      if (proc.exitCode === null) {
        proc.kill('SIGKILL');
      }
    } catch {
      // Ignore shutdown errors.
    } finally {
      this.process = null;
      this.patchState({
        isStopping: false,
        isRunning: false,
        isStarting: false,
      });
    }

    return this.getState();
  }

  async restart(): Promise<BackendLabSidecarState> {
    await this.stop();
    await delay(600);
    return this.start();
  }

  dispose(): void {
    this.stopPeriodicHealthCheck();
    if (this.process) {
      try {
        this.process.kill('SIGTERM');
      } catch {
        // Ignore process teardown errors.
      }
      this.process = null;
    }
  }

  private patchState(next: Partial<BackendLabSidecarState>): void {
    Object.assign(this.state, next);
    this.state.backendPath = this.backendPath;
    this.state.logs = [...this.logs];
    this.options.onStateChanged?.(this.getState());
  }

  private addLog(level: string, message: string): void {
    const line = `[${new Date().toISOString()}] [${level}] ${message.trim()}`;
    this.logs.push(line);
    if (this.logs.length > MAX_LOGS) {
      this.logs.splice(0, this.logs.length - MAX_LOGS);
    }
    if (this.options.debug) {
      console.info(`[backend-sidecar] ${line}`);
    }
    this.patchState({});
  }

  private resolveBackendPath(): void {
    this.backendPath = null;
    this.searchedPaths.length = 0;

    const cwd = process.cwd();
    const executableDir = dirname(process.execPath);
    const parentDir = dirname(cwd);
    const envPath = sanitizeEnvPath(process.env[BACKEND_EXE_ENV]);

    const candidates: string[] = [];
    if (envPath) {
      candidates.push(envPath);
    }
    candidates.push(join(executableDir, BACKEND_EXE_NAME));
    candidates.push(join(cwd, 'backend', 'dist', BACKEND_EXE_NAME));
    candidates.push(join(cwd, '.bin', 'backend_builds', 'dist', BACKEND_EXE_NAME));
    candidates.push(join(parentDir, 'backend', 'dist', BACKEND_EXE_NAME));

    const seen = new Set<string>();
    for (const candidate of candidates) {
      const normalized = normalize(candidate);
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      this.searchedPaths.push(normalized);
      if (existsSync(normalized)) {
        this.backendPath = normalized;
        this.addLog('INFO', `Resolved backend executable: ${normalized}`);
        break;
      }
    }

    this.patchState({ backendPath: this.backendPath });
  }

  private resolveWorkingDirectory(executablePath: string): string {
    const exeDir = dirname(executablePath);
    const normalizedExePath = normalize(executablePath).split('\\').join('/').toLowerCase();
    const backendSuffix = `/backend/dist/${BACKEND_EXE_NAME}`;
    if (normalizedExePath.endsWith(backendSuffix)) {
      return dirname(exeDir);
    }
    return exeDir;
  }

  private async waitForHealth({ retries, delayMs }: { retries: number; delayMs: number }): Promise<boolean> {
    for (let index = 0; index < retries; index += 1) {
      const healthy = await this.checkHealth();
      if (healthy) return true;
      if (index < retries - 1) {
        await delay(delayMs);
      }
    }
    return false;
  }

  private async checkHealth(): Promise<boolean> {
    const timeout = 2_500;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(this.state.healthUrl, {
        method: 'GET',
        signal: controller.signal,
      });
      if (response.ok) {
        this.patchState({ lastHealthyAt: new Date().toISOString() });
      }
      return response.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  private startPeriodicHealthCheck(): void {
    this.stopPeriodicHealthCheck();
    this.healthTimer = setInterval(() => {
      void this.runPeriodicHealthCheck();
    }, HEALTH_CHECK_INTERVAL_MS);
  }

  private stopPeriodicHealthCheck(): void {
    if (!this.healthTimer) return;
    clearInterval(this.healthTimer);
    this.healthTimer = null;
  }

  private async runPeriodicHealthCheck(): Promise<void> {
    if (!this.state.isRunning) return;

    const healthy = await this.checkHealth();
    if (healthy) {
      this.patchState({ restartAttempts: 0, error: null });
      return;
    }

    const nextAttempts = this.state.restartAttempts + 1;
    this.patchState({ restartAttempts: nextAttempts });

    if (nextAttempts > MAX_RESTART_ATTEMPTS) {
      this.patchState({
        isRunning: false,
        error: this.buildDiagnostic(
          `Backend failed health checks and exceeded ${MAX_RESTART_ATTEMPTS} restart attempts.`
        ),
      });
      this.stopPeriodicHealthCheck();
      return;
    }

    this.addLog(
      'WARN',
      `Health check failed; restarting backend (${nextAttempts}/${MAX_RESTART_ATTEMPTS}).`
    );
    await this.restart();
  }

  private attachToRunningBackend(reason: string): void {
    this.addLog('INFO', reason);
    this.patchState({
      isRunning: true,
      isStarting: false,
      isStopping: false,
      error: null,
      lastHealthyAt: new Date().toISOString(),
      restartAttempts: 0,
    });
    this.startPeriodicHealthCheck();
  }

  private buildDiagnostic(cause: string): string {
    const lines = [
      cause,
      `Health URL: ${this.state.healthUrl}`,
      `Expected port: ${this.port}`,
      `Host: ${this.host}`,
      `Resolved backend: ${this.backendPath ?? '<unresolved>'}`,
      `Current cwd: ${process.cwd()}`,
      `Executable dir: ${dirname(process.execPath)}`,
    ];

    if (this.searchedPaths.length > 0) {
      lines.push('Searched paths:');
      for (const candidate of this.searchedPaths) {
        lines.push(`  - ${candidate}`);
      }
    }

    return lines.join('\n');
  }

  private isPortInUse(port: number): Promise<boolean> {
    return new Promise(resolve => {
      const server = createServer();
      server.once('error', () => resolve(true));
      server.once('listening', () => {
        server.close(() => resolve(false));
      });
      server.listen(port, this.host);
    });
  }
}
