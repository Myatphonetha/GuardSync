/**
 * Live Dashboard helper: stay connected and call onSample for every UART line
 * until stop() is called.
 */
import type { Device, Subscription } from 'react-native-ble-plx';
import { bleManager } from './bleManager';
import { decodeBleCharacteristicValue } from './decodeCharacteristic';
import {
  NORDIC_UART_SERVICE_UUID,
  NORDIC_UART_TX_CHAR_UUID,
  type ArgonUartMetrics,
  parseArgonUartLine,
} from './nordicUart';

export type ArgonUartStreamHandle = {
  device: Device;
  stop: () => Promise<void>;
};

export async function startArgonUartStream(
  deviceId: string,
  onSample: (parsed: ArgonUartMetrics, raw: string) => void,
): Promise<ArgonUartStreamHandle> {
  const device = await bleManager.connectToDevice(deviceId, { autoConnect: false });
  await device.discoverAllServicesAndCharacteristics();

  let subscription: Subscription | null = null;

  subscription = device.monitorCharacteristicForService(
    NORDIC_UART_SERVICE_UUID,
    NORDIC_UART_TX_CHAR_UUID,
    (error, characteristic) => {
      if (error) return;
      if (!characteristic?.value) return;
      const raw = decodeBleCharacteristicValue(characteristic.value);
      const parsed = parseArgonUartLine(raw);
      if (parsed) onSample(parsed, raw);
    },
  );

  return {
    device,
    stop: async () => {
      try {
        subscription?.remove();
      } catch {
        /* noop */
      }
      try {
        await device.cancelConnection();
      } catch {
        /* noop */
      }
    },
  };
}
