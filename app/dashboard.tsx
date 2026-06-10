import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DashboardBottomNav } from '../components/DashboardBottomNav';
import { DashboardMetricCard } from '../components/DashboardMetricCard';
import { useArgonLiveTelemetry } from '../hooks/useArgonLiveTelemetry';
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

  const risk = concussionRisk(headAccel);
  const statusLabel = streamLive ? 'Connected' : connected ? 'Connected' : 'Not paired';
  const statusColor = connected ? theme.primary : theme.muted;

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

          <View style={styles.grid}>
            <DashboardMetricCard label="Sport" value="Football" icon="run" />
            <DashboardMetricCard
              label="Active Minutes"
              value={formatActiveMinutes(activeMinutes)}
              icon="timer-sand"
            />
            <DashboardMetricCard
              label="Head Acceleration"
              value={`${headAccel}g`}
              icon="football-helmet"
            />
            <DashboardMetricCard
              label="Concussion Risk"
              value={risk.label}
              valueColor={risk.color}
              icon="alert"
              iconColor={theme.danger}
            />
            <DashboardMetricCard
              label="Heart Rate"
              value={`${heartRate} BPM`}
              valueColor={zoneHr(heartRate)}
              icon="heart-pulse"
            />
            <DashboardMetricCard label="SpO2" value={`${spO2}%`} valueColor={zoneSpo2(spO2)} icon="molecule-co2" />
            <DashboardMetricCard
              label="Body Temperature"
              value={`${bodyTemp.toFixed(1)} °F`}
              valueColor={zoneTemp(bodyTemp)}
              icon="thermometer"
            />
            <DashboardMetricCard
              label="Bite Force"
              value={`${biteForce} N`}
              valueColor={zoneBite(biteForce)}
              icon="tooth"
            />
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
    marginBottom: 16,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
});
