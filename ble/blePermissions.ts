/**
 * Ask Android before a scan or a connect. Returns false if the athlete says no.
 * iOS asks from Info.plist when bleManager.ts starts.
 *
 * Called by: app/onboarding.tsx, useLiveTelemetry.ts
 * Calls next: the system permission dialog
 */
import { PermissionsAndroid, Platform } from 'react-native';

export async function ensureBlePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  const api = Number(Platform.Version);

  if (api >= 31) {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);
    return Object.values(result).every((v) => v === PermissionsAndroid.RESULTS.GRANTED);
  }

  const fine = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  return fine === PermissionsAndroid.RESULTS.GRANTED;
}
