import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { DashboardBottomNav } from '../components/DashboardBottomNav';
import { theme } from '../theme';

type RiskLevel = 'low' | 'moderate' | 'high';

const athlete = { name: 'Alex Smith', age: 16, sport: 'Football', position: 'Quarterback' };

function riskColor(level: RiskLevel) {
  switch (level) {
    case 'high':
      return '#e63946';
    case 'moderate':
      return '#f4a261';
    default:
      return '#1a5c4c';
  }
}

function riskLabel(level: RiskLevel) {
  switch (level) {
    case 'high':
      return 'High Risk';
    case 'moderate':
      return 'Moderate Risk';
    default:
      return 'Low Risk';
  }
}

export default function ParentDashboardScreen() {
  const [hasLinkedAthlete] = useState(true);
  const [deviceConnected] = useState(true);
  const [heartRate, setHeartRate] = useState(156);
  const [bodyTemp, setBodyTemp] = useState(98.2);
  const [spO2, setSpO2] = useState(95);
  const [biteForce, setBiteForce] = useState(162);
  const [headAccel, setHeadAccel] = useState(45);
  const [lastImpact, setLastImpact] = useState({ g: 45, when: '2 min ago' });
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('low');

  useEffect(() => {
    if (!deviceConnected || !hasLinkedAthlete) return;
    const interval = setInterval(() => {
      const hr = Math.floor(140 + Math.random() * 50);
      const g = Math.floor(20 + Math.random() * 80);
      const temp = parseFloat((97.5 + Math.random() * 3).toFixed(1));
      const o2 = Math.floor(92 + Math.random() * 8);
      setHeartRate(hr);
      setBodyTemp(temp);
      setSpO2(o2);
      setBiteForce(Math.floor(150 + Math.random() * 30));
      setHeadAccel(Math.floor(20 + Math.random() * 80));
      setLastImpact({ g, when: `${Math.floor(Math.random() * 10)} min ago` });
      if (g > 75 || temp > 100 || o2 < 92 || hr > 180) setRiskLevel('high');
      else if (g > 50 || temp > 99 || o2 < 94 || hr > 170) setRiskLevel('moderate');
      else setRiskLevel('low');
    }, 3000);
    return () => clearInterval(interval);
  }, [deviceConnected, hasLinkedAthlete]);

  const rc = riskColor(riskLevel);

  if (!hasLinkedAthlete) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No Athlete Linked</Text>
          <Text style={styles.emptySub}>
            Link to your child&apos;s GuardSync account to monitor their health data.
          </Text>
          <Pressable style={styles.linkBtn} onPress={() => router.push('/parent-profile')}>
            <Text style={styles.linkBtnText}>Link to Athlete</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View style={styles.avatarWrap}>
              <Text style={styles.avatar}>👤</Text>
            </View>
            <Text style={styles.headerTitle}>Parent Dashboard</Text>
            <Text style={[styles.btIcon, { color: deviceConnected ? theme.primary : '#e63946' }]}>
              {deviceConnected ? '●' : '○'}
            </Text>
          </View>

          {riskLevel !== 'low' && (
            <View style={[styles.banner, { backgroundColor: riskLevel === 'high' ? '#fde8ea' : '#fef3cd' }]}>
              <Text style={{ fontSize: 16, color: rc, fontWeight: '700' }}>
                {riskLevel === 'high' ? 'High Risk Alert' : 'Moderate Risk Warning'}
              </Text>
              <Text style={styles.bannerSub}>Recent impact or vitals need attention</Text>
            </View>
          )}

          {!deviceConnected && (
            <View style={styles.bannerMuted}>
              <Text style={styles.bannerSub}>Device disconnected · Last update 15 min ago</Text>
            </View>
          )}

          <View style={styles.card}>
            <View style={styles.avatarWrap}>
              <Text style={styles.avatar}>👤</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.athleteName}>{athlete.name}</Text>
              <Text style={styles.muted}>
                {athlete.age} years · {athlete.sport}
              </Text>
              <Text style={styles.mutedSm}>{athlete.position}</Text>
            </View>
          </View>

          <View style={[styles.riskCard, { backgroundColor: `${rc}18` }]}>
            <Text style={styles.riskLabel}>Concussion Risk</Text>
            <Text style={[styles.riskValue, { color: rc }]}>{riskLabel(riskLevel)}</Text>
            <Text style={styles.mutedSm}>
              {deviceConnected ? 'Real-time monitoring active' : 'Device disconnected'}
            </Text>
          </View>

          <View style={styles.grid}>
            <Mini label="Heart Rate" value={deviceConnected ? `${heartRate}` : '—'} unit="BPM" />
            <Mini label="Last Impact" value={deviceConnected ? `${lastImpact.g}g` : '—'} unit={lastImpact.when} />
            <Mini label="SpO2" value={deviceConnected ? `${spO2}` : '—'} unit="%" />
            <Mini label="Body Temp" value={deviceConnected ? `${bodyTemp}` : '—'} unit="°F" />
            <Mini label="Bite Force" value={deviceConnected ? `${biteForce}` : '—'} unit="N" />
            <Mini label="Head Accel" value={deviceConnected ? `${headAccel}` : '—'} unit="g" />
          </View>

          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Read-only view. Contact your athlete to update profile information.
            </Text>
          </View>
        </ScrollView>
        <DashboardBottomNav role="parent" />
      </View>
    </SafeAreaView>
  );
}

function Mini({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.mini}>
      <Text style={styles.mLabel}>{label}</Text>
      <Text style={styles.mValue}>{value}</Text>
      <Text style={styles.mUnit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: theme.text },
  btIcon: { fontSize: 18, fontWeight: '700' },
  banner: { borderRadius: 16, padding: 14, marginBottom: 12 },
  bannerMuted: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  bannerSub: { fontSize: 12, color: '#555', marginTop: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#d6ece6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: { fontSize: 26 },
  athleteName: { fontSize: 18, fontWeight: '700', color: theme.text },
  muted: { fontSize: 13, color: theme.muted },
  mutedSm: { fontSize: 11, color: '#999', marginTop: 2 },
  riskCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  riskLabel: { fontSize: 11, color: '#555', marginBottom: 4, textTransform: 'uppercase' },
  riskValue: { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  mini: {
    width: '48%',
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 12,
    minHeight: 88,
  },
  mLabel: { fontSize: 11, color: theme.muted, marginBottom: 4 },
  mValue: { fontSize: 20, fontWeight: '700', color: theme.text },
  mUnit: { fontSize: 11, color: '#999', marginTop: 2 },
  notice: {
    marginTop: 12,
    padding: 12,
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  noticeText: { fontSize: 12, color: theme.muted, textAlign: 'center' },
  emptyWrap: { flex: 1, padding: 24, justifyContent: 'center' },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: theme.text, marginBottom: 8, textAlign: 'center' },
  emptySub: { fontSize: 14, color: theme.muted, textAlign: 'center', marginBottom: 20 },
  linkBtn: {
    alignSelf: 'center',
    backgroundColor: theme.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  linkBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
