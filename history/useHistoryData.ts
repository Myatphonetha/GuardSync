/**
 * Loads History charts: fetch local + cloud samples, map them to bars,
 * and optionally show a "switch mode?" prompt.
 */
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { confirmModeChange } from '../modes/confirmChange';
import { getUsageMode, type UsageMode } from '../modes/storage';
import {
  analyzeHistoryForModeSuggestion,
  type HistoryModeSuggestion,
} from '../modes/suggestChange';
import { fetchTelemetryHistory, syncLocalOutboxToSupabase } from '../telemetry/historyRepository';
import { TIME_RANGES, chartStats, countCritical } from './chartConfig';
import {
  countByUsageMode,
  recordsToActivitySegments,
  recordsToBiteForceChart,
  recordsToHeadAccelerationChart,
  recordsToHeartRateChart,
  recordsToSpO2Chart,
  recordsToTemperatureChart,
} from './chartTransforms';

export function useHistoryData() {
  const [selectedRange, setSelectedRange] = useState(5);
  const [loading, setLoading] = useState(true);
  const [syncedCount, setSyncedCount] = useState(0);
  const [sampleCount, setSampleCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modeCounts, setModeCounts] = useState<Partial<Record<UsageMode, number>>>({});
  const [activitySegments, setActivitySegments] = useState<
    ReturnType<typeof recordsToActivitySegments>
  >([]);
  const [timelineEnd, setTimelineEnd] = useState('0s');

  const [heartRateData, setHeartRateData] = useState<ReturnType<typeof recordsToHeartRateChart>>([]);
  const [spO2Data, setSpO2Data] = useState<ReturnType<typeof recordsToSpO2Chart>>([]);
  const [temperatureData, setTemperatureData] = useState<ReturnType<typeof recordsToTemperatureChart>>(
    [],
  );
  const [headAccelData, setHeadAccelData] = useState<ReturnType<typeof recordsToHeadAccelerationChart>>(
    [],
  );
  const [biteForceData, setBiteForceData] = useState<ReturnType<typeof recordsToBiteForceChart>>([]);

  const [modeSuggestion, setModeSuggestion] = useState<HistoryModeSuggestion | null>(null);
  const [modePromptDismissed, setModePromptDismissed] = useState(false);
  const [confirmingMode, setConfirmingMode] = useState(false);

  const loadHistory = useCallback(async (minutes: number, skipModePrompt = false) => {
    setLoading(true);
    setLoadError(null);
    try {
      const { records, fromSupabase, error } = await fetchTelemetryHistory(minutes, 'all');
      setSampleCount(records.length);
      setModeCounts(countByUsageMode(records));
      setActivitySegments(recordsToActivitySegments(records));
      const lastChart = recordsToHeartRateChart(records);
      setTimelineEnd(lastChart.length > 0 ? lastChart[lastChart.length - 1].time : '0s');

      if (error) {
        setLoadError(error);
      }

      setHeartRateData(recordsToHeartRateChart(records));
      setSpO2Data(recordsToSpO2Chart(records));
      setTemperatureData(recordsToTemperatureChart(records));
      setHeadAccelData(recordsToHeadAccelerationChart(records));
      setBiteForceData(recordsToBiteForceChart(records));

      if (!skipModePrompt && !modePromptDismissed && records.length > 0) {
        const currentMode = await getUsageMode();
        setModeSuggestion(analyzeHistoryForModeSuggestion(records, currentMode));
      } else if (skipModePrompt) {
        setModeSuggestion(null);
      }

      void syncLocalOutboxToSupabase()
        .then((uploaded) => setSyncedCount(uploaded))
        .catch(() => {});

      if (__DEV__ && records.length > 0) {
        console.log(`[history] ${records.length} samples (${fromSupabase} from Supabase)`);
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
      setSampleCount(0);
      setModeCounts({});
      setActivitySegments([]);
      setTimelineEnd('0s');
      setHeartRateData([]);
      setSpO2Data([]);
      setTemperatureData([]);
      setHeadAccelData([]);
      setBiteForceData([]);
      setModeSuggestion(null);
    } finally {
      setLoading(false);
    }
  }, [modePromptDismissed]);

  const handleConfirmModeSwitch = useCallback(async () => {
    if (!modeSuggestion) return;
    setConfirmingMode(true);
    try {
      await confirmModeChange(modeSuggestion);
      setModeSuggestion(null);
      await loadHistory(selectedRange, true);
    } finally {
      setConfirmingMode(false);
    }
  }, [loadHistory, modeSuggestion, selectedRange]);

  const handleDismissModePrompt = useCallback(() => {
    setModePromptDismissed(true);
    setModeSuggestion(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setModePromptDismissed(false);
      void loadHistory(selectedRange);
    }, [loadHistory, selectedRange]),
  );

  const hrStats = chartStats(heartRateData);
  const spO2Stats = chartStats(spO2Data);
  const maxHeadAccel =
    headAccelData.length > 0
      ? Math.round(Math.max(...headAccelData.map((d) => d.value)))
      : 0;

  const criticalCount = countCritical(
    heartRateData,
    spO2Data,
    temperatureData,
    headAccelData,
    biteForceData,
  );

  const empty = !loading && sampleCount === 0;

  return {
    TIME_RANGES,
    selectedRange,
    setSelectedRange,
    loading,
    syncedCount,
    sampleCount,
    loadError,
    modeCounts,
    activitySegments,
    timelineEnd,
    heartRateData,
    spO2Data,
    temperatureData,
    headAccelData,
    biteForceData,
    modeSuggestion,
    confirmingMode,
    loadHistory,
    handleConfirmModeSwitch,
    handleDismissModePrompt,
    setModePromptDismissed,
    hrStats,
    spO2Stats,
    maxHeadAccel,
    criticalCount,
    empty,
  };
}
