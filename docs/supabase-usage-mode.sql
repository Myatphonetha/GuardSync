-- GuardSync: usage mode + auto-detection metadata on BLE telemetry samples.
-- Run once in Supabase SQL Editor (Dashboard → SQL).

ALTER TABLE argon_telemetry_samples
  ADD COLUMN IF NOT EXISTS usage_mode text,
  ADD COLUMN IF NOT EXISTS session_id text,
  ADD COLUMN IF NOT EXISTS detected_mode text,
  ADD COLUMN IF NOT EXISTS mode_source text;

CREATE INDEX IF NOT EXISTS argon_telemetry_samples_usage_mode_received_at_idx
  ON argon_telemetry_samples (usage_mode, received_at_ms);

COMMENT ON COLUMN argon_telemetry_samples.usage_mode IS
  'Confirmed activity: training | game | sleep';
COMMENT ON COLUMN argon_telemetry_samples.detected_mode IS
  'Rule-based / ML guess at sample time';
COMMENT ON COLUMN argon_telemetry_samples.mode_source IS
  'How usage_mode was set: auto | manual';
