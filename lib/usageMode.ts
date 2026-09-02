import AsyncStorage from '@react-native-async-storage/async-storage';

export type UsageMode = 'training' | 'game' | 'sleep';

export type ModeSource = 'auto' | 'manual';

export const USAGE_MODES: UsageMode[] = ['training', 'game', 'sleep'];

export const STORAGE_KEY_USAGE_MODE = 'guardsync_usage_mode';
export const STORAGE_KEY_SESSION_ID = 'guardsync_session_id';
export const STORAGE_KEY_MODE_SOURCE = 'guardsync_mode_source';
export const STORAGE_KEY_DETECTED_MODE = 'guardsync_last_detected_mode';

export const USAGE_MODE_LABELS: Record<UsageMode, string> = {
  training: 'Training',
  game: 'Game',
  sleep: 'Sleep',
};

export const USAGE_MODE_SUBTITLES: Record<UsageMode, string> = {
  training: 'Practice and drills — track effort and intensity',
  game: 'Competition — prioritize impact and concussion risk',
  sleep: 'Rest recovery — focus on vitals overnight',
};

export function isUsageMode(value: unknown): value is UsageMode {
  return value === 'training' || value === 'game' || value === 'sleep';
}

export function isModeSource(value: unknown): value is ModeSource {
  return value === 'auto' || value === 'manual';
}

function newSessionId(): string {
  return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Current mode, or `training` if never set. */
export async function getUsageMode(): Promise<UsageMode> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY_USAGE_MODE);
  return isUsageMode(raw) ? raw : 'training';
}

export async function getModeSource(): Promise<ModeSource> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY_MODE_SOURCE);
  return isModeSource(raw) ? raw : 'auto';
}

export async function getLastDetectedMode(): Promise<UsageMode | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY_DETECTED_MODE);
  return isUsageMode(raw) ? raw : null;
}

/** Persist mode and rotate session id (new session whenever mode changes). */
export async function setUsageMode(
  mode: UsageMode,
  source: ModeSource = 'manual',
): Promise<{ sessionId: string }> {
  const sessionId = newSessionId();
  await AsyncStorage.multiSet([
    [STORAGE_KEY_USAGE_MODE, mode],
    [STORAGE_KEY_SESSION_ID, sessionId],
    [STORAGE_KEY_MODE_SOURCE, source],
  ]);
  return { sessionId };
}

/** Apply auto-detected mode; rotates session id only when mode changes. */
export async function applyAutoDetectedMode(mode: UsageMode): Promise<{ sessionId: string; changed: boolean }> {
  await setLastDetectedMode(mode);
  const current = await getUsageMode();
  if (current === mode) {
    const sessionId = await getOrCreateSessionId();
    await AsyncStorage.setItem(STORAGE_KEY_MODE_SOURCE, 'auto');
    return { sessionId, changed: false };
  }
  const { sessionId } = await setUsageMode(mode, 'auto');
  return { sessionId, changed: true };
}

export async function setLastDetectedMode(mode: UsageMode): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_DETECTED_MODE, mode);
}

export async function resumeAutoDetection(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_MODE_SOURCE, 'auto');
}

/** Existing session id, or create one without changing mode. */
export async function getOrCreateSessionId(): Promise<string> {
  const existing = await AsyncStorage.getItem(STORAGE_KEY_SESSION_ID);
  if (existing && existing.length > 0) return existing;
  const sessionId = newSessionId();
  await AsyncStorage.setItem(STORAGE_KEY_SESSION_ID, sessionId);
  return sessionId;
}

export async function getUsageModeContext(): Promise<{
  usageMode: UsageMode;
  sessionId: string;
  modeSource: ModeSource;
  detectedMode: UsageMode | null;
}> {
  const [usageMode, sessionId, modeSource, detectedMode] = await Promise.all([
    getUsageMode(),
    getOrCreateSessionId(),
    getModeSource(),
    getLastDetectedMode(),
  ]);
  return { usageMode, sessionId, modeSource, detectedMode };
}
