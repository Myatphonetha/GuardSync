import type { UsageMode } from './usageMode';

export type ChartPoint = {
  time: string;
  value: number;
  critical: boolean;
};

/** Colors for the activity strip only (not measurement bars). */
export const MODE_STRIP_COLORS: Record<UsageMode, string> = {
  training: '#1D4E3E',
  game: '#FFA726',
  sleep: '#5B7DB1',
};

export const TIME_RANGES = [
  { label: '1min', value: 1 },
  { label: '3min', value: 3 },
  { label: '5min', value: 5 },
] as const;

function timeLabel(minutes: number, index: number, interval: number): string {
  if (minutes <= 60) return `${index * interval}m`;
  if (minutes <= 180) return `${index * interval}m`;
  return `${Math.floor((index * interval) / 60)}h`;
}

export function generateHeartRateData(minutes: number): ChartPoint[] {
  const interval = minutes <= 60 ? 2 : minutes <= 180 ? 5 : 15;
  const points = Math.max(1, Math.floor(minutes / interval));
  return Array.from({ length: points }, (_, i) => {
    const baseValue = 140 + Math.random() * 30;
    const value =
      Math.random() > 0.9
        ? Math.random() > 0.5
          ? 185 + Math.random() * 10
          : 45 + Math.random() * 5
        : baseValue;
    return {
      time: timeLabel(minutes, i, interval),
      value,
      critical: value > 180 || value < 50,
    };
  });
}

export function generateSpO2Data(minutes: number): ChartPoint[] {
  const interval = minutes <= 60 ? 2 : minutes <= 180 ? 5 : 15;
  const points = Math.max(1, Math.floor(minutes / interval));
  return Array.from({ length: points }, (_, i) => {
    const value = Math.random() > 0.85 ? 88 + Math.random() * 4 : 94 + Math.random() * 5;
    return {
      time: timeLabel(minutes, i, interval),
      value,
      critical: value < 92,
    };
  });
}

export function generateTemperatureData(minutes: number): ChartPoint[] {
  const interval = minutes <= 60 ? 2 : minutes <= 180 ? 5 : 15;
  const points = Math.max(1, Math.floor(minutes / interval));
  return Array.from({ length: points }, (_, i) => {
    const value = Math.random() > 0.88 ? 100.5 + Math.random() * 1.5 : 97.8 + Math.random() * 1.2;
    return {
      time: timeLabel(minutes, i, interval),
      value,
      critical: value > 100.4,
    };
  });
}

export function generateHeadAccelerationData(minutes: number): ChartPoint[] {
  const interval = minutes <= 60 ? 5 : minutes <= 180 ? 10 : 30;
  const points = Math.max(1, Math.floor(minutes / interval));
  return Array.from({ length: points }, (_, i) => {
    const value = Math.random() > 0.7 ? 60 + Math.random() * 50 : 20 + Math.random() * 30;
    return {
      time: timeLabel(minutes, i, interval),
      value,
      critical: value > 80,
    };
  });
}

export function generateBiteForceData(minutes: number): ChartPoint[] {
  const interval = minutes <= 60 ? 3 : minutes <= 180 ? 8 : 20;
  const points = Math.max(1, Math.floor(minutes / interval));
  return Array.from({ length: points }, (_, i) => {
    const value = Math.random() > 0.92 ? 220 + Math.random() * 30 : 140 + Math.random() * 40;
    return {
      time: timeLabel(minutes, i, interval),
      value,
      critical: value > 220,
    };
  });
}

export function chartStats(data: ChartPoint[]) {
  if (data.length === 0) {
    return { avg: 0, min: 0, max: 0 };
  }
  const values = data.map((d) => d.value);
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    avg: Math.round(sum / values.length),
    min: Math.round(Math.min(...values)),
    max: Math.round(Math.max(...values)),
  };
}

export function countCritical(...series: ChartPoint[][]): number {
  return series.reduce((n, data) => n + data.filter((d) => d.critical).length, 0);
}
