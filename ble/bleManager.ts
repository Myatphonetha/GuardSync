/**
 * The one Bluetooth object for the whole app.
 * A second BleManager breaks scanning on Android, so every file imports this.
 *
 * Called by: app/onboarding.tsx (scan), stream.ts (connect)
 * Calls next: react-native-ble-plx
 */
import { BleManager } from 'react-native-ble-plx';

export const bleManager = new BleManager();
