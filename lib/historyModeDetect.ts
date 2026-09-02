import type { ArgonTelemetryRecord } from './argonTelemetry';
import { suggestModeChange, type ModeChangeSuggestion } from './modeChangeSuggestion';
import type { UsageMode } from './usageMode';

const RECENT_WINDOW_MS = 60_000;
const MIN_SAMPLES = 4;

export type HistoryModeSuggestion = ModeChangeSuggestion;

export function analyzeHistoryForModeSuggestion(
  records: ArgonTelemetryRecord[],
  currentMode: UsageMode,
): HistoryModeSuggestion | null {
  if (records.length < MIN_SAMPLES) return null;

  const sessionEnd = records[records.length - 1].receivedAtMs;
  const recent = records.filter((r) => r.receivedAtMs >= sessionEnd - RECENT_WINDOW_MS);
  const window =
    recent.length >= MIN_SAMPLES
      ? recent
      : records.slice(-12);

  const samples = window.map((r) => ({
    headAcceleration: r.headAcceleration,
    heartRate: r.heartRate,
    biteForce: r.biteForce,
    receivedAtMs: r.receivedAtMs,
  }));

  return suggestModeChange(samples, currentMode, sessionEnd);
}
