import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ModeChangeSuggestion } from '../lib/modeChangeSuggestion';
import { USAGE_MODE_LABELS } from '../lib/usageMode';
import { theme } from '../theme';

type Props = {
  suggestion: ModeChangeSuggestion;
  confirming: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
};

export function HistoryModePrompt({ suggestion, confirming, onConfirm, onDismiss }: Props) {
  return (
    <View style={styles.banner}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="chart-timeline-variant" size={20} color={theme.primary} />
        <Text style={styles.title}>
          Recent stats look like {USAGE_MODE_LABELS[suggestion.suggestedMode]}
        </Text>
        <Pressable onPress={onDismiss} hitSlop={8} accessibilityLabel="Dismiss">
          <MaterialCommunityIcons name="close" size={20} color={theme.muted} />
        </Pressable>
      </View>
      <Text style={styles.reason}>{suggestion.reason}</Text>
      <Text style={styles.hint}>
        You are set to {USAGE_MODE_LABELS[suggestion.currentMode]}. Switch and update recent samples?
      </Text>
      <View style={styles.actions}>
        <Pressable
          style={[styles.btn, styles.btnPrimary]}
          onPress={onConfirm}
          disabled={confirming}
        >
          {confirming ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.btnPrimaryText}>
              Switch to {USAGE_MODE_LABELS[suggestion.suggestedMode]}
            </Text>
          )}
        </Pressable>
        <Pressable style={styles.btn} onPress={onDismiss} disabled={confirming}>
          <Text style={styles.btnText}>Keep {USAGE_MODE_LABELS[suggestion.currentMode]}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.primary,
    padding: 14,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
  },
  reason: {
    fontSize: 13,
    color: theme.muted,
    lineHeight: 18,
    marginBottom: 6,
  },
  hint: {
    fontSize: 12,
    color: theme.text,
    lineHeight: 17,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: theme.statusCard,
  },
  btnPrimary: {
    backgroundColor: theme.primary,
  },
  btnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.text,
    textAlign: 'center',
  },
  btnPrimaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
});
