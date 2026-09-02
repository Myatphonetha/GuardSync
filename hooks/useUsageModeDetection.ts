import { useCallback, useEffect, useState } from 'react';
import { getModeSource, getUsageMode, setUsageMode, type ModeSource, type UsageMode } from '../lib/usageMode';

const REFRESH_MS = 2_000;

export type UseUsageModeDetectionResult = {
  usageMode: UsageMode;
  modeSource: ModeSource;
  selectMode: (mode: UsageMode) => Promise<void>;
};

/** Reflects athlete-selected mode (set after scan or on dashboard). */
export function useUsageModeDetection(streamLive: boolean): UseUsageModeDetectionResult {
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

  const selectMode = useCallback(
    async (mode: UsageMode) => {
      await setUsageMode(mode, 'manual');
      setUsageModeState(mode);
      setModeSourceState('manual');
    },
    [],
  );

  return {
    usageMode,
    modeSource,
    selectMode,
  };
}
