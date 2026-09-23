/**
 * After the athlete confirms a mode switch, rewrite recent local samples
 * so History charts match the new Training / Game / Sleep label.
 */
import type { UsageMode } from '../modes/storage';
import {
  loadLatestArgonTelemetry,
  loadOutboxForSync,
  writeLatestAndOutbox,
  writeOutbox,
} from './localStore';
import type { ArgonTelemetryRecord } from './types';

export async function retagLocalRecordsSince(
  sinceMs: number,
  mode: UsageMode,
  sessionId: string,
): Promise<number> {
  let count = 0;

  const latest = await loadLatestArgonTelemetry();
  const outbox = await loadOutboxForSync();
  let latestUpdated: ArgonTelemetryRecord | null = null;

  if (latest && latest.receivedAtMs >= sinceMs) {
    latestUpdated = {
      ...latest,
      usageMode: mode,
      sessionId,
      modeSource: 'manual',
      detectedMode: mode,
    };
    count += 1;
  }

  let changed = false;
  const next = outbox.map((r) => {
    if (r.receivedAtMs < sinceMs) return r;
    changed = true;
    count += 1;
    return {
      ...r,
      usageMode: mode,
      sessionId,
      modeSource: 'manual' as const,
      detectedMode: mode,
    };
  });

  if (latestUpdated) {
    await writeLatestAndOutbox(latestUpdated, changed ? next : outbox);
  } else if (changed) {
    await writeOutbox(next);
  }

  return count;
}
