import { useState, useEffect } from 'react';

export interface SystemStats {
  cpu: number;
  ram: number;
  gpu: number;
  gpuTemp: number;
  networkUp: number;
  networkDown: number;
  battery: number;
  batteryCharging: boolean;
}

function randomFluctuation(base: number, range: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, base + (Math.random() - 0.5) * range));
}

export function useSystemMonitor() {
  const [stats, setStats] = useState<SystemStats>({
    cpu: 23, ram: 45, gpu: 30, gpuTemp: 52,
    networkUp: 1.2, networkDown: 15.4,
    battery: 78, batteryCharging: true,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        cpu: Math.round(randomFluctuation(prev.cpu, 8, 5, 95)),
        ram: Math.round(randomFluctuation(prev.ram, 4, 20, 90)),
        gpu: Math.round(randomFluctuation(prev.gpu, 6, 5, 85)),
        gpuTemp: Math.round(randomFluctuation(prev.gpuTemp, 3, 35, 90)),
        networkUp: parseFloat(randomFluctuation(prev.networkUp, 0.5, 0.1, 10).toFixed(1)),
        networkDown: parseFloat(randomFluctuation(prev.networkDown, 3, 1, 100).toFixed(1)),
        battery: Math.round(randomFluctuation(prev.battery, 1, 10, 100)),
        batteryCharging: prev.batteryCharging,
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return stats;
}
