import { StyleSheet, Text, View } from 'react-native';
import type { ChartPoint } from '../lib/historyChartData';
import { theme } from '../theme';

const CHART_HEIGHT = 168;

type Props = {
  data: ChartPoint[];
  yMin: number;
  yMax: number;
  threshold?: number;
  /** Fallback when usageMode is missing on a point */
  barColor: string;
  yTicks?: number[];
};

function buildTicks(yMin: number, yMax: number, count = 4): number[] {
  const step = (yMax - yMin) / (count - 1);
  return Array.from({ length: count }, (_, i) => Math.round((yMin + step * i) * 10) / 10);
}

export function HistoryBarChart({ data, yMin, yMax, threshold, barColor, yTicks }: Props) {
  const ticks = yTicks ?? buildTicks(yMin, yMax);
  const range = yMax - yMin || 1;

  const barHeight = (value: number) => {
    const pct = (value - yMin) / range;
    return Math.max(4, pct * CHART_HEIGHT);
  };

  const thresholdBottom =
    threshold !== undefined ? ((threshold - yMin) / range) * CHART_HEIGHT : undefined;

  const xStep = Math.max(1, Math.floor(data.length / 7));

  return (
    <View style={styles.wrap}>
      <View style={styles.chartRow}>
        <View style={styles.yAxis}>
          {[...ticks].reverse().map((tick) => (
            <Text key={tick} style={styles.yTick}>
              {Number.isInteger(tick) ? tick : tick.toFixed(1)}
            </Text>
          ))}
        </View>

        <View style={styles.plot}>
          {ticks.map((tick) => {
            const bottom = ((tick - yMin) / range) * CHART_HEIGHT;
            return (
              <View
                key={`grid-${tick}`}
                style={[styles.gridLine, { bottom }]}
              />
            );
          })}

          {thresholdBottom !== undefined && (
            <View style={[styles.thresholdLine, { bottom: thresholdBottom }]} />
          )}

          <View style={styles.bars}>
            {data.map((point, index) => (
              <View key={`${point.time}-${index}`} style={styles.barCol}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight(point.value),
                      backgroundColor: point.critical ? theme.danger : barColor,
                    },
                  ]}
                />
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.xAxis}>
        <View style={styles.xSpacer} />
        <View style={styles.xLabels}>
          {data.map((point, index) =>
            index % xStep === 0 || index === data.length - 1 ? (
              <Text key={`${point.time}-x-${index}`} style={styles.xTick}>
                {point.time}
              </Text>
            ) : (
              <View key={`${point.time}-x-${index}`} style={styles.xTickSpacer} />
            ),
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4 },
  chartRow: {
    flexDirection: 'row',
    height: CHART_HEIGHT,
  },
  yAxis: {
    width: 32,
    height: CHART_HEIGHT,
    justifyContent: 'space-between',
    paddingRight: 6,
  },
  yTick: {
    fontSize: 10,
    color: theme.muted,
    textAlign: 'right',
  },
  plot: {
    flex: 1,
    height: CHART_HEIGHT,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: '#EFEDE6',
    borderStyle: 'dashed',
  },
  thresholdLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(217, 83, 79, 0.55)',
    zIndex: 2,
  },
  bars: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    zIndex: 1,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: CHART_HEIGHT,
  },
  bar: {
    width: '72%',
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    minHeight: 4,
  },
  xAxis: {
    flexDirection: 'row',
    marginTop: 8,
  },
  xSpacer: { width: 32 },
  xLabels: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xTick: {
    fontSize: 10,
    color: theme.muted,
    minWidth: 20,
    textAlign: 'center',
  },
  xTickSpacer: { flex: 1 },
});
