import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { DashboardBottomNav } from '../components/DashboardBottomNav';
import { theme } from '../theme';

type RiskLevel = 'low' | 'moderate' | 'high';
type FilterType = 'all' | 'high' | 'moderate' | 'low' | 'disconnected';
type RiskCause = 'impact' | 'vital-signs' | 'disconnected' | 'none';

interface Athlete {
  id: string;
  name: string;
  sport: string;
  riskLevel: RiskLevel;
  riskCause: RiskCause;
  lastImpact: number;
  heartRate: number;
  connected: boolean;
  age: number;
  position: string;
}

const ATHLETES: Athlete[] = [
  {
    id: '1',
    name: 'Alex Martinez',
    sport: 'Football',
    position: 'Quarterback',
    age: 17,
    riskLevel: 'high',
    riskCause: 'impact',
    lastImpact: 89,
    heartRate: 185,
    connected: true,
  },
  {
    id: '2',
    name: 'Jordan Lee',
    sport: 'Football',
    position: 'Linebacker',
    age: 16,
    riskLevel: 'moderate',
    riskCause: 'vital-signs',
    lastImpact: 62,
    heartRate: 168,
    connected: true,
  },
  {
    id: '3',
    name: 'Taylor Brown',
    sport: 'Football',
    position: 'Wide Receiver',
    age: 18,
    riskLevel: 'low',
    riskCause: 'none',
    lastImpact: 34,
    heartRate: 152,
    connected: true,
  },
  {
    id: '4',
    name: 'Morgan Davis',
    sport: 'Football',
    position: 'Safety',
    age: 17,
    riskLevel: 'low',
    riskCause: 'none',
    lastImpact: 28,
    heartRate: 145,
    connected: false,
  },
  {
    id: '5',
    name: 'Casey Wilson',
    sport: 'Football',
    position: 'Running Back',
    age: 16,
    riskLevel: 'moderate',
    riskCause: 'vital-signs',
    lastImpact: 58,
    heartRate: 172,
    connected: true,
  },
];

function getRiskColor(level: RiskLevel) {
  switch (level) {
    case 'high':
      return '#e63946';
    case 'moderate':
      return '#f4a261';
    default:
      return '#1a5c4c';
  }
}

function getRiskLabel(level: RiskLevel) {
  switch (level) {
    case 'high':
      return 'High Risk';
    case 'moderate':
      return 'Moderate Risk';
    default:
      return 'Low Risk';
  }
}

function getRiskCauseLabel(cause: RiskCause) {
  switch (cause) {
    case 'impact':
      return 'Impact event';
    case 'vital-signs':
      return 'Abnormal vitals';
    case 'disconnected':
      return 'Disconnected';
    default:
      return '';
  }
}

function riskPriority(a: Athlete) {
  if (!a.connected) return 4;
  if (a.riskLevel === 'high') return 1;
  if (a.riskLevel === 'moderate') return 2;
  return 3;
}

