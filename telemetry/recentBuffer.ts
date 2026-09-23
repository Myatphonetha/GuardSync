/**
 * Last ~24 live samples kept in memory so mode detection can look at a short window
 * without reading AsyncStorage on every BLE notify.
 */
import type { DetectionSample } from '../modes/detect';

const MAX_SAMPLES = 24;
const buffer: DetectionSample[] = [];

export function pushRecentTelemetrySample(sample: DetectionSample): void {
  buffer.push(sample);
  if (buffer.length > MAX_SAMPLES) {
    buffer.shift();
  }
}

export function getRecentTelemetrySamples(): DetectionSample[] {
  return [...buffer];
}

export function clearRecentTelemetrySamples(): void {
  buffer.length = 0;
}
