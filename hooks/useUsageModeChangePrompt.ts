import { useCallback, useEffect, useRef, useState } from 'react';
import { retagLocalRecordsSince } from '../lib/argonTelemetry';
import { suggestModeChange, type ModeChangeSuggestion } from '../lib/modeChangeSuggestion';
import { getRecentTelemetrySamples } from '../lib/recentTelemetryBuffer';
import { getUsageMode, setLastDetectedMode, setUsageMode } from '../lib/usageMode';

const CHECK_MS = 3_000;
const DISMISS_COOLDOWN_MS = 10 * 60 * 1000;

export type UseUsageModeChangePromptResult = {
  suggestion: ModeChangeSuggestion | null;
  confirming: boolean;
  confirmModeChange: () => Promise<void>;
  dismissModeChange: () => void;
};

export function useUsageModeChangePrompt(
  enabled: boolean,
  onModeChanged?: (mode: ModeChangeSuggestion['suggestedMode']) => void,
): UseUsageModeChangePromptResult {
  const [suggestion, setSuggestion] = useState<ModeChangeSuggestion | null>(null);
  const [confirming, setConfirming] = useState(false);
  const dismissedRef = useRef<{ mode: ModeChangeSuggestion['suggestedMode']; at: number } | null>(
    null,
  );

  const evaluate = useCallback(async () => {
    const samples = getRecentTelemetrySamples();
    const currentMode = await getUsageMode();
    const next = suggestModeChange(samples, currentMode);

    if (!next) {
      setSuggestion(null);
      return;
    }

    const dismissed = dismissedRef.current;
    if (
      dismissed &&
      dismissed.mode === next.suggestedMode &&
      Date.now() - dismissed.at < DISMISS_COOLDOWN_MS
    ) {
      return;
    }

    setSuggestion(next);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setSuggestion(null);
      return;
    }

    void evaluate();
    const timer = setInterval(() => void evaluate(), CHECK_MS);
    return () => clearInterval(timer);
  }, [enabled, evaluate]);

  const confirmModeChange = useCallback(async () => {
    if (!suggestion) return;
    setConfirming(true);
    try {
      const { sessionId } = await setUsageMode(suggestion.suggestedMode, 'manual');
      await setLastDetectedMode(suggestion.suggestedMode);
      await retagLocalRecordsSince(suggestion.sinceMs, suggestion.suggestedMode, sessionId);
      dismissedRef.current = null;
      setSuggestion(null);
      onModeChanged?.(suggestion.suggestedMode);
    } finally {
      setConfirming(false);
    }
  }, [onModeChanged, suggestion]);

  const dismissModeChange = useCallback(() => {
    if (suggestion) {
      dismissedRef.current = { mode: suggestion.suggestedMode, at: Date.now() };
    }
    setSuggestion(null);
  }, [suggestion]);

  return {
    suggestion,
    confirming,
    confirmModeChange,
    dismissModeChange,
  };
}
