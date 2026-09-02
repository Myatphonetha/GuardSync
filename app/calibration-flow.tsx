import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { theme } from '../theme';

export default function CalibrationFlowScreen() {
  const [step, setStep] = useState(0);
  const steps = ['Intro', 'Bite force', 'Resting jaw', 'Baseline vitals', 'Done'];

  const next = () => {
    if (step >= steps.length - 1) {
      router.replace('/usage-mode');
      return;
    }
    setStep((s) => s + 1);
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Calibration</Text>
      <Text style={styles.step}>
        Step {step + 1}/{steps.length}: {steps[step]}
      </Text>
      <Text style={styles.hint}>
        Port the full multi-step CalibrationFlow from the web app here. This stub completes the navigation path to the dashboard.
      </Text>
      <Pressable style={styles.btn} onPress={next}>
        <Text style={styles.btnText}>{step >= steps.length - 1 ? 'Finish' : 'Next'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg, padding: 24, paddingTop: 56 },
  title: { fontSize: 24, fontWeight: '700', color: theme.text, marginBottom: 8 },
  step: { fontSize: 16, color: theme.text, marginBottom: 12 },
  hint: { fontSize: 14, color: theme.muted, lineHeight: 20, marginBottom: 24 },
  btn: {
    backgroundColor: theme.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
