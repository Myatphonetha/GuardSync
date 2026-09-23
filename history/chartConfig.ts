/**
 * Shared chart types, 1/3/5 minute range chips, and simple min/avg/max helpers.
 * Activity-strip colors are separate from green/red measurement bars.
 */
import type { UsageMode } from '../modes/storage';

export type ChartPoint = {
  time: string;
  value: number;
  critical: boolean;
};

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
