-- Run in Supabase SQL Editor AFTER your original argon_telemetry_samples setup.
-- Adds Training / Game / Sleep + auto-detection columns used by the mobile app.

ALTER TABLE public.argon_telemetry_samples
  ADD COLUMN IF NOT EXISTS usage_mode text,
  ADD COLUMN IF NOT EXISTS session_id text,
  ADD COLUMN IF NOT EXISTS detected_mode text,
  ADD COLUMN IF NOT EXISTS mode_source text;

CREATE INDEX IF NOT EXISTS argon_telemetry_samples_usage_mode_received_at_idx
  ON public.argon_telemetry_samples (usage_mode, received_at_ms);

COMMENT ON COLUMN public.argon_telemetry_samples.usage_mode IS
  'Confirmed activity: training | game | sleep';
COMMENT ON COLUMN public.argon_telemetry_samples.session_id IS
  'Client session id; rotates when activity mode changes';
COMMENT ON COLUMN public.argon_telemetry_samples.detected_mode IS
  'Rule-based / ML guess at sample time';
COMMENT ON COLUMN public.argon_telemetry_samples.mode_source IS
  'How usage_mode was set: auto | manual';

-- Optional: reload PostgREST schema cache (usually picks up within ~30s automatically)
-- NOTIFY pgrst, 'reload schema';
