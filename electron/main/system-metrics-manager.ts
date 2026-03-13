import { Worker } from 'node:worker_threads';
import type { SystemMetricsSnapshot } from '../../shared/system-contract';

interface SystemMetricsManagerOptions {
  onChanged: (snapshot: SystemMetricsSnapshot) => void;
  debug: boolean;
}

type WorkerMessage =
  | { type: 'snapshot'; payload: SystemMetricsSnapshot }
  | { type: 'log'; level: 'info' | 'warn' | 'error'; message: string };

type ControlMessage =
  | { type: 'set-background'; value: boolean }
  | { type: 'shutdown' };

const DEFAULT_SNAPSHOT: SystemMetricsSnapshot = {
  cpuPct: 0,
  ramPct: 0,
  gpuPct: null,
  gpuTempC: null,
  batteryPct: null,
  batteryCharging: null,
  network: {
    online: true,
    latencyMs: null,
    jitterMs: null,
    packetLossPct: null,
    downMbps: 0,
    upMbps: 0,
    quality: 'fair',
    interfaceName: null,
  },
  updatedAt: new Date().toISOString(),
};

const WORKER_SOURCE = `
  const { parentPort, workerData } = require('worker_threads');
  const si = require('systeminformation');

  const debug = Boolean(workerData.debug);
  const trace = Boolean(workerData.trace);
  let background = false;

  let cpuTimer = null;
  let gpuTimer = null;
  let latencyTimer = null;
  let lastLatency = null;

  let snapshot = {
    cpuPct: 0,
    ramPct: 0,
    gpuPct: null,
    gpuTempC: null,
    batteryPct: null,
    batteryCharging: null,
    network: {
      online: true,
      latencyMs: null,
      jitterMs: null,
      packetLossPct: null,
      downMbps: 0,
      upMbps: 0,
      quality: 'fair',
      interfaceName: null,
    },
    updatedAt: new Date().toISOString(),
  };

  function log(level, message) {
    if (!debug) return;
    parentPort.postMessage({ type: 'log', level, message });
  }

  function toPercent(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  function toNullableNumber(value) {
    const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value));
    if (!Number.isFinite(numeric)) return null;
    return numeric;
  }

  function qualityLabel(online, downMbps, upMbps, latencyMs, jitterMs) {
    if (!online) return 'poor';
    let score = 0;
    if (downMbps >= 20) score += 40;
    else if (downMbps >= 5) score += 25;
    else if (downMbps >= 1) score += 15;
    else if (downMbps > 0) score += 8;
    if (upMbps >= 10) score += 20;
    else if (upMbps >= 2) score += 12;
    else if (upMbps >= 0.5) score += 8;
    else if (upMbps > 0) score += 4;
    if (latencyMs == null) score += 0;
    else if (latencyMs <= 30) score += 30;
    else if (latencyMs <= 80) score += 20;
    else if (latencyMs <= 150) score += 10;
    else score += 2;
    if (jitterMs == null) score += 0;
    else if (jitterMs <= 10) score += 10;
    else if (jitterMs <= 25) score += 6;
    else if (jitterMs <= 50) score += 3;
    else score += 1;
    if (score >= 80) return 'excellent';
    if (score >= 55) return 'good';
    if (score >= 30) return 'fair';
    return 'poor';
  }

  function emitSnapshot() {
    snapshot = { ...snapshot, updatedAt: new Date().toISOString() };
    parentPort.postMessage({ type: 'snapshot', payload: snapshot });
  }

  async function refreshCpuRamNetwork() {
    const started = Date.now();
    try {
      const [cpuLoad, memory, networkStats] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.networkStats().catch(() => []),
      ]);

      const cpuPct = toPercent(cpuLoad.currentLoad);
      const ramPct = memory.total > 0 ? toPercent((memory.active / memory.total) * 100) : 0;

      const activeNetwork =
        networkStats.find(item => item.operstate === 'up') ??
        networkStats.find(item => item.rx_sec > 0 || item.tx_sec > 0) ??
        networkStats[0];
      const downMbps = Math.max(0, Number(((activeNetwork?.rx_sec ?? 0) * 8) / 1_000_000));
      const upMbps = Math.max(0, Number(((activeNetwork?.tx_sec ?? 0) * 8) / 1_000_000));

      const online = snapshot.network.latencyMs != null || downMbps > 0 || upMbps > 0;
      const quality = qualityLabel(
        online,
        downMbps,
        upMbps,
        snapshot.network.latencyMs,
        snapshot.network.jitterMs
      );

      snapshot = {
        ...snapshot,
        cpuPct,
        ramPct,
        network: {
          ...snapshot.network,
          online,
          downMbps: Number(downMbps.toFixed(2)),
          upMbps: Number(upMbps.toFixed(2)),
          interfaceName: activeNetwork?.iface ?? null,
          quality,
        },
      };
      emitSnapshot();
    } catch (error) {
      log('error', '[system-metrics-worker] cpu/ram refresh failed: ' + String(error));
    } finally {
      if (trace) {
        log('info', '[system-metrics-worker] cpu/ram cycle ' + (Date.now() - started) + 'ms');
      }
    }
  }

  async function refreshGpuBattery() {
    const started = Date.now();
    try {
      const [graphics, battery] = await Promise.all([
        si.graphics().catch(() => null),
        si.battery().catch(() => null),
      ]);
      const firstGpu = graphics?.controllers?.[0];
      snapshot = {
        ...snapshot,
        gpuPct: toNullableNumber(firstGpu?.utilizationGpu),
        gpuTempC: toNullableNumber(firstGpu?.temperatureGpu),
        batteryPct:
          battery && typeof battery.percent === 'number' && battery.hasBattery
            ? toPercent(battery.percent)
            : null,
        batteryCharging: battery && battery.hasBattery ? Boolean(battery.isCharging) : null,
      };
      emitSnapshot();
    } catch (error) {
      log('error', '[system-metrics-worker] gpu/battery refresh failed: ' + String(error));
    } finally {
      if (trace) {
        log('info', '[system-metrics-worker] gpu/battery cycle ' + (Date.now() - started) + 'ms');
      }
    }
  }

  async function refreshLatency() {
    if (background) return;
    const started = Date.now();
    try {
      const latency = await si.inetLatency('1.1.1.1').catch(() => -1);
      const latencyMs =
        typeof latency === 'number' && Number.isFinite(latency) && latency >= 0
          ? Number(latency)
          : null;
      const jitterMs =
        latencyMs != null && lastLatency != null ? Math.abs(latencyMs - lastLatency) : null;
      lastLatency = latencyMs;
      snapshot = {
        ...snapshot,
        network: {
          ...snapshot.network,
          latencyMs,
          jitterMs,
        },
      };
      emitSnapshot();
    } catch (error) {
      log('error', '[system-metrics-worker] latency refresh failed: ' + String(error));
    } finally {
      if (trace) {
        log('info', '[system-metrics-worker] latency cycle ' + (Date.now() - started) + 'ms');
      }
    }
  }

  function clearTimers() {
    if (cpuTimer) clearInterval(cpuTimer);
    if (gpuTimer) clearInterval(gpuTimer);
    if (latencyTimer) clearInterval(latencyTimer);
    cpuTimer = null;
    gpuTimer = null;
    latencyTimer = null;
  }

  function scheduleTimers() {
    clearTimers();
    const cpuInterval = background ? 5000 : 2000;
    const gpuInterval = background ? 10000 : 5000;
    const latencyInterval = background ? 30000 : 10000;
    cpuTimer = setInterval(() => void refreshCpuRamNetwork(), cpuInterval);
    gpuTimer = setInterval(() => void refreshGpuBattery(), gpuInterval);
    latencyTimer = setInterval(() => void refreshLatency(), latencyInterval);
    void refreshCpuRamNetwork();
    void refreshGpuBattery();
    void refreshLatency();
  }

  parentPort.on('message', message => {
    if (!message || typeof message !== 'object') return;
    if (message.type === 'set-background') {
      background = Boolean(message.value);
      scheduleTimers();
    }
    if (message.type === 'shutdown') {
      clearTimers();
      process.exit(0);
    }
  });

  scheduleTimers();
`;

