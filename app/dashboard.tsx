import { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DashboardBottomNav } from '../components/DashboardBottomNav';
import { DashboardMetricCard } from '../components/DashboardMetricCard';
import { HistoryModePrompt } from '../components/HistoryModePrompt';
import { useArgonLiveTelemetry } from '../hooks/useArgonLiveTelemetry';
import { useUsageModeChangePrompt } from '../hooks/useUsageModeChangePrompt';
import { useUsageModeDetection } from '../hooks/useUsageModeDetection';
import { USAGE_MODE_LABELS, USAGE_MODES, type UsageMode } from '../lib/usageMode';
import { theme } from '../theme';

function formatActiveMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0) return `${h}H ${m}M`;
  return `${m}M`;
}

function concussionRisk(headAccel: number): { label: string; color: string } {
  if (headAccel >= 120) return { label: 'High', color: theme.danger };
  if (headAccel >= 90) return { label: 'Moderate', color: theme.warning };
  return { label: 'Low', color: theme.primary };
}

function zoneHr(hr: number): string {
  if (hr >= 190) return theme.danger;
  if (hr >= 165) return theme.warning;
  if (hr >= 150) return theme.warning;
  return theme.primary;
}

function zoneSpo2(v: number): string {
  if (v < 92) return theme.danger;
  if (v < 95) return theme.warning;
  return theme.primary;
}

function zoneTemp(t: number): string {
  if (t > 100.4) return theme.danger;
  if (t >= 100) return theme.warning;
  if (t > 99.5) return theme.warning;
  return theme.primary;
}

function zoneBite(n: number): string {
  if (n > 300) return theme.danger;
  if (n >= 250) return theme.warning;
  if (n >= 200) return theme.warning;
  return theme.primary;
}

type MetricKey =
  | 'sport'
  | 'activeMinutes'
  | 'headAccel'
  | 'concussionRisk'
  | 'heartRate'
  | 'spO2'
  | 'bodyTemp'
  | 'biteForce';

const MODE_CARD_ORDER: Record<UsageMode, MetricKey[]> = {
  game: ['headAccel', 'concussionRisk', 'biteForce', 'heartRate', 'activeMinutes', 'spO2', 'bodyTemp', 'sport'],
  training: ['activeMinutes', 'heartRate', 'headAccel', 'concussionRisk', 'spO2', 'bodyTemp', 'biteForce', 'sport'],
  sleep: ['heartRate', 'spO2', 'bodyTemp', 'activeMinutes', 'headAccel', 'concussionRisk', 'biteForce', 'sport'],
};

