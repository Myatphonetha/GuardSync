/**
 * Pairing helper: connect once, wait for the first valid UART line, then stop listening.
 * Used on the Onboarding scan screen.
 */
import type { Device, Subscription } from 'react-native-ble-plx';
import { decodeBleCharacteristicValue } from './decodeCharacteristic';
import {
  NORDIC_UART_SERVICE_UUID,
  NORDIC_UART_TX_CHAR_UUID,
  type ArgonUartMetrics,
  parseArgonUartLine,
} from './nordicUart';

export type FirstUartResult = {
  parsed: ArgonUartMetrics;
  raw: string;
  connected: Device;
};

export function waitForFirstUartLine(device: Device, timeoutMs = 15000): Promise<FirstUartResult> {
  return (async () => {
    let connected: Device;
    try {
      connected = await device.connect();
      await connected.discoverAllServicesAndCharacteristics();
    } catch (e) {
      throw e instanceof Error ? e : new Error(String(e));
    }

    return new Promise((resolve, reject) => {
      let subscription: Subscription | null = null;
      const timer = setTimeout(() => {
        try {
          subscription?.remove();
        } catch {
          /* noop */
        }
        connected.cancelConnection().catch(() => {});
        reject(
          new Error(
            'Timed out waiting for UART notification. Ensure the Argon is running and sending every 2s.',
          ),
        );
      }, timeoutMs);

      subscription = connected.monitorCharacteristicForService(
        NORDIC_UART_SERVICE_UUID,
        NORDIC_UART_TX_CHAR_UUID,
        (error, characteristic) => {
          if (error) return;
          if (!characteristic?.value) return;
          const raw = decodeBleCharacteristicValue(characteristic.value);
          const parsed = parseArgonUartLine(raw);
          if (!parsed) return;
          clearTimeout(timer);
          try {
            subscription?.remove();
          } catch {
            /* noop */
          }
          resolve({ parsed, raw, connected });
        },
      );
    });
  })();
}

export async function disconnectQuietly(device: Device): Promise<void> {
  try {
    await device.cancelConnection();
  } catch {
    /* noop */
  }
}
