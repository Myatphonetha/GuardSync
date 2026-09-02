import type { UsageMode } from './usageMode';

/** Minimal sample shape for rule-based mode detection. */
export type DetectionSample = {
  headAcceleration: number;
  heartRate: number;
  biteForce: number;
  receivedAtMs: number;
};

export type ModeDetectionResult = {
  mode: UsageMode;
  /** 0–1 confidence for showing a confirm prompt */
  confidence: number;
  reason: string;
};

const MIN_SAMPLES = 4;

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Rule-based activity classifier (v1 — replace with ML when labeled data exists).
 * Uses head acceleration, HR, bite force, and time of day.
 */
export function detectUsageMode(
  samples: DetectionSample[],
  nowMs: number = Date.now(),
): ModeDetectionResult {
  if (samples.length < MIN_SAMPLES) {
    return { mode: 'training', confidence: 0, reason: 'Not enough samples' };
  }

  const headAccels = samples.map((s) => s.headAcceleration);
  const heartRates = samples.map((s) => s.heartRate);
  const biteForces = samples.map((s) => s.biteForce);

  const maxAccel = Math.max(...headAccels);
  const avgAccel = mean(headAccels);
  const avgHr = mean(heartRates);
  const maxBite = Math.max(...biteForces);
  const impactCount = headAccels.filter((a) => a >= 80).length;
  const hour = new Date(nowMs).getHours();
  const isNight = hour >= 22 || hour < 6;

  if (isNight && maxAccel < 35 && avgHr < 78 && avgAccel < 25) {
    return {
      mode: 'sleep',
      confidence: 0.78,
      reason: 'Low movement and heart rate during night hours',
    };
  }

  if (maxAccel >= 90 || impactCount >= 2) {
    return {
      mode: 'game',
      confidence: 0.85,
      reason: 'Repeated or high head impacts detected',
    };
  }

  if (maxAccel >= 65 && (avgHr >= 110 || maxBite >= 220)) {
    return {
      mode: 'game',
      confidence: 0.72,
      reason: 'Elevated impacts with high exertion',
    };
  }

  if (avgHr >= 95 || avgAccel >= 40 || maxBite >= 200) {
    return {
      mode: 'training',
      confidence: 0.68,
      reason: 'Moderate exertion without competition-level impacts',
    };
  }

  if (isNight && maxAccel < 45) {
    return {
      mode: 'sleep',
      confidence: 0.62,
      reason: 'Minimal movement overnight',
    };
  }

  return {
    mode: 'training',
    confidence: 0.35,
    reason: 'Default — light activity',
  };
}

/** Minimum confidence before prompting the athlete to confirm a mode switch. */
export const MODE_PROMPT_THRESHOLD = 0.65;
