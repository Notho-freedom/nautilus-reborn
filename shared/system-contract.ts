export type NetworkQualityLevel = 'poor' | 'fair' | 'good' | 'excellent';

export interface NetworkQuality {
  online: boolean;
  latencyMs: number | null;
  jitterMs: number | null;
  packetLossPct: number | null;
  downMbps: number;
  upMbps: number;
  quality: NetworkQualityLevel;
  interfaceName: string | null;
}

export interface SystemMetricsSnapshot {
  cpuPct: number;
  ramPct: number;
  gpuPct: number | null;
  gpuTempC: number | null;
  batteryPct: number | null;
  batteryCharging: boolean | null;
  network: NetworkQuality;
  updatedAt: string;
}
