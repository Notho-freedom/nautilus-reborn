import { randomUUID } from 'node:crypto';
import { Worker } from 'node:worker_threads';
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
  const { parentPort, workerData } = require('worker_threads');
  const fetch = globalThis.fetch;

  const {
    restUrl,
    restToken,
    queueKey,
    resultKeyPrefix,
    backendBaseUrl,
    debug,
    idleTimeoutMs,
    resultTtlSeconds,
  } = workerData;

  let active = true;
  let lastJobAt = Date.now();

  function log(message) {
    if (!debug) return;
    parentPort.postMessage({ type: 'log', message });
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

  parentPort.on('message', message => {
    if (message?.type === 'shutdown') {
      active = false;
      process.exit(0);
    }
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
  private worker: Worker | null = null;

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
    this.ensureWorker();

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
    if (!this.worker) return;
    try {
      this.worker.postMessage({ type: 'shutdown' });
    } catch {
      // ignore
    }
    void this.worker.terminate();
    this.worker = null;
  }

  private ensureWorker(): void {
    if (this.worker) return;
    this.worker = new Worker(WORKER_SOURCE, {
      eval: true,
      workerData: {
        restUrl: this.restUrl,
        restToken: this.restToken,
        queueKey: QUEUE_KEY,
        resultKeyPrefix: RESULT_KEY_PREFIX,
        backendBaseUrl: this.backendBaseUrl,
        debug: this.debug,
        idleTimeoutMs: IDLE_TIMEOUT_MS,
        resultTtlSeconds: RESULT_TTL_SECONDS,
      },
    });

    this.worker.on('message', message => {
      if (message?.type === 'log' && this.debug) {
        console.info('[backend-lab-queue]', message.message);
      }
    });

    this.worker.on('exit', () => {
      this.worker = null;
    });
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
