/**
 * Reads the stored activity mode so Dashboard pills stay in sync with AsyncStorage.
 * This hook does not run detection — it only reflects what the athlete picked.
 */
import { useCallback, useEffect, useState } from 'react';
import { getModeSource, getUsageMode, setUsageMode, type ModeSource, type UsageMode } from './storage';

const REFRESH_MS = 2_000;

export type UseUsageModeResult = {
  usageMode: UsageMode;
  modeSource: ModeSource;
  selectMode: (mode: UsageMode) => Promise<void>;
};

export function useUsageMode(streamLive: boolean): UseUsageModeResult {
  const [usageMode, setUsageModeState] = useState<UsageMode>('training');
  const [modeSource, setModeSourceState] = useState<ModeSource>('manual');

  const refreshMode = useCallback(async () => {
    const [mode, source] = await Promise.all([getUsageMode(), getModeSource()]);
    setUsageModeState(mode);
    setModeSourceState(source);
  }, []);

  useEffect(() => {
    void refreshMode();
  }, [refreshMode]);

  useEffect(() => {
    if (!streamLive) return;
    void refreshMode();
    const timer = setInterval(() => void refreshMode(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [streamLive, refreshMode]);

  const selectMode = useCallback(async (mode: UsageMode) => {
    await setUsageMode(mode, 'manual');
    setUsageModeState(mode);
    setModeSourceState('manual');
  }, []);

  return {
    usageMode,
    modeSource,
    selectMode,
  };
}
