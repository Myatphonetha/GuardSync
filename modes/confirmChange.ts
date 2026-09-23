/**
 * Shared "athlete said yes, switch mode" path for Dashboard and History.
 * Saves the new mode, then re-labels recent local samples.
 */
import { retagLocalRecordsSince } from '../telemetry/retag';
import { setLastDetectedMode, setUsageMode } from './storage';
import type { ModeChangeSuggestion } from './suggestChange';

export async function confirmModeChange(suggestion: ModeChangeSuggestion): Promise<void> {
  const { sessionId } = await setUsageMode(suggestion.suggestedMode, 'manual');
  await setLastDetectedMode(suggestion.suggestedMode);
  await retagLocalRecordsSince(suggestion.sinceMs, suggestion.suggestedMode, sessionId);
}
