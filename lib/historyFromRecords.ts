import type { ArgonTelemetryRecord } from './argonTelemetry';
import type { ChartPoint } from './historyChartData';

const MAX_POINTS = 36;

function downsample(records: ArgonTelemetryRecord[]): ArgonTelemetryRecord[] {
  if (records.length <= MAX_POINTS) return records;
  const step = Math.ceil(records.length / MAX_POINTS);
  return records.filter((_, i) => i % step === 0 || i === records.length - 1);
}

function relativeTimeLabel(receivedAtMs: number, startMs: number): string {
  const diffSec = Math.max(0, Math.round((receivedAtMs - startMs) / 1000));
  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  return `${diffMin}m`;
}

function toSeries(
  records: ArgonTelemetryRecord[],
  valueFn: (r: ArgonTelemetryRecord) => number,
  criticalFn: (value: number) => boolean,
): ChartPoint[] {
  if (records.length === 0) return [];
  const sampled = downsample(records);
  const startMs = sampled[0].receivedAtMs;
  return sampled.map((r) => {
    const value = valueFn(r);
    return {
      time: relativeTimeLabel(r.receivedAtMs, startMs),
      value,
      critical: criticalFn(value),
    };
  });
}

export function recordsToHeartRateChart(records: ArgonTelemetryRecord[]): ChartPoint[] {
  return toSeries(records, (r) => r.heartRate, (v) => v > 180 || v < 50);
}

export function recordsToSpO2Chart(records: ArgonTelemetryRecord[]): ChartPoint[] {
  return toSeries(records, (r) => r.spO2, (v) => v < 92);
}

export function recordsToTemperatureChart(records: ArgonTelemetryRecord[]): ChartPoint[] {
  return toSeries(records, (r) => r.bodyTempF, (v) => v > 100.4);
}

export function recordsToHeadAccelerationChart(records: ArgonTelemetryRecord[]): ChartPoint[] {
  return toSeries(records, (r) => r.headAcceleration, (v) => v > 80);
}

export function recordsToBiteForceChart(records: ArgonTelemetryRecord[]): ChartPoint[] {
  return toSeries(records, (r) => r.biteForce, (v) => v > 220);
}
