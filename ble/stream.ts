/**
 * Open the mouthguard link and turn the four sensor packets into one reading.
 *
 * Called by: app/onboarding.tsx (one reading, then disconnect)
 *            ble/useLiveTelemetry.ts (stay connected on the dashboard)
 *
 * What this file does, in order:
 *   1. Connect to the device id saved at pairing.
 *   2. Ask Android for a 185-byte MTU. The motion packet is 32 bytes, and the
 *      default BLE payload is only 20, so a small MTU would cut that packet off.
 *      iOS chooses its own MTU and ignores this request.
 *   3. Discover services, then subscribe to all four characteristics.
 *   4. On each packet, decode it and update the matching field.
 *   5. Hand the combined reading to the caller. ready is true once heart
 *      has reported. Temperature, motion, and bite fill in if those sensors started.
 */
import { Platform } from 'react-native';
import type { Device, Subscription } from 'react-native-ble-plx';
import { bleManager } from './bleManager';
import { base64ToBytes } from './bytes';
import {
  decodePacket,
  MOUTHGUARD_CHANNELS,
  readingToLine,
  type MouthguardReading,
  type PacketKind,
} from './protocol';

export type MouthguardLink = {
  device: Device;
  stop: () => Promise<void>;
};

type SampleHandler = (reading: MouthguardReading) => void;

// One Bluetooth connection at a time. A second connect while the first is
// still opening makes the phone report "Operation was cancelled".
let bleGate: Promise<void> = Promise.resolve();

function afterCurrentBle<T>(task: () => Promise<T>): Promise<T> {
  const run = bleGate.then(task, task);
  bleGate = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function prepare(device: Device): Promise<Device> {
  if (Platform.OS === 'android') {
    try {
      await device.requestMTU(185);
    } catch {
      /* A failed MTU request still leaves the link up. Motion may arrive short. */
    }
  }
  await device.discoverAllServicesAndCharacteristics();
  return device;
}

/** Subscribe to heart, temperature, motion, and bite. One at a time so Android accepts each. */
async function listen(device: Device, onSample: SampleHandler): Promise<() => void> {
  const reading: MouthguardReading = {
    millis: 0,
    activeMinutes: 0,
    headAcceleration: null,
    heartRate: null,
    spO2: null,
    bodyTempF: null,
    biteForce: null,
    ready: false,
    raw: '',
  };
  const seen: Record<PacketKind, boolean> = {
    heart: false,
    temperature: false,
    motion: false,
    bite: false,
  };

  const subscriptions: Subscription[] = [];
  for (const channel of MOUTHGUARD_CHANNELS) {
    subscriptions.push(
      device.monitorCharacteristicForService(
        channel.service,
        channel.characteristic,
        (_error, characteristic) => {
          if (!characteristic?.value) return;
          const update = decodePacket(channel.kind, base64ToBytes(characteristic.value));
          if (!update) return;

          seen[channel.kind] = true;
          reading.millis = update.millis;
          reading.activeMinutes = Math.max(0, Math.floor(update.millis / 60000));
          if (update.heartRate != null) reading.heartRate = update.heartRate;
          if (update.bodyTempF != null) reading.bodyTempF = update.bodyTempF;
          if (update.headAcceleration != null) reading.headAcceleration = update.headAcceleration;
          if (update.biteForce != null) reading.biteForce = update.biteForce;
          reading.ready = seen.heart;
          reading.raw = readingToLine(reading);

          // Copy so the screen does not see later packets rewrite an older reading.
          onSample({ ...reading });
        },
        `mouthguard-${channel.kind}`,
        // Temperature is an indication on the chip. The other three are notifications.
        channel.kind === 'temperature' ? 'indication' : 'notification',
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  return () => {
    for (const subscription of subscriptions) {
      try {
        subscription.remove();
      } catch {
        /* already removed */
      }
    }
  };
}

/** Dashboard: reconnect by id and keep listening until stop(). */
export async function startMouthguardStream(
  deviceId: string,
  onSample: SampleHandler,
  isCancelled: () => boolean = () => false,
): Promise<MouthguardLink> {
  return afterCurrentBle(async () => {
    if (isCancelled()) {
      throw new Error('Operation was cancelled');
    }

    await bleManager.cancelDeviceConnection(deviceId).catch(() => {});
    const device = await bleManager.connectToDevice(deviceId, {
      timeout: 12000,
      requestMTU: 185,
      refreshGatt: 'OnConnected',
    });
    if (isCancelled()) {
      await disconnectQuietly(device);
      throw new Error('Operation was cancelled');
    }

    try {
      await prepare(device);
    } catch (error) {
      await disconnectQuietly(device);
      throw error;
    }

    if (isCancelled()) {
      await disconnectQuietly(device);
      throw new Error('Operation was cancelled');
    }

    const unsubscribe = await listen(device, onSample);
    return {
      device,
      stop: async () => {
        await afterCurrentBle(async () => {
          unsubscribe();
          await disconnectQuietly(device);
        });
      },
    };
  });
}

/**
 * Pairing: connect, wait until the heart packet has arrived, then return.
 * Temperature, motion, and bite are included when those sensors have reported.
 * The caller saves the device id and disconnects.
 */
export async function waitForFirstReading(
  device: Device,
  timeoutMs = 15000,
): Promise<{ connected: Device; reading: MouthguardReading }> {
  const connected = await device.connect();
  await prepare(connected);

  return new Promise((resolve, reject) => {
    let unsubscribe = () => {};
    let settled = false;

    const finish = (ok: boolean, reading?: MouthguardReading, error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribe();
      if (ok && reading) {
        resolve({ connected, reading });
        return;
      }
      connected.cancelConnection().catch(() => {});
      reject(error ?? new Error('No data from the mouthguard.'));
    };

    const timer = setTimeout(() => {
      finish(
        false,
        undefined,
        new Error('Timed out waiting for sensor data. Keep the mouthguard on and close to the phone.'),
      );
    }, timeoutMs);

    void listen(connected, (reading) => {
      // Wait for every packet. Stopping on heart alone made the phone hang up
      // before temperature, motion, and bite arrived.
      if (
        reading.heartRate != null &&
        reading.bodyTempF != null &&
        reading.headAcceleration != null &&
        reading.biteForce != null
      ) {
        finish(true, reading);
      }
    }).then((stop) => {
      if (settled) {
        stop();
        return;
      }
      unsubscribe = stop;
    });
  });
}

export async function disconnectQuietly(device: Device): Promise<void> {
  try {
    await device.cancelConnection();
  } catch {
    /* already disconnected */
  }
}
