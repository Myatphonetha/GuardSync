/**
 * Saves Argon samples on the phone so History can show charts offline.
 * Latest snapshot + an outbox queue that later uploads to Supabase.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { detectUsageMode } from '../modes/detect';
import {
  getModeSource,
  getOrCreateSessionId,
  getUsageMode,
  isModeSource,
  isUsageMode,
  setLastDetectedMode,
  type ModeSource,
  type UsageMode,
} from '../modes/storage';
import { getRecentTelemetrySamples } from './recentBuffer';
import { type ArgonTelemetryRecord } from './types';

export const STORAGE_KEY_LATEST = 'guardsync_argon_telemetry';
export const STORAGE_KEY_OUTBOX = 'guardsync_telemetry_outbox';

function normalizeUsageFields(o: Record<string, unknown>): {
  usageMode: UsageMode;
  sessionId: string;
  detectedMode: UsageMode | null;
  modeSource: ModeSource;
} {
  const usageMode = isUsageMode(o.usageMode) ? o.usageMode : 'training';
  const sessionId = typeof o.sessionId === 'string' && o.sessionId.length > 0 ? o.sessionId : '';
  const detectedMode = isUsageMode(o.detectedMode) ? o.detectedMode : null;
  const modeSource = isModeSource(o.modeSource) ? o.modeSource : 'manual';
  return { usageMode, sessionId, detectedMode, modeSource };
}

function num(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isNaN(n) ? fallback : n;
}

/** Turn any stored JSON (current or old) into one clean sample. */
export function normalizeRecord(json: unknown): ArgonTelemetryRecord | null {
  if (!json || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;

  const millis = Number(o.millis);
  if (Number.isNaN(millis)) return null;

  const raw =
    typeof o.rawLine === 'string'
      ? o.rawLine
      : typeof o.rawCsv === 'string'
        ? o.rawCsv
        : typeof o.raw === 'string'
          ? o.raw
          : '';

  const receivedAtMs =
    typeof o.receivedAtMs === 'number'
      ? o.receivedAtMs
      : typeof o.updatedAt === 'number'
        ? o.updatedAt
        : Date.now();

  const v1 = Number(o.v1);
  const v2 = Number(o.v2);
  const headAcceleration = Number(o.headAcceleration);
  const heartRate = Number(o.heartRate);
  const { usageMode, sessionId, detectedMode, modeSource } = normalizeUsageFields(o);

  return {
    schemaVersion: 1,
    millis,
    activeMinutes: num(o.activeMinutes, Math.max(0, Math.floor(millis / 60000))),
    headAcceleration: Number.isNaN(headAcceleration) ? (Number.isNaN(v1) ? 0 : v1) : headAcceleration,
    heartRate: Number.isNaN(heartRate) ? (Number.isNaN(v2) ? 0 : v2) : heartRate,
    spO2: num(o.spO2, 96),
    bodyTempF: num(o.bodyTempF, 98.6),
    biteForce: num(o.biteForce, 150),
    rawLine: raw.trim(),
    receivedAtMs,
    deviceId: typeof o.deviceId === 'string' ? o.deviceId : '',
    deviceName: typeof o.deviceName === 'string' ? o.deviceName : 'Argon',
    usageMode,
    sessionId,
    detectedMode,
    modeSource,
  };
}

export async function loadLatestArgonTelemetry(): Promise<ArgonTelemetryRecord | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY_LATEST);
  if (!raw) return null;
  try {
    return normalizeRecord(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

async function readOutbox(): Promise<ArgonTelemetryRecord[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY_OUTBOX);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.map((item) => normalizeRecord(item)).filter((x): x is ArgonTelemetryRecord => x != null);
  } catch {
    return [];
  }
}

export async function writeLatestAndOutbox(
  latest: ArgonTelemetryRecord,
  outbox: ArgonTelemetryRecord[],
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_LATEST, JSON.stringify(latest));
  await AsyncStorage.setItem(STORAGE_KEY_OUTBOX, JSON.stringify(outbox));
}

export async function writeOutbox(outbox: ArgonTelemetryRecord[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_OUTBOX, JSON.stringify(outbox));
}

async function resolveModeForSample(): Promise<{
  usageMode: UsageMode;
  sessionId: string;
  modeSource: ModeSource;
  detectedMode: UsageMode;
}> {
  const detection = detectUsageMode(getRecentTelemetrySamples());
  const detectedMode = detection.mode;
  await setLastDetectedMode(detectedMode);

  const [usageMode, sessionId, modeSource] = await Promise.all([
    getUsageMode(),
    getOrCreateSessionId(),
    getModeSource(),
  ]);

  return { usageMode, sessionId, modeSource, detectedMode };
}

export async function persistArgonTelemetryRecord(input: {
  parsed: {
    millis: number;
    activeMinutes: number;
    headAcceleration: number;
    heartRate: number;
    spO2: number;
    bodyTempF: number;
    biteForce: number;
  };
  raw: string;
  deviceId: string;
  deviceName: string;
}): Promise<ArgonTelemetryRecord> {
  const { usageMode, sessionId, modeSource, detectedMode } = await resolveModeForSample();
  const record: ArgonTelemetryRecord = {
    schemaVersion: 1,
    millis: input.parsed.millis,
    activeMinutes: input.parsed.activeMinutes,
    headAcceleration: input.parsed.headAcceleration,
    heartRate: input.parsed.heartRate,
    spO2: input.parsed.spO2,
    bodyTempF: input.parsed.bodyTempF,
    biteForce: input.parsed.biteForce,
    rawLine: input.raw.trim(),
    receivedAtMs: Date.now(),
    deviceId: input.deviceId,
    deviceName: input.deviceName,
    usageMode,
    sessionId,
    detectedMode,
    modeSource,
  };

  const outbox = await readOutbox();
  outbox.push(record);
  await writeLatestAndOutbox(record, outbox);
  return record;
}

export async function removeFromOutboxUploaded(idsOrPredicate: {
  receivedAtMs: number;
  deviceId: string;
}[]): Promise<void> {
  const outbox = await readOutbox();
  const drop = new Set(idsOrPredicate.map((x) => `${x.deviceId}:${x.receivedAtMs}`));
  const next = outbox.filter((r) => !drop.has(`${r.deviceId}:${r.receivedAtMs}`));
  await writeOutbox(next);
}

export async function loadOutboxForSync(): Promise<ArgonTelemetryRecord[]> {
  return readOutbox();
}
