import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { theme } from '../theme';

const roles = [
  {
    id: 'athlete' as const,
    label: 'Athlete',
    description: 'Track your own performance and health metrics in real-time.',
    color: '#1a5c4c',
    bg: '#d6ece6',
  },
  {
    id: 'parent' as const,
    label: 'Parent / Guardian',
    description: "Monitor your child's safety and health data remotely.",
    color: '#5c4c1a',
    bg: '#ece6d6',
  },
  {
    id: 'trainer' as const,
    label: 'Trainer / Coach',
    description: "Oversee your team's stats, manage athletes, and review risks.",
    color: '#4c1a5c',
    bg: '#e6d6ec',
  },
];

export default function RoleSelectionScreen() {
  const [selected, setSelected] = useState<(typeof roles)[number]['id'] | null>(null);

  const onContinue = () => {
    if (!selected) return;
    if (selected === 'athlete') router.push('/profile');
    else if (selected === 'parent') router.push('/parent-profile');
    else router.push('/trainer-profile');
  };

  return (
    <View style={styles.root}>
      <Pressable style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>←</Text>
      </Pressable>

      <Text style={styles.title}>Choose Your Role</Text>
      <Text style={styles.subtitle}>Select how you'll be using GuardSync.</Text>

      <View style={styles.list}>
        {roles.map((role) => {
          const isSel = selected === role.id;
          return (
            <Pressable
              key={role.id}
              onPress={() => setSelected(role.id)}
              style={[styles.card, isSel && styles.cardSelected]}
            >
              <View style={[styles.iconBox, { backgroundColor: role.bg }]}>
                <Text style={[styles.iconLetter, { color: role.color }]}>
                  {role.id[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{role.label}</Text>
                <Text style={styles.cardDesc}>{role.description}</Text>
              </View>
              <Text style={[styles.chev, isSel && styles.chevOn]}>›</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={[styles.continue, !selected && styles.continueDisabled]}
        disabled={!selected}
        onPress={onContinue}
      >
        <Text style={styles.continueText}>Continue</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: 24, paddingTop: 48 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#d4d2c5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  backText: { fontSize: 20, color: '#555' },
  title: { fontSize: 24, fontWeight: '700', color: theme.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: theme.muted, marginBottom: 20 },
  list: { flex: 1, gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: { borderColor: theme.primary },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconLetter: { fontSize: 22, fontWeight: '700' },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 4 },
  cardDesc: { fontSize: 12, color: '#888', lineHeight: 16 },
  chev: { fontSize: 22, color: '#ccc' },
  chevOn: { color: theme.primary },
  continue: {
    backgroundColor: theme.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  continueDisabled: { opacity: 0.45 },
  continueText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
