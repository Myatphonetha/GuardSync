/**
 * Smart Mouthguard Bluetooth protocol.
 *
 * The dev kit is an nRF52840 running Adafruit Bluefruit. It advertises as
 * "Smart Mouthguard" and, once a phone is connected, sends four binary
 * packets about once a second. This file is the only place that knows the
 * UUIDs and how those bytes turn into numbers.
 *
 * How a reading gets to the screen:
 *   1. Onboarding scans every nearby device and keeps the one named Mouthguard.
 *      Service UUIDs are not in the advertisement, so the scan cannot filter on them.
 *   2. stream.ts connects, asks for a larger packet size, and subscribes.
 *   3. Each update arrives as base64. bytes.ts turns that into raw bytes.
 *   4. decodePacket() below reads one packet (heart, temperature, motion, or bite).
 *   5. stream.ts remembers the latest value of each sensor and hands the
 *      dashboard one combined reading.
 *   6. About every 2 seconds the dashboard saves readingToLine() so History
 *      can load it later with parseStoredLine().
 */
import type { Device } from 'react-native-ble-plx';

export const MOUTHGUARD_NAME = 'Smart Mouthguard';

/** GATT ids from GS/GS.ino. Temperature uses indicate; the other three use notify. */
export const MOUTHGUARD_CHANNELS = [
  {
    kind: 'heart',
    service: 'a329162e-bf3d-4f73-9a1a-bb8ccfe142e7',
    characteristic: '0a21fc6f-6edb-4086-9460-0eccb35150fb',
  },
  {
    kind: 'temperature',
    service: 'd2a95330-d754-4a5b-bb74-b1b09bef98f5',
    characteristic: '6896072b-24ce-4982-ac6a-899fa7183069',
  },
  {
    kind: 'motion',
    service: '5f07ce79-170a-4c45-b8ca-eae29004e45f',
    characteristic: 'd2e9a9c2-a94b-42cb-b11d-b76549e7a164',
  },
  {
    kind: 'bite',
    service: '56f38df0-e65b-4190-a3da-9f941c9d1763',
    characteristic: 'f86a2066-5203-4bed-b090-ac0b89e68d81',
  },
] as const;

export type PacketKind = (typeof MOUTHGUARD_CHANNELS)[number]['kind'];

/** One combined reading. Null means that sensor has not reported yet. */
export type MouthguardReading = {
  /** millis() on the chip since it booted. */
  millis: number;
  activeMinutes: number;
  /** Vector length of the ±16 g accelerometer, in g. About 1 at rest. */
  headAcceleration: number | null;
  /** Beats per minute. Null when that sensor is not attached or has not reported. */
  heartRate: number | null;
  /** Percent. Null when no pulse-ox sensor is attached. */
  spO2: number | null;
  /** Degrees Fahrenheit, converted from the chip's Celsius × 100. */
  bodyTempF: number | null;
  /** Left bite sensor. Firmware stores force × 100; we divide by 100. */
  biteForce: number | null;
  /** True after the heart packet has arrived. Other sensors fill in as they report. */
  ready: boolean;
  /** Comma line saved for History. Same columns as older samples. */
  raw: string;
};

export type PacketUpdate = {
  millis: number;
  heartRate?: number;
  bodyTempF?: number;
  headAcceleration?: number;
  biteForce?: number;
};

