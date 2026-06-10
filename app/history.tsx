import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { DashboardBottomNav } from '../components/DashboardBottomNav';
import { HistoryBarChart } from '../components/HistoryBarChart';
import { HistoryChartCard } from '../components/HistoryChartCard';
import { TIME_RANGES, chartStats, countCritical } from '../lib/historyChartData';
import {
  recordsToBiteForceChart,
  recordsToHeadAccelerationChart,
  recordsToHeartRateChart,
  recordsToSpO2Chart,
  recordsToTemperatureChart,
} from '../lib/historyFromRecords';
import { theme } from '../theme';
import { fetchTelemetryHistory, syncLocalOutboxToSupabase } from '../services/telemetryHistory';

const TEMP_ORANGE = '#F4A261';
const HEAD_ORANGE = '#FFA726';

export default function HistoryScreen() {
  const [selectedRange, setSelectedRange] = useState(5);
  const [loading, setLoading] = useState(true);
  const [syncedCount, setSyncedCount] = useState(0);
  const [sampleCount, setSampleCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [heartRateData, setHeartRateData] = useState<ReturnType<typeof recordsToHeartRateChart>>([]);
  const [spO2Data, setSpO2Data] = useState<ReturnType<typeof recordsToSpO2Chart>>([]);
  const [temperatureData, setTemperatureData] = useState<ReturnType<typeof recordsToTemperatureChart>>(
    [],
  );
  const [headAccelData, setHeadAccelData] = useState<ReturnType<typeof recordsToHeadAccelerationChart>>(
    [],
  );
  const [biteForceData, setBiteForceData] = useState<ReturnType<typeof recordsToBiteForceChart>>([]);

  const loadHistory = useCallback(async (minutes: number) => {
    setLoading(true);
    setLoadError(null);
    try {
      const { records, fromSupabase, error } = await fetchTelemetryHistory(minutes);
      setSampleCount(records.length);

      const uploaded = await syncLocalOutboxToSupabase();
      setSyncedCount(uploaded);
      if (error && records.length === 0) {
        setLoadError(error);
      } else if (error) {
        setLoadError(error);
      }

      setHeartRateData(recordsToHeartRateChart(records));
      setSpO2Data(recordsToSpO2Chart(records));
      setTemperatureData(recordsToTemperatureChart(records));
      setHeadAccelData(recordsToHeadAccelerationChart(records));
      setBiteForceData(recordsToBiteForceChart(records));

      if (__DEV__ && records.length > 0) {
        console.log(
          `[history] ${records.length} samples (${fromSupabase} from Supabase, ${uploaded} synced from device)`,
        );
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
      setSampleCount(0);
      setHeartRateData([]);
      setSpO2Data([]);
      setTemperatureData([]);
      setHeadAccelData([]);
      setBiteForceData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.flex}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable style={styles.backBtn} onPress={() => router.replace('/dashboard')}>
              <MaterialCommunityIcons name="arrow-left" size={20} color={theme.muted} />
            </Pressable>
            <View style={styles.headerText}>
              <Text style={styles.title}>Performance History</Text>
              <Text style={styles.subtitle}>Track your metrics over time</Text>
            </View>
            {criticalCount > 0 && (
              <View style={styles.alertBadge}>
                <MaterialCommunityIcons name="alert" size={14} color={theme.danger} />
                <Text style={styles.alertText}>
                  {criticalCount} Alert{criticalCount === 1 ? '' : 's'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.rangeRow}>
            {TIME_RANGES.map((range) => {
              const active = selectedRange === range.value;
              return (
                <Pressable
                  key={range.value}
                  style={[styles.rangeBtn, active && styles.rangeBtnActive]}
                  onPress={() => {
                    setSelectedRange(range.value);
                    void loadHistory(range.value);
                  }}
                >
                  <Text style={[styles.rangeText, active && styles.rangeTextActive]}>{range.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={theme.primary} />
              <Text style={styles.loadingText}>Loading telemetry…</Text>
            </View>
          ) : null}

          {loadError ? <Text style={styles.warnText}>{loadError}</Text> : null}

          {syncedCount > 0 ? (
            <Text style={styles.metaText}>Synced {syncedCount} sample(s) from this device to the cloud.</Text>
          ) : null}

          {empty ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No samples yet</Text>
              <Text style={styles.emptyBody}>
                1. Sign in{'\n'}
                2. Open Dashboard with Argon connected (Status: Live){'\n'}
                3. Wait 30–60 seconds, then open History{'\n\n'}
                If you already collected data, try the 5min tab — we show your most recent samples even if
                they are slightly older than 1 minute.
              </Text>
            </View>
          ) : null}

          {!empty && !loading ? (
            <>
              <HistoryChartCard
                title="Heart Rate"
                subtitle={`Avg: ${hrStats.avg} BPM • Min: ${hrStats.min} • Max: ${hrStats.max}`}
              >
                <HistoryBarChart
                  data={heartRateData}
                  yMin={Math.min(50, hrStats.min - 10)}
                  yMax={Math.max(200, hrStats.max + 10)}
                  threshold={180}
                  barColor={theme.primary}
                />
              </HistoryChartCard>

              <HistoryChartCard title="Blood Oxygen (SpO2)" subtitle={`Avg: ${spO2Stats.avg}%`}>
                <HistoryBarChart
                  data={spO2Data}
                  yMin={85}
                  yMax={100}
                  threshold={92}
                  barColor={theme.primary}
                  yTicks={[85, 89, 93, 100]}
                />
              </HistoryChartCard>

              <HistoryChartCard title="Body Temperature" subtitle="°F" trendColor={TEMP_ORANGE}>
                <HistoryBarChart
                  data={temperatureData}
                  yMin={97}
                  yMax={103}
                  threshold={100.4}
                  barColor={TEMP_ORANGE}
                  yTicks={[97, 99, 101, 103]}
                />
              </HistoryChartCard>

              <HistoryChartCard
                title="Head Acceleration Events"
                subtitle={`Max Impact: ${maxHeadAccel}g`}
                badge={
                  maxHeadAccel > 80
                    ? { label: 'High Risk', color: theme.danger, bg: 'rgba(217, 83, 79, 0.12)' }
                    : undefined
                }
                trendColor={HEAD_ORANGE}
              >
                <HistoryBarChart
                  data={headAccelData}
                  yMin={0}
                  yMax={120}
                  threshold={80}
                  barColor={HEAD_ORANGE}
                  yTicks={[0, 30, 60, 90, 120]}
                />
              </HistoryChartCard>

              <HistoryChartCard title="Bite Force" subtitle="Newtons (N)">
                <HistoryBarChart
                  data={biteForceData}
                  yMin={130}
                  yMax={260}
                  threshold={220}
                  barColor={theme.primary}
                  yTicks={[130, 173, 217, 260]}
                />
              </HistoryChartCard>

              <Text style={styles.metaText}>
                {sampleCount} sample(s) shown
                {sampleCount < 3 ? ' — collect more on Dashboard for fuller charts' : ''}
              </Text>
            </>
          ) : null}
        </ScrollView>

        <DashboardBottomNav role="athlete" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.statusCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
  },
  subtitle: {
    fontSize: 12,
    color: theme.muted,
    marginTop: 2,
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(217, 83, 79, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    maxWidth: 100,
  },
  alertText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.danger,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  rangeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
  },
  rangeBtnActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  rangeText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.muted,
  },
  rangeTextActive: {
    color: '#fff',
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  loadingText: { fontSize: 14, color: theme.muted },
  warnText: {
    fontSize: 13,
    color: theme.warning,
    marginBottom: 12,
    lineHeight: 18,
  },
  metaText: {
    fontSize: 12,
    color: theme.muted,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyBox: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    padding: 20,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 13,
    color: theme.muted,
    lineHeight: 20,
  },
});