export default function DashboardScreen() {
  const {
    connected,
    streamLive,
    activeMinutes,
    headAccel,
    heartRate,
    spO2,
    bodyTemp,
    biteForce,
  } = useArgonLiveTelemetry();

  const { usageMode, selectMode } = useUsageModeDetection(streamLive);

  const { suggestion, confirming, confirmModeChange, dismissModeChange } = useUsageModeChangePrompt(
    connected,
    (mode) => void selectMode(mode),
  );

  const risk = concussionRisk(headAccel);
  const statusLabel = streamLive ? 'Connected' : connected ? 'Connected' : 'Not paired';
  const statusColor = connected ? theme.primary : theme.muted;

  const cards: Record<MetricKey, ReactNode> = {
    sport: <DashboardMetricCard key="sport" label="Sport" value="Football" icon="run" />,
    activeMinutes: (
      <DashboardMetricCard
        key="activeMinutes"
        label="Active Minutes"
        value={formatActiveMinutes(activeMinutes)}
        icon="timer-sand"
      />
    ),
    headAccel: (
      <DashboardMetricCard
        key="headAccel"
        label="Head Acceleration"
        value={`${headAccel}g`}
        icon="football-helmet"
      />
    ),
    concussionRisk: (
      <DashboardMetricCard
        key="concussionRisk"
        label="Concussion Risk"
        value={risk.label}
        valueColor={risk.color}
        icon="alert"
        iconColor={theme.danger}
      />
    ),
    heartRate: (
      <DashboardMetricCard
        key="heartRate"
        label="Heart Rate"
        value={`${heartRate} BPM`}
        valueColor={zoneHr(heartRate)}
        icon="heart-pulse"
      />
    ),
    spO2: (
      <DashboardMetricCard
        key="spO2"
        label="SpO2"
        value={`${spO2}%`}
        valueColor={zoneSpo2(spO2)}
        icon="molecule-co2"
      />
    ),
    bodyTemp: (
      <DashboardMetricCard
        key="bodyTemp"
        label="Body Temperature"
        value={`${bodyTemp.toFixed(1)} °F`}
        valueColor={zoneTemp(bodyTemp)}
        icon="thermometer"
      />
    ),
    biteForce: (
      <DashboardMetricCard
        key="biteForce"
        label="Bite Force"
        value={`${biteForce} N`}
        valueColor={zoneBite(biteForce)}
        icon="tooth"
      />
    ),
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.flex}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.avatarWrap}>
              <MaterialCommunityIcons name="account" size={28} color={theme.muted} />
            </View>
            <Text style={styles.name}>John Smith</Text>
            <View style={[styles.btCircle, streamLive && styles.btCircleLive]}>
              <MaterialCommunityIcons
                name="bluetooth"
                size={22}
                color={connected ? theme.primary : theme.infoIcon}
              />
            </View>
          </View>

          <View style={styles.statusCard}>
            <View style={styles.statusCol}>
              <Text style={styles.statusLine}>
                Status: <Text style={[styles.statusValue, { color: statusColor }]}>{statusLabel}</Text>
              </Text>
              <Text style={styles.statusLine}>Sex: Male</Text>
            </View>
            <View style={styles.statusCol}>
              <Text style={styles.statusLine}>Weight: 247 lbs</Text>
              <Text style={styles.statusLine}>Height: 6&apos; 2&quot;</Text>
            </View>
          </View>

          {suggestion ? (
            <HistoryModePrompt
              suggestion={suggestion}
              confirming={confirming}
              onConfirm={() => void confirmModeChange()}
              onDismiss={dismissModeChange}
            />
          ) : null}

          <View style={styles.modeSection}>
            <Text style={styles.modeLabel}>Activity</Text>
            <View style={styles.modeSegment}>
              {USAGE_MODES.map((mode) => {
                const active = usageMode === mode;
                return (
                  <Pressable
                    key={mode}
                    style={[styles.modeBtn, active && styles.modeBtnActive]}
                    onPress={() => void selectMode(mode)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${USAGE_MODE_LABELS[mode]}${active ? ', current' : ''}`}
                  >
                    <Text style={[styles.modeBtnText, active && styles.modeBtnTextActive]}>
                      {USAGE_MODE_LABELS[mode]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.modeHint}>
              Set after calibration when you pair Argon. You will be asked here if live stats suggest a different activity.
            </Text>
          </View>

          <View style={styles.grid}>
            {MODE_CARD_ORDER[usageMode].map((key) => cards[key])}
          </View>
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
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.avatarBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
  },
  btCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btCircleLive: {
    borderWidth: 2,
    borderColor: theme.primary,
  },
  statusCard: {
    flexDirection: 'row',
    backgroundColor: theme.statusCard,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 12,
    gap: 12,
  },
  statusCol: {
    flex: 1,
    gap: 6,
  },
  statusLine: {
    fontSize: 13,
    color: theme.muted,
    lineHeight: 18,
  },
  statusValue: {
    fontWeight: '700',
  },
  modeSection: {
    marginBottom: 16,
  },
  modeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  modeHint: {
    fontSize: 12,
    color: theme.muted,
    lineHeight: 17,
    marginTop: 8,
  },
  modeSegment: {
    flexDirection: 'row',
    backgroundColor: theme.statusCard,
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: theme.primary,
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.muted,
  },
  modeBtnTextActive: {
    color: '#fff',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
});
