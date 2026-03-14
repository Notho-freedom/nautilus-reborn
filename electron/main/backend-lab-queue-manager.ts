import { randomUUID } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { cpus } from 'node:os';
import type {
  BackendLabJobRequest,
  BackendLabJobResponse,
  BackendLabJobStatus,
} from '../../shared/browser-contract';

interface BackendLabQueueManagerOptions {
  debug: boolean;
}

const QUEUE_KEY = 'notilus:backendlab:jobs';
const RESULT_KEY_PREFIX = 'notilus:backendlab:result:';
const RESULT_TTL_SECONDS = 1800;
const IDLE_TIMEOUT_MS = 120_000;

const WORKER_SOURCE = `
  const fetch = globalThis.fetch;

  const restUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.NOTILUS_BACKENDLAB_REST_URL;
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.NOTILUS_BACKENDLAB_REST_TOKEN;
  const queueKey = process.env.NOTILUS_BACKENDLAB_QUEUE_KEY || 'notilus:backendlab:jobs';
  const resultKeyPrefix = process.env.NOTILUS_BACKENDLAB_RESULT_PREFIX || 'notilus:backendlab:result:';
  const backendBaseUrl = process.env.NOTILUS_BACKENDLAB_BACKEND_URL || 'http://127.0.0.1:8000';
  const debug = process.env.NOTILUS_BACKENDLAB_DEBUG === '1';
  const idleTimeoutMs = Number(process.env.NOTILUS_BACKENDLAB_IDLE_TIMEOUT_MS || 120000);
  const resultTtlSeconds = Number(process.env.NOTILUS_BACKENDLAB_RESULT_TTL_SECONDS || 1800);

  let active = true;
  let lastJobAt = Date.now();

  function log(message) {
    if (!debug) return;
    console.info('[backend-lab-worker]', message);
  }

  async function redisCommand(cmd, ...args) {
    const encoded = args.map(arg => encodeURIComponent(String(arg)));
    const url = \`\${restUrl}/\${cmd}/\${encoded.join('/')}\`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: \`Bearer \${restToken}\`,
      },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json?.error ?? \`Redis command failed: \${cmd}\`);
    }
    return json?.result ?? null;
  }

  async function setJobStatus(jobId, payload) {
    const key = \`\${resultKeyPrefix}\${jobId}\`;
    const value = JSON.stringify(payload);
    await redisCommand('SET', key, value, 'EX', resultTtlSeconds);
  }

  async function callBackend(path, options = {}) {
    const url = backendBaseUrl.replace(/\\/$/, '') + path;
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || \`HTTP \${res.status}\`);
    }
    return res.json();
  }

  async function executeJob(job) {
    switch (job.type) {
      case 'scanServers':
        return callBackend('/api/backend-lab/servers/scan', {
          method: 'POST',
          body: { enable_fingerprinting: true },
        }).then(payload => payload.servers_found ?? []);
      case 'discoverRoutes':
        return callBackend(\`/api/backend-lab/routes/discover/\${encodeURIComponent(job.payload?.serverId ?? '')}\`, {
          method: 'POST',
          body: {
            use_openapi: true,
            use_graphql: true,
            use_fuzzing: true,
          },
        });
      case 'runSecurityScan':
        return callBackend('/api/backend-lab/security/scan', {
          method: 'POST',
          body: {
            server_ids: job.payload?.serverIds ?? [],
            route_ids: job.payload?.routeIds ?? [],
            test_injections: true,
            test_xss: true,
            test_headers: true,
            test_cors: true,
            test_rate_limiting: true,
          },
        });
      case 'runLoadTest':
        return callBackend('/api/backend-lab/performance/load', {
          method: 'POST',
          body: {
            name: job.payload?.name ?? 'Load test',
            target_url: job.payload?.targetUrl ?? '',
            virtual_users: job.payload?.virtualUsers ?? 1,
            duration_sec: job.payload?.durationSec ?? 10,
            ramp_up_time_sec: job.payload?.rampUpSec ?? 0,
          },
        });
      default:
        throw new Error('Unknown job type: ' + job.type);
    }
  }

  async function loop() {
    while (active) {
      const idle = Date.now() - lastJobAt;
      if (idle > idleTimeoutMs) {
        log('idle timeout reached, exiting worker');
        process.exit(0);
      }
      let result = null;
      try {
        result = await redisCommand('BRPOP', queueKey, 10);
      } catch (error) {
        log('BRPOP error: ' + String(error));
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      if (!result) continue;

      const payload = Array.isArray(result) ? result[1] : result;
      if (!payload) continue;

      let job;
      try {
        job = JSON.parse(payload);
      } catch (error) {
        log('failed to parse job: ' + String(error));
        continue;
      }

      lastJobAt = Date.now();
      await setJobStatus(job.id, {
        jobId: job.id,
        status: 'running',
        type: job.type,
        updatedAt: new Date().toISOString(),
      });

      try {
        const output = await executeJob(job);
        await setJobStatus(job.id, {
          jobId: job.id,
          status: 'completed',
          type: job.type,
          result: output,
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        await setJobStatus(job.id, {
          jobId: job.id,
          status: 'failed',
          type: job.type,
          error: error instanceof Error ? error.message : String(error),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  process.on('SIGTERM', () => {
    active = false;
    process.exit(0);
  });

  process.on('SIGINT', () => {
    active = false;
    process.exit(0);
  });

  loop().catch(error => {
    log('worker loop failed: ' + String(error));
    process.exit(1);
  });
`;

