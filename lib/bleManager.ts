import { BleManager } from 'react-native-ble-plx';

/** Single shared instance (avoid multiple native BLE stacks). */
export const bleManager = new BleManager();
