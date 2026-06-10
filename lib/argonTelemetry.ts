import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Local + backend contract for Argon Nordic UART telemetry (`millis, v1, v2`).
 * Example payload checked into the repo: `mobile/schemas/argon-telemetry-backend.example.json`
 */

export const STORAGE_KEY_LATEST = 'guardsync_argon_telemetry';
/** Append-only queue on device until your API acknowledges (implement sync later). */
export const STORAGE_KEY_OUTBOX = 'guardsync_telemetry_outbox';

export type ArgonTelemetryRecord = {
  schemaVersion: 1;
  millis: number;
  activeMinutes: number;
  headAcceleration: number;
  heartRate: number;
  spO2: number;
  bodyTempF: number;
  biteForce: number;
  /** Original line from UART. */
  rawLine: string;
  receivedAtMs: number;
  deviceId: string;
  deviceName: string;
};

/** Shape you can POST to your API (stable field names for backend work). */
export type ArgonBackendPayload = {
  schema_version: 1;
  source: 'argon_nordic_uart';
  device_id: string;
  device_name: string;
  /** From Particle `millis()` (first value in UART line) */
  device_uptime_ms: number;
  metric_v1: number;
  metric_v2: number;
  /** Original UART line from firmware */
  raw_line: string;
  received_at_ms: number;
};

function parseLegacyStored(json: unknown): ArgonTelemetryRecord | null {
  if (!json || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  const millis = Number(o.millis);
  const v1 = Number(o.v1);
  const v2 = Number(o.v2);
  const activeMinutes = Number(o.activeMinutes);
  const headAcceleration = Number(o.headAcceleration);
  const heartRate = Number(o.heartRate);
  const spO2 = Number(o.spO2);
  const bodyTempF = Number(o.bodyTempF);
  const biteForce = Number(o.biteForce);
  const raw =
    typeof o.rawLine === 'string'
      ? o.rawLine
      : typeof o.rawCsv === 'string'
        ? o.rawCsv
        : typeof o.raw === 'string'
          ? o.raw
          : '';
  const receivedAtMs =
    typeof o.receivedAtMs === 'number' ? o.receivedAtMs : typeof o.updatedAt === 'number' ? o.updatedAt : Date.now();
  const deviceId = typeof o.deviceId === 'string' ? o.deviceId : '';
  const deviceName = typeof o.deviceName === 'string' ? o.deviceName : 'Argon';
  if (Number.isNaN(millis)) return null;
  const resolvedHeadAcceleration = Number.isNaN(headAcceleration) ? (Number.isNaN(v1) ? 0 : v1) : headAcceleration;
  const resolvedHeartRate = Number.isNaN(heartRate) ? (Number.isNaN(v2) ? 0 : v2) : heartRate;
  return {
    schemaVersion: 1,
    millis,
    activeMinutes: Number.isNaN(activeMinutes) ? Math.max(0, Math.floor(millis / 60000)) : activeMinutes,
    headAcceleration: resolvedHeadAcceleration,
    heartRate: resolvedHeartRate,
    spO2: Number.isNaN(spO2) ? 96 : spO2,
    bodyTempF: Number.isNaN(bodyTempF) ? 98.6 : bodyTempF,
    biteForce: Number.isNaN(biteForce) ? 150 : biteForce,
    rawLine: raw.trim(),
    receivedAtMs,
    deviceId,
    deviceName,
  };
}

export function toBackendPayload(record: ArgonTelemetryRecord): ArgonBackendPayload {
  return {
    schema_version: 1,
    source: 'argon_nordic_uart',
    device_id: record.deviceId,
    device_name: record.deviceName,
    device_uptime_ms: record.millis,
    metric_v1: record.headAcceleration,
    metric_v2: record.heartRate,
    raw_line: record.rawLine,
    received_at_ms: record.receivedAtMs,
  };
}

export async function loadLatestArgonTelemetry(): Promise<ArgonTelemetryRecord | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY_LATEST);
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as unknown;
    if (j && typeof j === 'object' && (j as ArgonTelemetryRecord).schemaVersion === 1) {
      const o = j as Record<string, unknown>;
      if (typeof o.rawLine !== 'string' && typeof o.rawCsv === 'string') {
        o.rawLine = o.rawCsv;
      }
      if (typeof o.activeMinutes !== 'number') {
        o.activeMinutes = Math.max(0, Math.floor(Number(o.millis || 0) / 60000));
      }
      if (typeof o.headAcceleration !== 'number') {
        o.headAcceleration = Number(o.v1 || 0);
      }
      if (typeof o.heartRate !== 'number') {
        o.heartRate = Number(o.v2 || 0);
      }
      if (typeof o.spO2 !== 'number') {
        o.spO2 = 96;
      }
      if (typeof o.bodyTempF !== 'number') {
        o.bodyTempF = 98.6;
      }
      if (typeof o.biteForce !== 'number') {
        o.biteForce = 150;
      }
      return o as ArgonTelemetryRecord;
    }
    return parseLegacyStored(j);
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
    return arr
      .map((item) => {
        if (item && typeof item === 'object' && (item as ArgonTelemetryRecord).schemaVersion === 1) {
          const o = item as Record<string, unknown>;
          if (typeof o.rawLine !== 'string' && typeof o.rawCsv === 'string') {
            o.rawLine = o.rawCsv;
          }
          if (typeof o.activeMinutes !== 'number') {
            o.activeMinutes = Math.max(0, Math.floor(Number(o.millis || 0) / 60000));
          }
          if (typeof o.headAcceleration !== 'number') {
            o.headAcceleration = Number(o.v1 || 0);
          }
          if (typeof o.heartRate !== 'number') {
            o.heartRate = Number(o.v2 || 0);
          }
          if (typeof o.spO2 !== 'number') {
            o.spO2 = 96;
          }
          if (typeof o.bodyTempF !== 'number') {
            o.bodyTempF = 98.6;
          }
          if (typeof o.biteForce !== 'number') {
            o.biteForce = 150;
          }
          return o as ArgonTelemetryRecord;
        }
        return parseLegacyStored(item);
      })
      .filter((x): x is ArgonTelemetryRecord => x != null);
  } catch {
    return [];
  }
}

/**
 * Saves latest sample + appends to outbox for a future `POST /telemetry` (or similar).
 */
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
  };

  await AsyncStorage.setItem(STORAGE_KEY_LATEST, JSON.stringify(record));

  const outbox = await readOutbox();
  outbox.push(record);
  await AsyncStorage.setItem(STORAGE_KEY_OUTBOX, JSON.stringify(outbox));

  return record;
}

/** Call after your backend confirms receipt — pass the records you successfully uploaded. */
export async function removeFromOutboxUploaded(idsOrPredicate: {
  receivedAtMs: number;
  deviceId: string;
}[]): Promise<void> {
  const outbox = await readOutbox();
  const drop = new Set(idsOrPredicate.map((x) => `${x.deviceId}:${x.receivedAtMs}`));
  const next = outbox.filter((r) => !drop.has(`${r.deviceId}:${r.receivedAtMs}`));
  await AsyncStorage.setItem(STORAGE_KEY_OUTBOX, JSON.stringify(next));
}

export async function loadOutboxForSync(): Promise<ArgonTelemetryRecord[]> {
  return readOutbox();
}

