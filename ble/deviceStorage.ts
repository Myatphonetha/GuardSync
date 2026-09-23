/**
 * Remembers which Argon this phone paired with.
 * Onboarding writes these keys; the Dashboard live stream reads them.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEY_BT_CONNECTED = 'guardsync_bt_connected';
export const STORAGE_KEY_BT_DEVICE_NAME = 'guardsync_bt_device_name';
export const STORAGE_KEY_BT_DEVICE_ID = 'guardsync_bt_device_id';

export async function savePairedDevice(deviceId: string, deviceName: string): Promise<void> {
  await AsyncStorage.multiSet([
    [STORAGE_KEY_BT_CONNECTED, 'true'],
    [STORAGE_KEY_BT_DEVICE_NAME, deviceName],
    [STORAGE_KEY_BT_DEVICE_ID, deviceId],
  ]);
}

export async function loadPairedDevice(): Promise<{
  connected: boolean;
  deviceId: string | null;
  deviceName: string | null;
}> {
  const [connected, deviceId, deviceName] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEY_BT_CONNECTED),
    AsyncStorage.getItem(STORAGE_KEY_BT_DEVICE_ID),
    AsyncStorage.getItem(STORAGE_KEY_BT_DEVICE_NAME),
  ]);
  return {
    connected: connected === 'true',
    deviceId,
    deviceName,
  };
}
