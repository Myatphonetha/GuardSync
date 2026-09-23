/**
 * Builds the History timeline: local phone samples first, then cloud rows.
 * Cloud calls time out so a slow network cannot freeze the screen.
 */
import { parseArgonUartLine } from '../ble/nordicUart';
import { supabase } from '../lib/supabase';
import { isModeSource, isUsageMode, type UsageMode } from '../modes/storage';
import {
  loadLatestArgonTelemetry,
  loadOutboxForSync,
  removeFromOutboxUploaded,
} from './localStore';
import { toBackendPayload, type ArgonTelemetryRecord } from './types';
import { postArgonTelemetry } from './upload';

const CLOUD_FETCH_TIMEOUT_MS = 8_000;
const UPLOAD_TIMEOUT_MS = 5_000;
const MAX_SYNC_BATCH = 20;

async function withTimeout<T>(promise: PromiseLike<T>, ms: number, fallback: T): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export type HistoryModeFilter = 'all' | UsageMode;

type TelemetryRow = {
  id: number;
  device_id: string;
  device_name: string;
  device_uptime_ms: number;
  metric_v1: number;
  metric_v2: number;
  csv_raw: string;
  received_at_ms: number;
  usage_mode?: string | null;
  session_id?: string | null;
  detected_mode?: string | null;
  mode_source?: string | null;
};

const SAMPLE_LIMIT: Record<number, number> = {
  1: 40,
  3: 100,
  5: 160,
};

function rowToRecord(row: TelemetryRow): ArgonTelemetryRecord | null {
  const usageMode = isUsageMode(row.usage_mode) ? row.usage_mode : 'training';
  const sessionId = typeof row.session_id === 'string' ? row.session_id : '';
  const detectedMode = isUsageMode(row.detected_mode) ? row.detected_mode : null;
  const modeSource = isModeSource(row.mode_source) ? row.mode_source : 'manual';

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
      usageMode,
      sessionId,
      detectedMode,
      modeSource,
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
    usageMode,
    sessionId,
    detectedMode,
    modeSource,
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

function filterByMode(records: ArgonTelemetryRecord[], mode: HistoryModeFilter): ArgonTelemetryRecord[] {
  if (mode === 'all') return records;
  return records.filter((r) => (r.usageMode ?? 'training') === mode);
}

function applyHistoryWindow(
  records: ArgonTelemetryRecord[],
  minutes: number,
  limit: number,
): ArgonTelemetryRecord[] {
  if (records.length === 0) return [];

  const sorted = [...records].sort((a, b) => a.receivedAtMs - b.receivedAtMs);
  const since = Date.now() - minutes * 60 * 1000;
  const inClockWindow = sorted.filter((r) => r.receivedAtMs >= since);
  if (inClockWindow.length >= 2) return inClockWindow;

  const anchor = sorted[sorted.length - 1].receivedAtMs;
  const windowStart = anchor - minutes * 60 * 1000;
  const anchored = sorted.filter((r) => r.receivedAtMs >= windowStart);
  if (anchored.length > 0) return anchored.slice(-limit);

  return sorted.slice(-limit);
}

export async function syncLocalOutboxToSupabase(): Promise<number> {
  const outbox = await loadOutboxForSync();
  if (outbox.length === 0) return 0;

  const batch = outbox.slice(-MAX_SYNC_BATCH);
  const uploaded: { receivedAtMs: number; deviceId: string }[] = [];
  for (const record of batch) {
    const ok = await withTimeout(postArgonTelemetry(toBackendPayload(record)), UPLOAD_TIMEOUT_MS, false);
    if (ok) {
      uploaded.push({ receivedAtMs: record.receivedAtMs, deviceId: record.deviceId });
    }
  }

  if (uploaded.length > 0) {
    await removeFromOutboxUploaded(uploaded);
  }
  return uploaded.length;
}

async function fetchSupabaseRows(
  since: number,
  limit: number,
  mode: HistoryModeFilter,
): Promise<{
  rows: TelemetryRow[];
  error: string | null;
}> {
  const { data: authData } = await withTimeout(
    supabase.auth.getUser() as PromiseLike<{ data: { user: { id: string } | null } }>,
    CLOUD_FETCH_TIMEOUT_MS,
    { data: { user: null } },
  );
  if (!authData.user) {
    return { rows: [], error: 'Sign in to load cloud history.' };
  }

  const selectCols =
    'id, device_id, device_name, device_uptime_ms, metric_v1, metric_v2, csv_raw, received_at_ms, usage_mode, session_id, detected_mode, mode_source';

  let rangeQuery = supabase
    .from('argon_telemetry_samples')
    .select(selectCols)
    .gte('received_at_ms', since)
    .order('received_at_ms', { ascending: true });

  if (mode !== 'all') {
    rangeQuery = rangeQuery.eq('usage_mode', mode);
  }

  const { data: inRange, error: rangeError } = await withTimeout(
    rangeQuery as PromiseLike<{ data: TelemetryRow[] | null; error: { message: string } | null }>,
    CLOUD_FETCH_TIMEOUT_MS,
    { data: null, error: { message: 'Cloud history timed out.' } },
  );

  if (!rangeError && inRange && inRange.length >= 2) {
    return { rows: inRange as TelemetryRow[], error: null };
  }

  let recentQuery = supabase
    .from('argon_telemetry_samples')
    .select(selectCols)
    .order('received_at_ms', { ascending: false })
    .limit(limit);

  if (mode !== 'all') {
    recentQuery = recentQuery.eq('usage_mode', mode);
  }

  const { data: recent, error: recentError } = await withTimeout(
    recentQuery as PromiseLike<{ data: TelemetryRow[] | null; error: { message: string } | null }>,
    CLOUD_FETCH_TIMEOUT_MS,
    { data: null, error: { message: 'Cloud history timed out.' } },
  );

  if (recentError) {
    return { rows: [], error: recentError.message };
  }

  const rows = ((recent ?? []) as TelemetryRow[]).sort((a, b) => a.received_at_ms - b.received_at_ms);
  return { rows, error: rangeError?.message ?? null };
}

export async function fetchTelemetryHistory(
  minutes: number,
  mode: HistoryModeFilter = 'all',
): Promise<{
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

  const { rows, error } = await fetchSupabaseRows(since, limit, mode);
  for (const row of rows) {
    const record = rowToRecord(row);
    if (record) merged.push(record);
  }

  const records = applyHistoryWindow(filterByMode(dedupeRecords(merged), mode), minutes, limit);

  return {
    records,
    fromSupabase: rows.length,
    fromLocal: localPicked.length + (latest ? 1 : 0),
    error: records.length === 0 ? error : error && records.length < 2 ? error : null,
  };
}
