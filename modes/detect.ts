/**
 * Rule-based guess of Training / Game / Sleep from recent vitals.
 * Not machine learning yet — swap detectUsageMode() later for a real model.
 */
import type { UsageMode } from './storage';

export type DetectionSample = {
  headAcceleration: number;
  heartRate: number;
  biteForce: number;
  receivedAtMs: number;
};

export type ModeDetectionResult = {
  mode: UsageMode;
  confidence: number;
  reason: string;
};

const MIN_SAMPLES = 4;

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

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

export const MODE_PROMPT_THRESHOLD = 0.65;