export default function TrainerDashboardScreen() {
  const [hasLinkedAthletes] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selected, setSelected] = useState<Athlete | null>(null);

  const highRiskCount = ATHLETES.filter((a) => a.riskLevel === 'high').length;
  const moderateRiskCount = ATHLETES.filter((a) => a.riskLevel === 'moderate').length;
  const lowRiskCount = ATHLETES.filter((a) => a.riskLevel === 'low').length;
  const disconnectedCount = ATHLETES.filter((a) => !a.connected).length;

  const filtered = useMemo(() => {
    const sorted = [...ATHLETES].sort((a, b) => riskPriority(a) - riskPriority(b));
    return sorted.filter((a) => {
      if (filter === 'all') return true;
      if (filter === 'high') return a.riskLevel === 'high';
      if (filter === 'moderate') return a.riskLevel === 'moderate';
      if (filter === 'low') return a.riskLevel === 'low';
      if (filter === 'disconnected') return !a.connected;
      return true;
    });
  }, [filter]);

  if (!hasLinkedAthletes) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No Athletes Yet</Text>
          <Text style={styles.emptySub}>Add athletes to your roster to monitor health and performance.</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.push('/trainer-profile')}>
            <Text style={styles.primaryBtnText}>Add Athletes</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.flex}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterRow}>
            {(
              [
                ['all', `All (${ATHLETES.length})`],
                ['high', `High (${highRiskCount})`],
                ['moderate', `Mod (${moderateRiskCount})`],
                ['low', `Low (${lowRiskCount})`],
                ['disconnected', `Off (${disconnectedCount})`],
              ] as const
            ).map(([key, label]) => (
              <Pressable
                key={key}
                style={[styles.chip, filter === key && styles.chipOn]}
                onPress={() => setFilter(key)}
              >
                <Text style={[styles.chipText, filter === key && styles.chipTextOn]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <View style={styles.header}>
          <Text style={styles.teamEmoji}>🏈</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.teamTitle}>Varsity Football</Text>
            <Text style={styles.muted}>{ATHLETES.length} Athletes</Text>
          </View>
          <Pressable style={styles.addBtn} onPress={() => router.push('/trainer-profile')}>
            <Text style={styles.addBtnText}>+</Text>
          </Pressable>
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Team status</Text>
          <View style={styles.summaryRow}>
            {highRiskCount > 0 && (
              <View style={[styles.pill, { backgroundColor: '#fde8ea' }]}>
                <Text style={{ color: '#e63946', fontWeight: '600' }}>{highRiskCount} High</Text>
              </View>
            )}
            {moderateRiskCount > 0 && (
              <View style={[styles.pill, { backgroundColor: '#fef3cd' }]}>
                <Text style={{ color: '#f4a261', fontWeight: '600' }}>{moderateRiskCount} Mod</Text>
              </View>
            )}
            {lowRiskCount > 0 && (
              <View style={[styles.pill, { backgroundColor: '#d6ece6' }]}>
                <Text style={{ color: '#1a5c4c', fontWeight: '600' }}>{lowRiskCount} Low</Text>
              </View>
            )}
            {disconnectedCount > 0 && (
              <View style={[styles.pill, { backgroundColor: '#f5f5f0' }]}>
                <Text style={{ color: '#999', fontWeight: '600' }}>{disconnectedCount} Off</Text>
              </View>
            )}
          </View>
        </View>

        <FlatList
          style={styles.list}
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const c = getRiskColor(item.riskLevel);
            return (
              <Pressable style={styles.row} onPress={() => setSelected(item)}>
                <View style={[styles.riskDot, { backgroundColor: `${c}22` }]}>
                  <Text style={{ color: c, fontWeight: '800' }}>!</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{item.name}</Text>
                  <Text style={styles.muted}>{item.position}</Text>
                  {item.riskCause !== 'none' ? (
                    <Text style={styles.cause}>{getRiskCauseLabel(item.riskCause)}</Text>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: c, fontWeight: '700' }}>{getRiskLabel(item.riskLevel)}</Text>
                  <Text style={styles.muted}>{item.lastImpact}g</Text>
                </View>
                <Text style={{ marginLeft: 6 }}>{item.connected ? '📶' : '✕'}</Text>
              </Pressable>
            );
          }}
        />

        <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelected(null)}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              {selected && (
                <>
                  <View style={styles.sheetHeader}>
                    <View>
                      <Text style={styles.sheetName}>{selected.name}</Text>
                      <Text style={styles.muted}>
                        {selected.age} yrs · {selected.position}
                      </Text>
                    </View>
                    <Pressable onPress={() => setSelected(null)}>
                      <Text style={styles.close}>✕</Text>
                    </Pressable>
                  </View>
                  <View style={[styles.sheetRisk, { backgroundColor: `${getRiskColor(selected.riskLevel)}18` }]}>
                    <Text style={styles.muted}>Current risk</Text>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: getRiskColor(selected.riskLevel) }}>
                      {getRiskLabel(selected.riskLevel)}
                    </Text>
                  </View>
                  <View style={styles.sheetGrid}>
                    <View style={styles.sheetCell}>
                      <Text style={styles.muted}>Heart rate</Text>
                      <Text style={styles.sheetVal}>
                        {selected.connected ? selected.heartRate : '—'}
                      </Text>
                      <Text style={styles.muted}>BPM</Text>
                    </View>
                    <View style={styles.sheetCell}>
                      <Text style={styles.muted}>Last impact</Text>
                      <Text style={[styles.sheetVal, { color: getRiskColor(selected.riskLevel) }]}>
                        {selected.connected ? selected.lastImpact : '—'}
                      </Text>
                      <Text style={styles.muted}>g</Text>
                    </View>
                  </View>
                  <Text style={styles.conn}>
                    Device: {selected.connected ? 'Connected' : 'Disconnected'}
                  </Text>
                  <Pressable
                    style={styles.primaryBtn}
                    onPress={() => {
                      setSelected(null);
                      router.push('/history');
                    }}
                  >
                    <Text style={styles.primaryBtnText}>View full history</Text>
                  </Pressable>
                </>
              )}
            </Pressable>
          </Pressable>
        </Modal>

        <DashboardBottomNav role="trainer" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  flex: { flex: 1 },
  filterScroll: { maxHeight: 52 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.surface,
  },
  chipOn: { backgroundColor: theme.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  chipTextOn: { color: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 10,
  },
  teamEmoji: { fontSize: 28 },
  teamTitle: { fontSize: 18, fontWeight: '700', color: theme.text },
  muted: { fontSize: 12, color: theme.muted },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#d4d2c5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { fontSize: 22, fontWeight: '700', color: '#555' },
  summary: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 12,
  },
  summaryTitle: { fontSize: 12, color: theme.muted, marginBottom: 8 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 8, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  riskDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowName: { fontSize: 16, fontWeight: '700', color: theme.text },
  cause: { fontSize: 11, color: '#999', marginTop: 2 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    maxHeight: '85%',
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  sheetName: { fontSize: 20, fontWeight: '700', color: theme.text },
  close: { fontSize: 22, color: '#555', padding: 8 },
  sheetRisk: { borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 12 },
  sheetGrid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  sheetCell: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 14,
  },
  sheetVal: { fontSize: 24, fontWeight: '800', color: theme.text, marginVertical: 4 },
  conn: { textAlign: 'center', marginBottom: 12, color: theme.muted },
  primaryBtn: {
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  emptyWrap: { flex: 1, padding: 24, justifyContent: 'center' },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: theme.text, marginBottom: 8, textAlign: 'center' },
  emptySub: { fontSize: 14, color: theme.muted, textAlign: 'center', marginBottom: 20 },
});
