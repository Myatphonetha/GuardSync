/**
 * Decides when to ask the athlete to switch mode.
 * Used by the live Dashboard prompt and by History after charts load.
 */
import type { ArgonTelemetryRecord } from '../telemetry/types';
import {
  detectUsageMode,
  MODE_PROMPT_THRESHOLD,
  type DetectionSample,
} from './detect';
import type { UsageMode } from './storage';

const MIN_SAMPLES = 4;
const HISTORY_RECENT_WINDOW_MS = 60_000;

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function hasNotableStatShiftFromSamples(samples: DetectionSample[]): boolean {
  if (samples.length < 6) return false;

  const mid = Math.floor(samples.length / 2);
  const early = samples.slice(0, mid);
  const late = samples.slice(mid);

  const avgHrEarly = mean(early.map((s) => s.heartRate));
  const avgHrLate = mean(late.map((s) => s.heartRate));
  const maxAccelEarly = Math.max(...early.map((s) => s.headAcceleration));
  const maxAccelLate = Math.max(...late.map((s) => s.headAcceleration));
  const maxBiteEarly = Math.max(...early.map((s) => s.biteForce));
  const maxBiteLate = Math.max(...late.map((s) => s.biteForce));

  return (
    Math.abs(avgHrLate - avgHrEarly) >= 25 ||
    maxAccelLate - maxAccelEarly >= 35 ||
    maxBiteLate - maxBiteEarly >= 40
  );
}

export type ModeChangeSuggestion = {
  suggestedMode: UsageMode;
  currentMode: UsageMode;
  confidence: number;
  reason: string;
  notableShift: boolean;
  sinceMs: number;
};

export type HistoryModeSuggestion = ModeChangeSuggestion;

export function suggestModeChange(
  samples: DetectionSample[],
  currentMode: UsageMode,
  nowMs: number = Date.now(),
): ModeChangeSuggestion | null {
  if (samples.length < MIN_SAMPLES) return null;

  const window = samples.slice(-12);
  const detection = detectUsageMode(window, nowMs);
  const notableShift = hasNotableStatShiftFromSamples(samples);

  if (detection.mode === currentMode) return null;

  const confidentEnough =
    detection.confidence >= MODE_PROMPT_THRESHOLD ||
    (notableShift && detection.confidence >= 0.45);

  if (!confidentEnough) return null;

  const reason = notableShift
    ? `${detection.reason} — noticeable change in your recent vitals`
    : detection.reason;

  return {
    suggestedMode: detection.mode,
    currentMode,
    confidence: detection.confidence,
    reason,
    notableShift,
    sinceMs: window[0].receivedAtMs,
  };
}

/** Same prompt rules, but fed History rows instead of the live BLE buffer. */
export function analyzeHistoryForModeSuggestion(
  records: ArgonTelemetryRecord[],
  currentMode: UsageMode,
): HistoryModeSuggestion | null {
  if (records.length < MIN_SAMPLES) return null;

  const sessionEnd = records[records.length - 1].receivedAtMs;
  const recent = records.filter((r) => r.receivedAtMs >= sessionEnd - HISTORY_RECENT_WINDOW_MS);
  const window = recent.length >= MIN_SAMPLES ? recent : records.slice(-12);

  const samples = window.map((r) => ({
    headAcceleration: r.headAcceleration,
    heartRate: r.heartRate,
    biteForce: r.biteForce,
    receivedAtMs: r.receivedAtMs,
  }));

  return suggestModeChange(samples, currentMode, sessionEnd);
}