export class BackendLabQueueManager {
  private readonly debug: boolean;
  private readonly restUrl: string;
  private readonly restToken: string;
  private readonly backendBaseUrl: string;
  private workers: ChildProcess[] = [];

  constructor(options: BackendLabQueueManagerOptions) {
    this.debug = options.debug;
    this.restUrl = (process.env.UPSTASH_REDIS_REST_URL ?? '').trim();
    this.restToken = (process.env.UPSTASH_REDIS_REST_TOKEN ?? '').trim();
    this.backendBaseUrl = this.resolveBackendBaseUrl();
  }

  async enqueueJob(payload: BackendLabJobRequest): Promise<BackendLabJobResponse> {
    this.ensureUpstash();
    const jobId = randomUUID();
    const job = {
      id: jobId,
      type: payload.type,
      payload: payload.payload ?? {},
      createdAt: new Date().toISOString(),
    };

    await this.redisCommand('SET', `${RESULT_KEY_PREFIX}${jobId}`, JSON.stringify({
      jobId,
      status: 'queued',
      type: payload.type,
      updatedAt: new Date().toISOString(),
    }), 'EX', RESULT_TTL_SECONDS);

    await this.redisCommand('LPUSH', QUEUE_KEY, JSON.stringify(job));
    this.ensureWorkers();

    return { jobId };
  }

  async getJob(jobId: string): Promise<BackendLabJobStatus> {
    this.ensureUpstash();
    const raw = await this.redisCommand('GET', `${RESULT_KEY_PREFIX}${jobId}`);
    if (!raw) {
      return { jobId, status: 'queued' };
    }
    try {
      return JSON.parse(raw);
    } catch {
      return { jobId, status: 'failed', error: 'Invalid job payload' };
    }
  }

  dispose(): void {
    if (this.workers.length === 0) return;
    for (const worker of this.workers) {
      try {
        worker.kill();
      } catch {
        // ignore
      }
    }
    this.workers = [];
  }

  private ensureWorkers(): void {
    const desired = this.resolveWorkerCount();
    while (this.workers.length < desired) {
      this.spawnWorker();
    }
  }

  private spawnWorker(): void {
    const worker = spawn(process.execPath, ['-e', WORKER_SOURCE], {
      env: {
        ...process.env,
        UPSTASH_REDIS_REST_URL: this.restUrl,
        UPSTASH_REDIS_REST_TOKEN: this.restToken,
        NOTILUS_BACKENDLAB_QUEUE_KEY: QUEUE_KEY,
        NOTILUS_BACKENDLAB_RESULT_PREFIX: RESULT_KEY_PREFIX,
        NOTILUS_BACKENDLAB_BACKEND_URL: this.backendBaseUrl,
        NOTILUS_BACKENDLAB_DEBUG: this.debug ? '1' : '0',
        NOTILUS_BACKENDLAB_IDLE_TIMEOUT_MS: String(IDLE_TIMEOUT_MS),
        NOTILUS_BACKENDLAB_RESULT_TTL_SECONDS: String(RESULT_TTL_SECONDS),
      },
      stdio: this.debug ? 'inherit' : 'ignore',
      windowsHide: true,
    });

    this.workers.push(worker);

    worker.on('exit', () => {
      this.workers = this.workers.filter(entry => entry !== worker);
    });
  }

  private resolveWorkerCount(): number {
    const raw = Number(process.env.BACKEND_LAB_WORKERS);
    if (Number.isFinite(raw) && raw > 0) return Math.floor(raw);
    const cores = cpus().length || 1;
    return Math.min(4, Math.max(1, cores - 1));
  }

  private ensureUpstash(): void {
    if (!this.restUrl || !this.restToken) {
      throw new Error('Upstash REST credentials not configured.');
    }
  }

  private async redisCommand(cmd: string, ...args: Array<string | number>): Promise<any> {
    const encodedArgs = args.map(arg => encodeURIComponent(String(arg)));
    const url = `${this.restUrl}/${cmd}/${encodedArgs.join('/')}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.restToken}`,
      },
    });
    const json = await response.json().catch(() => ({} as Record<string, unknown>)) as Record<string, unknown>;
    if (!response.ok) {
      throw new Error((json?.error as string) ?? `Upstash command failed: ${cmd}`);
    }
    return (json?.result as unknown) ?? null;
  }

  private resolveBackendBaseUrl(): string {
    const envValue = process.env.VITE_BACKEND_LAB_URL ?? '';
    const candidate = envValue.trim();
    if (!candidate) return 'http://127.0.0.1:8000';
    return candidate.endsWith('/') ? candidate.slice(0, -1) : candidate;
  }
}
