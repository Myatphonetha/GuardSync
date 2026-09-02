import type { ArgonTelemetryRecord } from './argonTelemetry';
import type { UsageMode } from './usageMode';
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
  const sec = diffSec % 60;
  if (sec === 0) return `${diffMin}m`;
  return `${diffMin}m${sec}s`;
}

function sessionStartMs(records: ArgonTelemetryRecord[]): number {
  if (records.length === 0) return Date.now();
  return records[0].receivedAtMs;
}

function toSeries(
  records: ArgonTelemetryRecord[],
  startMs: number,
  valueFn: (r: ArgonTelemetryRecord) => number,
  criticalFn: (value: number) => boolean,
): ChartPoint[] {
  if (records.length === 0) return [];
  const sampled = downsample(records);
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
  const startMs = sessionStartMs(records);
  return toSeries(records, startMs, (r) => r.heartRate, (v) => v > 180 || v < 50);
}

export function recordsToSpO2Chart(records: ArgonTelemetryRecord[]): ChartPoint[] {
  const startMs = sessionStartMs(records);
  return toSeries(records, startMs, (r) => r.spO2, (v) => v < 92);
}

export function recordsToTemperatureChart(records: ArgonTelemetryRecord[]): ChartPoint[] {
  const startMs = sessionStartMs(records);
  return toSeries(records, startMs, (r) => r.bodyTempF, (v) => v > 100.4);
}

export function recordsToHeadAccelerationChart(records: ArgonTelemetryRecord[]): ChartPoint[] {
  const startMs = sessionStartMs(records);
  return toSeries(records, startMs, (r) => r.headAcceleration, (v) => v > 80);
}

export function recordsToBiteForceChart(records: ArgonTelemetryRecord[]): ChartPoint[] {
  const startMs = sessionStartMs(records);
  return toSeries(records, startMs, (r) => r.biteForce, (v) => v > 220);
}

/** Count samples per mode in the loaded window (for legend). */
export function countByUsageMode(records: ArgonTelemetryRecord[]): Record<string, number> {
  const counts: Record<string, number> = { training: 0, game: 0, sleep: 0 };
  for (const r of records) {
    const m = r.usageMode ?? 'training';
    counts[m] = (counts[m] ?? 0) + 1;
  }
  return counts;
}

export type ActivitySegment = {
  mode: UsageMode;
  /** Share of total session duration (0–1) */
  flex: number;
};

/** Consecutive mode blocks for the activity strip above charts. */
export function recordsToActivitySegments(records: ArgonTelemetryRecord[]): ActivitySegment[] {
  if (records.length === 0) return [];
  if (records.length === 1) {
    return [{ mode: records[0].usageMode ?? 'training', flex: 1 }];
  }

  const sessionStart = records[0].receivedAtMs;
  const sessionEnd = records[records.length - 1].receivedAtMs;
  const totalMs = Math.max(sessionEnd - sessionStart, 1);

  const raw: { mode: UsageMode; durationMs: number }[] = [];
  let currentMode = records[0].usageMode ?? 'training';
  let segStart = records[0].receivedAtMs;

  for (let i = 1; i < records.length; i++) {
    const mode = records[i].usageMode ?? 'training';
    if (mode !== currentMode) {
      raw.push({ mode: currentMode, durationMs: Math.max(records[i - 1].receivedAtMs - segStart, 1) });
      currentMode = mode;
      segStart = records[i].receivedAtMs;
    }
  }
  raw.push({ mode: currentMode, durationMs: Math.max(sessionEnd - segStart, 1) });

  return raw.map((s) => ({
    mode: s.mode,
    flex: s.durationMs / totalMs,
  }));
}
