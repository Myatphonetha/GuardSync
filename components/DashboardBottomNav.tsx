import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { theme } from '../theme';

export function DashboardBottomNav({ role = 'athlete' }: { role?: 'athlete' | 'parent' | 'trainer' }) {
  const path = usePathname() ?? '';
  const onDashboard =
    path.includes('parent-dashboard') ||
    path.includes('trainer-dashboard') ||
    path === '/dashboard';
  const onHistory = path.includes('history');

  return (
    <View style={styles.bar}>
      <Pressable
        style={[styles.tab, onDashboard && styles.tabActive]}
        onPress={() => {
          if (role === 'parent') router.replace('/parent-dashboard');
          else if (role === 'trainer') router.replace('/trainer-dashboard');
          else router.replace('/dashboard');
        }}
      >
        <MaterialCommunityIcons
          name="view-grid"
          size={20}
          color={onDashboard ? '#fff' : theme.navInactiveText}
        />
        <Text style={[styles.tabText, onDashboard && styles.tabTextActive]}>Dashboard</Text>
      </Pressable>
      <Pressable style={[styles.tab, onHistory && styles.tabActive]} onPress={() => router.push('/history')}>
        <MaterialCommunityIcons
          name="chart-line"
          size={20}
          color={onHistory ? '#fff' : theme.navInactiveText}
        />
        <Text style={[styles.tabText, onHistory && styles.tabTextActive]}>History</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28,
    backgroundColor: theme.bg,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: theme.navInactive,
  },
  tabActive: { backgroundColor: theme.primary },
  tabText: { fontSize: 15, fontWeight: '600', color: theme.navInactiveText },
  tabTextActive: { color: '#fff' },
});
