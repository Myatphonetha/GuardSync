/**
 * While Argon is connected, periodically checks live vitals and asks
 * "switch to Game?" — never auto-switches.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getRecentTelemetrySamples } from '../telemetry/recentBuffer';
import { confirmModeChange } from './confirmChange';
import { getUsageMode } from './storage';
import { suggestModeChange, type ModeChangeSuggestion } from './suggestChange';

const CHECK_MS = 3_000;
const DISMISS_COOLDOWN_MS = 10 * 60 * 1000;

export type UseModeChangePromptResult = {
  suggestion: ModeChangeSuggestion | null;
  confirming: boolean;
  confirmModeChange: () => Promise<void>;
  dismissModeChange: () => void;
};

export function useModeChangePrompt(
  enabled: boolean,
  onModeChanged?: (mode: ModeChangeSuggestion['suggestedMode']) => void,
): UseModeChangePromptResult {
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

  const onConfirm = useCallback(async () => {
    if (!suggestion) return;
    setConfirming(true);
    try {
      await confirmModeChange(suggestion);
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
    confirmModeChange: onConfirm,
    dismissModeChange,
  };
}
