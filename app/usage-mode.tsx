import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  setLastDetectedMode,
  setUsageMode,
  USAGE_MODE_LABELS,
  USAGE_MODE_SUBTITLES,
  USAGE_MODES,
  type UsageMode,
} from '../lib/usageMode';
import { theme } from '../theme';

const MODE_ICONS: Record<UsageMode, keyof typeof MaterialCommunityIcons.glyphMap> = {
  training: 'dumbbell',
  game: 'football',
  sleep: 'sleep',
};

export default function UsageModeScreen() {
  const [selected, setSelected] = useState<UsageMode | null>(null);
  const [saving, setSaving] = useState(false);

  const onContinue = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await setUsageMode(selected, 'manual');
      await setLastDetectedMode(selected);
      router.replace('/dashboard');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>What are you doing today?</Text>
      <Text style={styles.sub}>
        Argon is connected. After calibration, pick an activity so metrics and alerts match your session.
      </Text>

      <View style={styles.options}>
        {USAGE_MODES.map((mode) => {
          const active = selected === mode;
          return (
            <Pressable
              key={mode}
              style={[styles.option, active && styles.optionActive]}
              onPress={() => setSelected(mode)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
            >
              <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                <MaterialCommunityIcons
                  name={MODE_ICONS[mode]}
                  size={22}
                  color={active ? '#fff' : theme.primary}
                />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>
                  {USAGE_MODE_LABELS[mode]}
                </Text>
                <Text style={[styles.optionSub, active && styles.optionSubActive]}>
                  {USAGE_MODE_SUBTITLES[mode]}
                </Text>
              </View>
              {active ? (
                <MaterialCommunityIcons name="check-circle" size={22} color="#fff" />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={[styles.continueBtn, (!selected || saving) && styles.continueDisabled]}
        disabled={!selected || saving}
        onPress={() => void onContinue()}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.continueText}>Continue to dashboard</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg, padding: 24, paddingTop: 56 },
  title: { fontSize: 24, fontWeight: '700', color: theme.text, marginBottom: 10 },
  sub: { fontSize: 14, color: theme.muted, lineHeight: 20, marginBottom: 24 },
  options: { gap: 12, marginBottom: 24 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.border,
    padding: 16,
  },
  optionActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.statusCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 17, fontWeight: '700', color: theme.text, marginBottom: 4 },
  optionTitleActive: { color: '#fff' },
  optionSub: { fontSize: 13, color: theme.muted, lineHeight: 18 },
  optionSubActive: { color: 'rgba(255,255,255,0.85)' },
  continueBtn: {
    backgroundColor: theme.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  continueDisabled: { opacity: 0.5 },
  continueText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