export class SystemMetricsManager {
  private readonly debug: boolean;
  private readonly onChanged: (snapshot: SystemMetricsSnapshot) => void;
  private readonly trace: boolean;
  private worker: Worker | null = null;
  private snapshot: SystemMetricsSnapshot = DEFAULT_SNAPSHOT;
  private subscribers = 0;
  private background = false;

  constructor(options: SystemMetricsManagerOptions) {
    this.debug = options.debug;
    this.onChanged = options.onChanged;
    this.trace = process.env.NOTILUS_PERF_TRACE === '1';
  }

  subscribe(): void {
    this.subscribers += 1;
    if (this.subscribers === 1) {
      this.startWorker();
    }
  }

  unsubscribe(): void {
    if (this.subscribers === 0) return;
    this.subscribers -= 1;
    if (this.subscribers === 0) {
      this.stopWorker();
    }
  }

  setBackground(isBackground: boolean): void {
    this.background = isBackground;
    this.postWorkerMessage({ type: 'set-background', value: isBackground });
  }

  getSnapshot(): SystemMetricsSnapshot {
    return { ...this.snapshot, network: { ...this.snapshot.network } };
  }

  stop(): void {
    this.subscribers = 0;
    this.stopWorker();
  }

  private startWorker(): void {
    if (this.worker) return;

    this.worker = new Worker(WORKER_SOURCE, {
      eval: true,
      workerData: {
        debug: this.debug,
        trace: this.trace,
      },
    });

    this.worker.on('message', (message: WorkerMessage) => {
      if (!message || typeof message !== 'object') return;
      if (message.type === 'snapshot') {
        this.snapshot = message.payload;
        this.onChanged(this.getSnapshot());
        return;
      }
      if (message.type === 'log' && this.debug) {
        const prefix = '[system-metrics-worker]';
        if (message.level === 'error') console.error(prefix, message.message);
        else if (message.level === 'warn') console.warn(prefix, message.message);
        else console.info(prefix, message.message);
      }
    });

    this.worker.on('exit', () => {
      this.worker = null;
    });

    this.postWorkerMessage({ type: 'set-background', value: this.background });
  }

  private stopWorker(): void {
    if (!this.worker) return;
    const worker = this.worker;
    this.worker = null;
    try {
      worker.postMessage({ type: 'shutdown' } satisfies ControlMessage);
      setTimeout(() => {
        worker.terminate().catch(() => {});
      }, 500);
    } catch {
      void worker.terminate();
    }
  }

  private postWorkerMessage(message: ControlMessage): void {
    if (!this.worker) return;
    try {
      this.worker.postMessage(message);
    } catch {
      // Ignore worker post errors.
    }
  }
}

