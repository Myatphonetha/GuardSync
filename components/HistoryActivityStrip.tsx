import { StyleSheet, Text, View } from 'react-native';
import type { ActivitySegment } from '../lib/historyFromRecords';
import { MODE_STRIP_COLORS } from '../lib/historyChartData';
import { USAGE_MODE_LABELS, USAGE_MODES, type UsageMode } from '../lib/usageMode';
import { theme } from '../theme';

type Props = {
  segments: ActivitySegment[];
  counts: Partial<Record<UsageMode, number>>;
  endTimeLabel: string;
};

/** Thin activity rail — modes separate from measurement bar colors. */
export function HistoryActivityStrip({ segments, counts, endTimeLabel }: Props) {
  if (segments.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Activity</Text>
      <View style={styles.stripRow}>
        <Text style={styles.timeEdge}>0s</Text>
        <View style={styles.strip}>
          {segments.map((seg, i) => (
            <View
              key={`${seg.mode}-${i}`}
              style={[styles.segment, { flex: seg.flex, backgroundColor: MODE_STRIP_COLORS[seg.mode] }]}
            />
          ))}
        </View>
        <Text style={styles.timeEdge}>{endTimeLabel}</Text>
      </View>
      <View style={styles.legend}>
        {USAGE_MODES.filter((m) => (counts[m] ?? 0) > 0).map((mode) => (
          <View key={mode} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: MODE_STRIP_COLORS[mode] }]} />
            <Text style={styles.legendText}>{USAGE_MODE_LABELS[mode]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  stripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeEdge: {
    fontSize: 10,
    color: theme.muted,
    width: 28,
    textAlign: 'center',
  },
  strip: {
    flex: 1,
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: theme.statusCard,
  },
  segment: {
    minWidth: 4,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.text,
  },
});
