/**
 * One saved Argon sample on the phone, and the JSON shape we POST to Supabase.
 * Field names on the backend stay snake_case so the SQL table can stay stable.
 */
import type { ModeSource, UsageMode } from '../modes/storage';

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
  usageMode: UsageMode;
  sessionId: string;
  detectedMode: UsageMode | null;
  modeSource: ModeSource;
};

export type ArgonBackendPayload = {
  schema_version: 1;
  source: 'argon_nordic_uart';
  device_id: string;
  device_name: string;
  device_uptime_ms: number;
  metric_v1: number;
  metric_v2: number;
  raw_line: string;
  received_at_ms: number;
  usage_mode: UsageMode;
  session_id: string;
  detected_mode: UsageMode | null;
  mode_source: ModeSource;
};

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
    usage_mode: record.usageMode ?? 'training',
    session_id: record.sessionId ?? '',
    detected_mode: record.detectedMode ?? null,
    mode_source: record.modeSource ?? 'manual',
  };
}