const GRAVITY = 9.80665;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function viewOf(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

/** Length of a 3-axis acceleration vector, converted from m/s² counts into g. */
function accelerationG(x: number, y: number, z: number, countsPerMs2: number): number {
  const ms2 = Math.hypot(x / countsPerMs2, y / countsPerMs2, z / countsPerMs2);
  return round2(ms2 / GRAVITY);
}

/**
 * Read one packet. Returns null when the byte length is short
 * (usually because the phone's BLE packet size is still 20 bytes).
 *
 * Layout matches the packed structs on the chip. The nRF52840 is little-endian.
 *
 * heart (5 bytes):        uint8 bpm, uint32 millis
 * temperature (6 bytes):  int16 Celsius×100, uint32 millis
 * motion (32 bytes):      int16 gyro[3], accel16[3], accel200[3], mag[3],
 *                         uint16 biteL, uint16 biteR, uint32 millis
 * bite (8 bytes):         int16 left×100, int16 right×100, uint32 millis
 */
export function decodePacket(kind: PacketKind, bytes: Uint8Array): PacketUpdate | null {
  const view = viewOf(bytes);

  if (kind === 'heart') {
    if (bytes.length < 5) return null;
    return {
      heartRate: view.getUint8(0),
      millis: view.getUint32(1, true),
    };
  }

  if (kind === 'temperature') {
    if (bytes.length < 6) return null;
    const celsius = view.getInt16(0, true) / 100;
    const fahrenheit = (celsius * 9) / 5 + 32;
    return {
      bodyTempF: round1(fahrenheit),
      millis: view.getUint32(2, true),
    };
  }

  if (kind === 'bite') {
    if (bytes.length < 8) return null;
    const left = view.getInt16(0, true) / 100;
    const right = view.getInt16(2, true) / 100;
    // The loop on the chip fills left_bite only. If both are present, keep the larger one.
    return {
      biteForce: round2(Math.max(left, right)),
      millis: view.getUint32(4, true),
    };
  }

  if (bytes.length < 32) return null;
  // ±16 g accelerometer is m/s² × 100 (offsets 6, 8, 10). That fits in int16
  // across the sensor's real range. The high-g axes are × 1000 and overflow
  // int16 above about 3 g, so the dashboard number uses the 16 g sensor.
  const x = view.getInt16(6, true);
  const y = view.getInt16(8, true);
  const z = view.getInt16(10, true);
  return {
    headAcceleration: accelerationG(x, y, z, 100),
    millis: view.getUint32(28, true),
  };
}

/** True when a scan result is our board. Match the advertised name, not a service id. */
export function isMouthguardDevice(device: Device): boolean {
  const name = `${device.name ?? ''} ${device.localName ?? ''}`.toLowerCase();
  return name.includes('mouthguard');
}

export function readingToLine(reading: {
  millis: number;
  activeMinutes: number;
  headAcceleration: number | null;
  heartRate: number | null;
  bodyTempF: number | null;
  biteForce: number | null;
}): string {
  return [
    reading.millis,
    reading.activeMinutes,
    reading.headAcceleration ?? 0,
    reading.heartRate ?? 0,
    0,
    reading.bodyTempF ?? 0,
    reading.biteForce ?? 0,
  ].join(',');
}

export type StoredMetrics = {
  millis: number;
  activeMinutes: number;
  headAcceleration: number;
  heartRate: number;
  spO2: number;
  bodyTempF: number;
  biteForce: number;
};

/**
 * Read a saved comma line back into numbers.
 * Columns: millis, active_minutes, head_g, heart_rate, spo2, temp_f, bite
 * SpO2 is 0 when this mouthguard firmware recorded the line.
 * A 3-number line is an older fallback and still loads.
 */
export function parseStoredLine(text: string): StoredMetrics | null {
  const line = text.trim().split(/\r?\n/)[0]?.trim() ?? '';
  if (!line) return null;
  const parts = line.split(',').map((s) => s.trim());

  if (parts.length >= 7) {
    const millis = parseInt(parts[0], 10);
    const activeMinutes = parseInt(parts[1], 10);
    const headAcceleration = parseFloat(parts[2]);
    const heartRate = parseInt(parts[3], 10);
    const spO2 = parseInt(parts[4], 10);
    const bodyTempF = parseFloat(parts[5]);
    const biteForce = parseFloat(parts[6]);
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
    const v1 = parseFloat(parts[1]);
    const v2 = parseFloat(parts[2]);
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
