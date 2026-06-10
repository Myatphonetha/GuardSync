import type { ArgonTelemetryRecord } from '../lib/argonTelemetry';
import {
  loadLatestArgonTelemetry,
  loadOutboxForSync,
  removeFromOutboxUploaded,
  toBackendPayload,
} from '../lib/argonTelemetry';
import { parseArgonUartLine } from '../lib/argonNordicUart';
import { supabase } from '../lib/supabase';
import { postArgonTelemetry } from './telemetryBackend';

type TelemetryRow = {
  id: number;
  device_id: string;
  device_name: string;
  device_uptime_ms: number;
  metric_v1: number;
  metric_v2: number;
  csv_raw: string;
  received_at_ms: number;
};

/** ~1 sample every 2s on Dashboard — fetch enough bars for short windows. */
const SAMPLE_LIMIT: Record<number, number> = {
  1: 40,
  3: 100,
  5: 160,
};

function rowToRecord(row: TelemetryRow): ArgonTelemetryRecord | null {
  const parsed = parseArgonUartLine(row.csv_raw);
  if (parsed) {
    return {
      schemaVersion: 1,
      millis: parsed.millis,
      activeMinutes: parsed.activeMinutes,
      headAcceleration: parsed.headAcceleration,
      heartRate: parsed.heartRate,
      spO2: parsed.spO2,
      bodyTempF: parsed.bodyTempF,
      biteForce: parsed.biteForce,
      rawLine: row.csv_raw.trim(),
      receivedAtMs: row.received_at_ms,
      deviceId: row.device_id,
      deviceName: row.device_name,
    };
  }

  return {
    schemaVersion: 1,
    millis: row.device_uptime_ms,
    activeMinutes: Math.max(0, Math.floor(row.device_uptime_ms / 60000)),
    headAcceleration: row.metric_v1,
    heartRate: row.metric_v2,
    spO2: 96,
    bodyTempF: 98.6,
    biteForce: 150,
    rawLine: row.csv_raw?.trim() ?? '',
    receivedAtMs: row.received_at_ms,
    deviceId: row.device_id,
    deviceName: row.device_name,
  };
}

function dedupeRecords(records: ArgonTelemetryRecord[]): ArgonTelemetryRecord[] {
  const map = new Map<string, ArgonTelemetryRecord>();
  for (const r of records) {
    map.set(`${r.deviceId}:${r.receivedAtMs}`, r);
  }
  return [...map.values()].sort((a, b) => a.receivedAtMs - b.receivedAtMs);
}

function pickByTimeOrRecent(records: ArgonTelemetryRecord[], since: number, limit: number): ArgonTelemetryRecord[] {
  const inRange = records.filter((r) => r.receivedAtMs >= since);
  if (inRange.length >= 2) return inRange;
  return records.slice(-limit);
}

/**
 * Upload local outbox samples to Supabase. Call after fetch so charts still have local data.
 */
export async function syncLocalOutboxToSupabase(): Promise<number> {
  const outbox = await loadOutboxForSync();
  if (outbox.length === 0) return 0;

  const uploaded: { receivedAtMs: number; deviceId: string }[] = [];
  for (const record of outbox) {
    const ok = await postArgonTelemetry(toBackendPayload(record));
    if (ok) {
      uploaded.push({ receivedAtMs: record.receivedAtMs, deviceId: record.deviceId });
    }
  }

  if (uploaded.length > 0) {
    await removeFromOutboxUploaded(uploaded);
  }
  return uploaded.length;
}

async function fetchSupabaseRows(since: number, limit: number): Promise<{
  rows: TelemetryRow[];
  error: string | null;
}> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { rows: [], error: 'Sign in to load cloud history.' };
  }

  const { data: inRange, error: rangeError } = await supabase
    .from('argon_telemetry_samples')
    .select(
      'id, device_id, device_name, device_uptime_ms, metric_v1, metric_v2, csv_raw, received_at_ms',
    )
    .gte('received_at_ms', since)
    .order('received_at_ms', { ascending: true });

  if (!rangeError && inRange && inRange.length >= 2) {
    return { rows: inRange as TelemetryRow[], error: null };
  }

  const { data: recent, error: recentError } = await supabase
    .from('argon_telemetry_samples')
    .select(
      'id, device_id, device_name, device_uptime_ms, metric_v1, metric_v2, csv_raw, received_at_ms',
    )
    .order('received_at_ms', { ascending: false })
    .limit(limit);

  if (recentError) {
    return { rows: [], error: recentError.message };
  }

  const rows = ((recent ?? []) as TelemetryRow[]).sort((a, b) => a.received_at_ms - b.received_at_ms);
  return { rows, error: rangeError?.message ?? null };
}

/**
 * Load telemetry for charts: local outbox + latest snapshot + Supabase (time window or latest N).
 */
export async function fetchTelemetryHistory(minutes: number): Promise<{
  records: ArgonTelemetryRecord[];
  fromSupabase: number;
  fromLocal: number;
  error: string | null;
}> {
  const since = Date.now() - minutes * 60 * 1000;
  const limit = SAMPLE_LIMIT[minutes] ?? 40;
  const merged: ArgonTelemetryRecord[] = [];

  const outboxAll = await loadOutboxForSync();
  const localPicked = pickByTimeOrRecent(outboxAll, since, limit);
  merged.push(...localPicked);

  const latest = await loadLatestArgonTelemetry();
  if (latest) merged.push(latest);

  const { rows, error } = await fetchSupabaseRows(since, limit);
  for (const row of rows) {
    const record = rowToRecord(row);
    if (record) merged.push(record);
  }

  const records = dedupeRecords(merged);

  return {
    records,
    fromSupabase: rows.length,
    fromLocal: localPicked.length + (latest ? 1 : 0),
    error: records.length === 0 ? error : error && records.length < 2 ? error : null,
  };
}
