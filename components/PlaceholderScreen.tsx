import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { theme } from '../theme';

type NavAction =
  | { label: string; href: Href }
  | { label: string; back: true };

type Props = {
  title: string;
  subtitle?: string;
  actions?: NavAction[];
  children?: React.ReactNode;
};

export function PlaceholderScreen({ title, subtitle, actions, children }: Props) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
      <View style={styles.actions}>
        {actions?.map((a, i) => (
          <Pressable
            key={i}
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
            onPress={() => {
              if ('back' in a && a.back) router.back();
              else if ('href' in a) router.push(a.href);
            }}
          >
            <Text style={styles.btnText}>{a.label}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 24, paddingBottom: 48 },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.muted,
    marginBottom: 20,
    lineHeight: 20,
  },
  actions: { gap: 12, marginTop: 8 },
  btn: {
    backgroundColor: theme.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnPressed: { opacity: 0.9, backgroundColor: theme.primaryDark },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
