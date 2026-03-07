import si from 'systeminformation';
import type { SystemMetricsSnapshot } from '../../shared/system-contract';

interface SystemMetricsManagerOptions {
  onChanged: (snapshot: SystemMetricsSnapshot) => void;
  debug: boolean;
  intervalMs?: number;
}

function toPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toNullableNumber(value: unknown): number | null {
  const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(numeric)) return null;
  return numeric;
}

function getQualityLabel(
  online: boolean,
  downMbps: number,
  upMbps: number,
  latencyMs: number | null,
  jitterMs: number | null
): SystemMetricsSnapshot['network']['quality'] {
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

  if (latencyMs === null) score += 0;
  else if (latencyMs <= 30) score += 30;
  else if (latencyMs <= 80) score += 20;
  else if (latencyMs <= 150) score += 10;
  else score += 2;

  if (jitterMs === null) score += 0;
  else if (jitterMs <= 10) score += 10;
  else if (jitterMs <= 25) score += 6;
  else if (jitterMs <= 50) score += 3;
  else score += 1;

  if (score >= 80) return 'excellent';
  if (score >= 55) return 'good';
  if (score >= 30) return 'fair';
  return 'poor';
}

export class SystemMetricsManager {
  private readonly intervalMs: number;
  private readonly debug: boolean;
  private readonly onChanged: (snapshot: SystemMetricsSnapshot) => void;
  private timer: NodeJS.Timeout | null = null;
  private previousLatencyMs: number | null = null;
  private snapshot: SystemMetricsSnapshot = {
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

  constructor(options: SystemMetricsManagerOptions) {
    this.intervalMs = Math.max(500, options.intervalMs ?? 1000);
    this.debug = options.debug;
    this.onChanged = options.onChanged;
  }

  start(): void {
    if (this.timer) return;
    void this.refresh();
    this.timer = setInterval(() => {
      void this.refresh();
    }, this.intervalMs);
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  getSnapshot(): SystemMetricsSnapshot {
    return { ...this.snapshot, network: { ...this.snapshot.network } };
  }

  async refresh(): Promise<SystemMetricsSnapshot> {
    try {
      const [cpuLoad, memory, graphics, battery, networkStats, latency] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.graphics().catch(() => null),
        si.battery().catch(() => null),
        si.networkStats().catch(() => []),
        si.inetLatency('1.1.1.1').catch(() => -1),
      ]);

      const cpuPct = toPercent(cpuLoad.currentLoad);
      const ramPct =
        memory.total > 0 ? toPercent((memory.active / memory.total) * 100) : 0;

      const firstGpu = graphics?.controllers?.[0];
      const gpuPct = toNullableNumber(firstGpu?.utilizationGpu);
      const gpuTempC = toNullableNumber(firstGpu?.temperatureGpu);

      const batteryPct =
        battery && typeof battery.percent === 'number' && battery.hasBattery
          ? toPercent(battery.percent)
          : null;
      const batteryCharging =
        battery && battery.hasBattery ? Boolean(battery.isCharging) : null;

      const activeNetwork =
        networkStats.find(item => item.operstate === 'up') ??
        networkStats.find(item => item.rx_sec > 0 || item.tx_sec > 0) ??
        networkStats[0];

      const downMbps = Math.max(
        0,
        Number(((activeNetwork?.rx_sec ?? 0) * 8) / 1_000_000)
      );
      const upMbps = Math.max(0, Number(((activeNetwork?.tx_sec ?? 0) * 8) / 1_000_000));

      const latencyMs =
        typeof latency === 'number' && Number.isFinite(latency) && latency >= 0
          ? Number(latency)
          : null;
      const jitterMs =
        latencyMs !== null && this.previousLatencyMs !== null
          ? Math.abs(latencyMs - this.previousLatencyMs)
          : null;
      this.previousLatencyMs = latencyMs;

      const online = latencyMs !== null || downMbps > 0 || upMbps > 0;
      const quality = getQualityLabel(online, downMbps, upMbps, latencyMs, jitterMs);

      this.snapshot = {
        cpuPct,
        ramPct,
        gpuPct,
        gpuTempC,
        batteryPct,
        batteryCharging,
        network: {
          online,
          latencyMs,
          jitterMs,
          packetLossPct: null,
          downMbps: Number(downMbps.toFixed(2)),
          upMbps: Number(upMbps.toFixed(2)),
          quality,
          interfaceName: activeNetwork?.iface ?? null,
        },
        updatedAt: new Date().toISOString(),
      };
      this.onChanged(this.getSnapshot());
    } catch (error) {
      if (this.debug) {
        console.error('[system-metrics] refresh failed', error);
      }
    }
    return this.getSnapshot();
  }
}
