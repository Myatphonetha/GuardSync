/**
 * Scan for the Smart Mouthguard, read one full sensor set, then go to calibration.
 *
 * Scan does not filter by service UUID. The chip advertises its name only.
 * After a tap, stream.ts connects and waits for the heart packet.
 * Temperature, motion, and bite are kept when those sensors report.
 */
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
import { Device, State } from 'react-native-ble-plx';
import { router } from 'expo-router';
import { safeGoBack } from '../lib/safeBack';
import { bleManager } from '../ble/bleManager';
import { ensureBlePermissions } from '../ble/blePermissions';
import { savePairedDevice } from '../ble/deviceStorage';
import { isMouthguardDevice, MOUTHGUARD_NAME } from '../ble/protocol';
import { disconnectQuietly, waitForFirstReading } from '../ble/stream';
import { persistArgonTelemetryRecord } from '../telemetry/localStore';
import { toBackendPayload } from '../telemetry/types';
import { postArgonTelemetry } from '../telemetry/upload';
import { theme } from '../theme';

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

    // null = every nearby device. The chip does not advertise its service UUIDs.
    // allowDuplicates stays on so a later packet that finally includes the
    // name "Smart Mouthguard" is not thrown away.
    bleManager.startDeviceScan(
      null,
      { allowDuplicates: true },
      (error, device) => {
        if (error) {
          stopScan();
          Alert.alert('Scan error', String(error.message ?? error));
          return;
        }
        if (!device?.id) return;
        if (!isMouthguardDevice(device)) return;

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
      const name = device.name ?? device.localName ?? MOUTHGUARD_NAME;

      const { reading, connected } = await waitForFirstReading(device, 18000);

      const metricsReady =
        reading.heartRate != null &&
        reading.headAcceleration != null &&
        reading.biteForce != null;

      if (metricsReady) {
        const record = await persistArgonTelemetryRecord({
          parsed: {
            millis: reading.millis,
            activeMinutes: reading.activeMinutes,
            headAcceleration: reading.headAcceleration ?? 0,
            heartRate: reading.heartRate ?? 0,
            spO2: reading.spO2 ?? 0,
            bodyTempF: reading.bodyTempF ?? 0,
            biteForce: reading.biteForce ?? 0,
          },
          raw: reading.raw,
          deviceId: device.id,
          deviceName: name,
        });
        void postArgonTelemetry(toBackendPayload(record)).catch(() => {});
      }

      await savePairedDevice(device.id, name);

      await disconnectQuietly(connected);

      router.push('/calibration-flow');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Could not read the mouthguard', msg);
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
          headAcceleration: 1,
          heartRate: 70,
          spO2: 0,
          bodyTempF: 98.6,
          biteForce: 0.2,
        },
        raw: '0,0,1,70,0,98.6,0.2',
        deviceId: 'demo',
        deviceName: 'Smart Mouthguard (demo)',
      });
      await savePairedDevice('demo', 'Smart Mouthguard (demo)');
      void postArgonTelemetry(toBackendPayload(record)).catch(() => {});
      router.push('/calibration-flow');
    } finally {
      setPairing(false);
    }
  };

  const poweredOn = btState === State.PoweredOn;

  return (
    <View style={styles.root}>
      <Pressable style={styles.back} onPress={() => safeGoBack('/profile')}>
        <Text style={styles.backText}>←</Text>
      </Pressable>

      <Text style={styles.title}>Connect Smart Mouthguard</Text>
      <Text style={styles.sub}>
        Looks for a device named Smart Mouthguard. After you tap it, the app connects and waits
        for heart rate, temperature, motion, and bite force. The chip sends those about once a second
        while the phone is connected.
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
          <Text style={styles.primaryText}>Scan for mouthguard</Text>
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
              ? 'Looking for Smart Mouthguard…'
              : 'No mouthguard yet. Power the board, wait until it prints Advertising, then scan again.'}
          </Text>
        }
        renderItem={({ item }) => {
          const label = item.name ?? item.localName ?? MOUTHGUARD_NAME;
          return (
            <Pressable
              style={({ pressed }) => [styles.deviceRow, pressed && styles.deviceRowPressed]}
              disabled={pairing}
              onPress={() => selectDevice(item)}
            >
              <Text style={styles.deviceName}>{label}</Text>
              <Text style={styles.deviceMeta}>
                Smart Mouthguard · RSSI {item.rssi ?? '—'}
              </Text>
            </Pressable>
          );
        }}
      />

      <Pressable style={[styles.secondary, pairing && styles.disabled]} disabled={pairing} onPress={simulatePair}>
        <Text style={styles.secondaryText}>Skip (demo — no mouthguard)</Text>
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
