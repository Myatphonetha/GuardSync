import type { ArgonBackendPayload } from '../lib/argonTelemetry';
import { supabase } from '../lib/supabase';

/**
 * Inserts one BLE-derived sample into Supabase/Postgres.
 * Requires an authenticated user; RLS policies enforce `user_id = auth.uid()`.
 */
export async function postArgonTelemetry(payload: ArgonBackendPayload): Promise<boolean> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    throw authError;
  }

  const userId = authData.user?.id;
  if (!userId) {
    if (__DEV__) {
      console.warn('[telemetryBackend] Skipping upload: no signed-in user.');
    }
    return false;
  }

  const { error } = await supabase.from('argon_telemetry_samples').insert({
    user_id: userId,
    schema_version: payload.schema_version,
    source: payload.source,
    device_id: payload.device_id,
    device_name: payload.device_name,
    device_uptime_ms: payload.device_uptime_ms,
    metric_v1: payload.metric_v1,
    metric_v2: payload.metric_v2,
    csv_raw: payload.raw_line,
    received_at_ms: payload.received_at_ms,
    usage_mode: payload.usage_mode,
    session_id: payload.session_id,
    detected_mode: payload.detected_mode,
    mode_source: payload.mode_source,
  });

  if (error) {
    console.warn('[telemetryBackend] Insert failed', error.message);
    return false;
  }
  return true;
}
