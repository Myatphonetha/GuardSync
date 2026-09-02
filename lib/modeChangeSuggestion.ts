import {
  detectUsageMode,
  MODE_PROMPT_THRESHOLD,
  type DetectionSample,
} from './usageModeDetect';
import type { UsageMode } from './usageMode';

const MIN_SAMPLES = 4;

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** True when the second half of the window looks clearly different from the first half. */
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
  /** Re-tag local samples from this time when the athlete confirms. */
  sinceMs: number;
};

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
