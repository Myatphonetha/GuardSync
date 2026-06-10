import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';

type Props = {
  label: string;
  value: string;
  valueColor?: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor?: string;
  onInfoPress?: () => void;
};

export function DashboardMetricCard({
  label,
  value,
  valueColor = theme.text,
  icon,
  iconColor = theme.primary,
  onInfoPress,
}: Props) {
  return (
    <View style={styles.card}>
      <Pressable
        style={styles.infoBtn}
        hitSlop={8}
        onPress={onInfoPress}
        accessibilityLabel={`${label} info`}
      >
        <MaterialCommunityIcons name="information-outline" size={16} color={theme.infoIcon} />
      </Pressable>

      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name={icon} size={36} color={iconColor} />
      </View>

      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    flexGrow: 1,
    minWidth: '45%',
    backgroundColor: theme.surface,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 14,
    minHeight: 148,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 2,
  },
  iconWrap: {
    marginBottom: 8,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    color: theme.muted,
    textAlign: 'center',
    marginBottom: 6,
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});
