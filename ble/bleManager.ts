/**
 * One shared BLE stack for the whole app.
 * Creating more than one BleManager can break scanning on Android.
 */
import { BleManager } from 'react-native-ble-plx';

export const bleManager = new BleManager();
