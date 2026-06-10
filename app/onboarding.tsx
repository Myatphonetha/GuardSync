import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Device, State } from 'react-native-ble-plx';
import { router } from 'expo-router';
import { bleManager } from '../lib/bleManager';
import { ensureBlePermissions } from '../lib/blePermissions';
import {
  ARGON_DEVICE_NAME,
  isArgonAdvertisedDevice,
  NORDIC_UART_SERVICE_UUID,
} from '../lib/argonNordicUart';
import { disconnectQuietly, waitForFirstUartLine } from '../lib/argonUartConnect';
import { persistArgonTelemetryRecord, toBackendPayload } from '../lib/argonTelemetry';
import { postArgonTelemetry } from '../services/telemetryBackend';
import { theme } from '../theme';

const K_CONNECTED = 'guardsync_bt_connected';
const K_DEVICE = 'guardsync_bt_device_name';
const K_DEVICE_ID = 'guardsync_bt_device_id';

const SCAN_MS = 20000;

export default function OnboardingScreen() {
  const [btState, setBtState] = useState<State>(State.Unknown);
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const devicesMap = useRef<Map<string, Device>>(new Map());
  const scanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pairing, setPairing] = useState(false);

  useEffect(() => {
    const sub = bleManager.onStateChange((s) => setBtState(s), true);
    return () => sub.remove();
  }, []);

  const stopScan = useCallback(() => {
    if (scanTimer.current) {
      clearTimeout(scanTimer.current);
      scanTimer.current = null;
    }
    bleManager.stopDeviceScan();
    setScanning(false);
  }, []);

  useEffect(() => {
    return () => {
      bleManager.stopDeviceScan();
    };
  }, []);

  const startScan = async () => {
    if (scanTimer.current) {
      clearTimeout(scanTimer.current);
      scanTimer.current = null;
    }
    devicesMap.current.clear();
    setDevices([]);

    const ok = await ensureBlePermissions();
    if (!ok) {
      Alert.alert(
        'Permissions required',
        Platform.OS === 'android' && Platform.Version >= 31
          ? 'Allow Bluetooth scan, connect, and nearby devices (location is used for BLE discovery on some Android versions).'
          : 'Allow location access so the system can discover Bluetooth Low Energy devices.',
      );
      return;
    }

    if (btState !== State.PoweredOn) {
      Alert.alert(
        'Bluetooth is off',
        'Turn on Bluetooth in system settings, then try again.',
      );
      return;
    }

    setScanning(true);

    // Only devices advertising Nordic UART service (matches Particle `appendServiceUUID`)
    bleManager.startDeviceScan(
      [NORDIC_UART_SERVICE_UUID],
      { allowDuplicates: false },
      (error, device) => {
        if (error) {
          stopScan();
          Alert.alert('Scan error', String(error.message ?? error));
          return;
        }
        if (!device?.id) return;

        // Nordic UART service filter is applied above; also accept Argon name when present.
        if (!isArgonAdvertisedDevice(device)) return;

        const prev = devicesMap.current.get(device.id);
        if (!prev || (device.rssi ?? -999) > (prev.rssi ?? -999)) {
          devicesMap.current.set(device.id, device);
          setDevices(Array.from(devicesMap.current.values()));
        }
      },
    );

    scanTimer.current = setTimeout(() => {
      scanTimer.current = null;
      bleManager.stopDeviceScan();
      setScanning(false);
    }, SCAN_MS);
  };

  const selectDevice = async (device: Device) => {
    setPairing(true);
    stopScan();
    try {
      const name =
        device.name ?? device.localName ?? ARGON_DEVICE_NAME;

      const { parsed, raw, connected } = await waitForFirstUartLine(device, 18000);

      const record = await persistArgonTelemetryRecord({
        parsed,
        raw,
        deviceId: device.id,
        deviceName: name,
      });

      await AsyncStorage.multiSet([
        [K_CONNECTED, 'true'],
        [K_DEVICE, name],
        [K_DEVICE_ID, device.id],
      ]);

      void postArgonTelemetry(toBackendPayload(record)).catch(() => {});

      await disconnectQuietly(connected);

      router.push('/calibration-flow');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Could not read UART', msg);
    } finally {
      setPairing(false);
    }
  };

  /** Demo path without hardware */
  const simulatePair = async () => {
    setPairing(true);
    try {
      const record = await persistArgonTelemetryRecord({
        parsed: {
          millis: 0,
          activeMinutes: 0,
          headAcceleration: 95,
          heartRate: 72,
          spO2: 98,
          bodyTempF: 98.4,
          biteForce: 160,
        },
        raw: '0,0,95,72,98,98.4,160',
        deviceId: 'demo',
        deviceName: 'Argon (demo)',
      });
      await AsyncStorage.multiSet([
        [K_CONNECTED, 'true'],
        [K_DEVICE, 'Argon (demo)'],
        [K_DEVICE_ID, 'demo'],
      ]);
      void postArgonTelemetry(toBackendPayload(record)).catch(() => {});
      router.push('/calibration-flow');
    } finally {
      setPairing(false);
    }
  };

  const poweredOn = btState === State.PoweredOn;

  return (
    <View style={styles.root}>
      <Pressable style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>←</Text>
      </Pressable>

      <Text style={styles.title}>Connect Argon (Nordic UART)</Text>
      <Text style={styles.sub}>
        Scans for the Nordic UART service UUID from Particle firmware. The device may show as
        &quot;Argon&quot; or unnamed until scan response. After you tap a device, the app connects and reads
        one telemetry line from the TX notify characteristic ({NORDIC_UART_SERVICE_UUID.slice(0, 8)}…).
      </Text>

      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Bluetooth:</Text>
        <Text style={[styles.statusValue, !poweredOn && styles.statusBad]}>
          {btState === State.PoweredOn
            ? 'On'
            : btState === State.PoweredOff
              ? 'Off — enable in Settings'
              : String(btState)}
        </Text>
      </View>

      <Pressable
        style={[styles.primary, (scanning || !poweredOn) && styles.disabled]}
        disabled={scanning || !poweredOn}
        onPress={startScan}
      >
        {scanning ? (
          <View style={styles.row}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.primaryText}> Scanning… ({Math.round(SCAN_MS / 1000)}s)</Text>
          </View>
        ) : (
          <Text style={styles.primaryText}>Scan for Argon</Text>
        )}
      </Pressable>

      {scanning ? (
        <Pressable style={styles.stopBtn} onPress={stopScan}>
          <Text style={styles.stopText}>Stop scan</Text>
        </Pressable>
      ) : null}

      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        style={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {scanning
              ? 'Looking for Argon (Nordic UART)…'
              : 'No Argon found. Power the Argon (not in setup/listening mode), confirm Nordic UART advertising in firmware, and try again.'}
          </Text>
        }
        renderItem={({ item }) => {
          const label = item.name ?? item.localName ?? 'Argon';
          return (
            <Pressable
              style={({ pressed }) => [styles.deviceRow, pressed && styles.deviceRowPressed]}
              disabled={pairing}
              onPress={() => selectDevice(item)}
            >
              <Text style={styles.deviceName}>{label}</Text>
              <Text style={styles.deviceMeta}>
                Nordic UART · RSSI {item.rssi ?? '—'}
              </Text>
            </Pressable>
          );
        }}
      />

      <Pressable style={[styles.secondary, pairing && styles.disabled]} disabled={pairing} onPress={simulatePair}>
        <Text style={styles.secondaryText}>Skip (demo — no Argon)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg, padding: 24, paddingTop: 48 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#d4d2c5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  backText: { fontSize: 20, color: '#555' },
  title: { fontSize: 24, fontWeight: '700', color: theme.text, marginBottom: 12 },
  sub: { fontSize: 14, color: theme.muted, lineHeight: 20, marginBottom: 16 },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statusLabel: { fontSize: 14, color: theme.muted },
  statusValue: { fontSize: 14, fontWeight: '600', color: theme.primary },
  statusBad: { color: theme.danger },
  primary: {
    backgroundColor: theme.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  disabled: { opacity: 0.55 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  primaryText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  stopBtn: { alignSelf: 'center', paddingVertical: 8, marginBottom: 8 },
  stopText: { color: theme.primary, fontWeight: '600' },
  list: { flex: 1, marginTop: 8 },
  empty: { fontSize: 13, color: theme.muted, paddingVertical: 12 },
  deviceRow: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  deviceRowPressed: { opacity: 0.9 },
  deviceName: { fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 4 },
  deviceMeta: { fontSize: 11, color: theme.muted },
  secondary: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  secondaryText: { color: theme.muted, fontSize: 14 },
});
