import { useEffect, useState } from 'react';
import type { SystemMetricsSnapshot } from '../../shared/system-contract';
import {
  desktopGetSystemMetrics,
  isDesktopRuntime,
  onDesktopSystemMetricsChanged,
} from '@/lib/electronBridge';

export interface SystemStats {
  cpu: number;
  ram: number;
  gpu: number;
  gpuTemp: number;
  networkUp: number;
  networkDown: number;
  networkOnline: boolean;
  networkLatency: number | null;
  networkJitter: number | null;
  networkPacketLoss: number | null;
  networkInterface: string | null;
  networkQuality: 'poor' | 'fair' | 'good' | 'excellent';
  battery: number | null;
  batteryCharging: boolean | null;
  updatedAt: string;
}

const INITIAL_STATS: SystemStats = {
  cpu: 0,
  ram: 0,
  gpu: 0,
  gpuTemp: 0,
  networkUp: 0,
  networkDown: 0,
  networkOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  networkLatency: null,
  networkJitter: null,
  networkPacketLoss: null,
  networkInterface: null,
  networkQuality: 'fair',
  battery: null,
  batteryCharging: null,
  updatedAt: new Date().toISOString(),
};

function mapDesktopSnapshot(snapshot: SystemMetricsSnapshot): SystemStats {
  return {
    cpu: Math.round(snapshot.cpuPct),
    ram: Math.round(snapshot.ramPct),
    gpu: Math.round(snapshot.gpuPct ?? 0),
    gpuTemp: Math.round(snapshot.gpuTempC ?? 0),
    networkUp: snapshot.network.upMbps,
    networkDown: snapshot.network.downMbps,
    networkOnline: snapshot.network.online,
    networkLatency: snapshot.network.latencyMs,
    networkJitter: snapshot.network.jitterMs,
    networkPacketLoss: snapshot.network.packetLossPct,
    networkInterface: snapshot.network.interfaceName,
    networkQuality: snapshot.network.quality,
    battery: snapshot.batteryPct,
    batteryCharging: snapshot.batteryCharging,
    updatedAt: snapshot.updatedAt,
  };
}

function mapWebFallback(previous: SystemStats): SystemStats {
  const now = new Date().toISOString();
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  const perf = typeof performance !== 'undefined' ? performance : null;
  const connection =
    nav && 'connection' in nav
      ? ((nav as Navigator & { connection?: { downlink?: number; rtt?: number; effectiveType?: string } })
          .connection ?? null)
      : null;
  const memory = perf && 'memory' in perf ? (perf as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory : null;

  const downMbps = typeof connection?.downlink === 'number' ? connection.downlink : 0;
  const latencyMs = typeof connection?.rtt === 'number' ? connection.rtt : null;
  const effectiveType = connection?.effectiveType ?? '';

  const quality: SystemStats['networkQuality'] =
    !nav?.onLine
      ? 'poor'
      : effectiveType === '4g'
        ? 'excellent'
        : effectiveType === '3g'
          ? 'good'
          : effectiveType === '2g'
            ? 'fair'
            : downMbps > 10
              ? 'excellent'
              : downMbps > 2
                ? 'good'
                : downMbps > 0
                  ? 'fair'
                  : 'poor';

  const ramFromHeap =
    memory && memory.jsHeapSizeLimit > 0
      ? Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
      : previous.ram;

  return {
    ...previous,
    ram: ramFromHeap,
    networkOnline: Boolean(nav?.onLine),
    networkLatency: latencyMs,
    networkJitter: null,
    networkPacketLoss: null,
    networkUp: 0,
    networkDown: downMbps,
    networkQuality: quality,
    updatedAt: now,
  };
}

export function useSystemMonitor() {
  const [stats, setStats] = useState<SystemStats>(INITIAL_STATS);

  useEffect(() => {
    if (isDesktopRuntime()) {
      let mounted = true;
      void desktopGetSystemMetrics().then(snapshot => {
        if (!mounted || !snapshot) return;
        setStats(mapDesktopSnapshot(snapshot));
      });

      const unsubscribe = onDesktopSystemMetricsChanged(snapshot => {
        if (!mounted) return;
        setStats(mapDesktopSnapshot(snapshot));
      });

      return () => {
        mounted = false;
        unsubscribe();
      };
    }

    const tick = () => {
      setStats(previous => mapWebFallback(previous));
    };
    tick();
    const interval = setInterval(tick, 2000);
    window.addEventListener('online', tick);
    window.addEventListener('offline', tick);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', tick);
      window.removeEventListener('offline', tick);
    };
  }, []);

  return stats;
}
