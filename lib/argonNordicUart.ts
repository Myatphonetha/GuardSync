import type { Device } from 'react-native-ble-plx';

/** Nordic UART Service (matches Particle `BleService` / nRF convention). */
export const NORDIC_UART_SERVICE_UUID = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';

/** TX characteristic (device → phone) with NOTIFY. */
export const NORDIC_UART_TX_CHAR_UUID = '6E400003-B5A3-F393-E0A9-E50E24DCCA9E';

/** GAP device name from `BLE.setDeviceName("Argon")` (preferred over appendLocalName). */
export const ARGON_DEVICE_NAME = 'Argon';

function normalizeBleUuid(uuid: string): string {
  return uuid.replace(/-/g, '').toUpperCase();
}

function deviceAdvertisesNordicUart(device: Device): boolean {
  const target = normalizeBleUuid(NORDIC_UART_SERVICE_UUID);
  const uuids = device.serviceUUIDs ?? [];
  return uuids.some((u) => normalizeBleUuid(u) === target);
}

/**
 * True when scan results look like our Particle Argon UART peripheral.
 * Do not require "Argon" in the name: Android often omits localName on the first ADV packet.
 */
export function isArgonAdvertisedDevice(device: Device): boolean {
  if (deviceAdvertisesNordicUart(device)) return true;

  const n = (device.name ?? '').trim().toLowerCase();
  const ln = (device.localName ?? '').trim().toLowerCase();
  return (
    n === ARGON_DEVICE_NAME.toLowerCase() ||
    n.includes('argon') ||
    ln.includes('argon')
  );
}

export type ArgonUartMetrics = {
  millis: number;
  activeMinutes: number;
  headAcceleration: number;
  heartRate: number;
  spO2: number;
  bodyTempF: number;
  biteForce: number;
};

/**
 * Expected line:
 * `millis,active_minutes,head_acceleration,heart_rate,spo2,body_temp_f,bite_force`
 * Falls back to older 3-value format: `millis,v1,v2`.
 */
export function parseArgonUartLine(text: string): ArgonUartMetrics | null {
  const line = text.trim().split(/\r?\n/)[0]?.trim() ?? '';
  if (!line) return null;
  const parts = line.split(',').map((s) => s.trim());

  if (parts.length >= 7) {
    const millis = parseInt(parts[0], 10);
    const activeMinutes = parseInt(parts[1], 10);
    const headAcceleration = parseInt(parts[2], 10);
    const heartRate = parseInt(parts[3], 10);
    const spO2 = parseInt(parts[4], 10);
    const bodyTempF = parseFloat(parts[5]);
    const biteForce = parseInt(parts[6], 10);
    if (
      Number.isNaN(millis) ||
      Number.isNaN(activeMinutes) ||
      Number.isNaN(headAcceleration) ||
      Number.isNaN(heartRate) ||
      Number.isNaN(spO2) ||
      Number.isNaN(bodyTempF) ||
      Number.isNaN(biteForce)
    ) {
      return null;
    }
    return { millis, activeMinutes, headAcceleration, heartRate, spO2, bodyTempF, biteForce };
  }

  if (parts.length >= 3) {
    const millis = parseInt(parts[0], 10);
    const v1 = parseInt(parts[1], 10);
    const v2 = parseInt(parts[2], 10);
    if (Number.isNaN(millis) || Number.isNaN(v1) || Number.isNaN(v2)) return null;
    return {
      millis,
      activeMinutes: Math.max(0, Math.floor(millis / 60000)),
      headAcceleration: v1,
      heartRate: v2,
      spO2: 96,
      bodyTempF: 98.6,
      biteForce: 150,
    };
  }

  return null;
}
