/**
 * Dashboard live feed. Opening the screen reconnects to the paired mouthguard.
 *
 * Order:
 *   deviceStorage.ts  — which device did we pair?
 *   blePermissions.ts — is Bluetooth allowed?
 *   stream.ts         — connect and subscribe to the four sensor packets
 *   The screen updates on every packet that arrives.
 *   Once heart, head acceleration, and bite have all arrived, telemetry/localStore.ts saves about every 2 seconds
 *   and telemetry/upload.ts tries to send that sample to Supabase.
 */
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { persistArgonTelemetryRecord } from '../telemetry/localStore';
import { pushRecentTelemetrySample } from '../telemetry/recentBuffer';
import { toBackendPayload } from '../telemetry/types';
import { postArgonTelemetry } from '../telemetry/upload';
import { bleManager } from './bleManager';
import { ensureBlePermissions } from './blePermissions';
import { loadPairedDevice } from './deviceStorage';
import type { MouthguardReading } from './protocol';
import type { MouthguardLink } from './stream';
import { startMouthguardStream } from './stream';

const PERSIST_MS = 2000;

export type LiveTelemetryState = {
  connected: boolean;
  deviceName: string | null;
  streamLive: boolean;
  streamError: string | null;
  activeMinutes: number;
  headAccel: number | null;
  heartRate: number | null;
  spO2: number | null;
  bodyTemp: number | null;
  biteForce: number | null;
};

export function useLiveTelemetry(): LiveTelemetryState {
  const [connected, setConnected] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [streamLive, setStreamLive] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [activeMinutes, setActiveMinutes] = useState(0);
  const [headAccel, setHeadAccel] = useState<number | null>(null);
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [spO2, setSpO2] = useState<number | null>(null);
  const [bodyTemp, setBodyTemp] = useState<number | null>(null);
  const [biteForce, setBiteForce] = useState<number | null>(null);

  const lastPushMs = useRef(0);
  const lastPersistMs = useRef(0);
  const deviceMeta = useRef({ deviceId: '', deviceName: 'Smart Mouthguard' });

  const applyReading = useCallback((reading: MouthguardReading) => {
    setActiveMinutes(reading.activeMinutes);
    if (reading.headAcceleration != null) setHeadAccel(reading.headAcceleration);
    if (reading.heartRate != null) setHeartRate(reading.heartRate);
    // This board does not send SpO2. A missing value clears the old saved percent.
    setSpO2(reading.spO2 != null && reading.spO2 > 0 ? reading.spO2 : null);
    if (reading.bodyTempF != null) setBodyTemp(reading.bodyTempF);
    if (reading.biteForce != null) setBiteForce(reading.biteForce);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let link: MouthguardLink | null = null;
      let dropSub: { remove: () => void } | null = null;
      let stopped = false;

      const run = async () => {
        setStreamLive(false);
        setStreamError(null);
        setActiveMinutes(0);
        setHeadAccel(null);
        setHeartRate(null);
        setSpO2(null);
        setBodyTemp(null);
        setBiteForce(null);

        const paired = await loadPairedDevice();
        if (stopped) return;
        setConnected(paired.connected);
        setDeviceName(paired.deviceName);
        if (paired.deviceId) deviceMeta.current.deviceId = paired.deviceId;
        if (paired.deviceName) deviceMeta.current.deviceName = paired.deviceName;

        // "demo" is the skip button. There is no radio to open.
        if (!paired.connected || !paired.deviceId || paired.deviceId === 'demo') return;

        const ok = await ensureBlePermissions();
        if (stopped) return;
        if (!ok) {
          setStreamError('Bluetooth permission is required.');
          return;
        }

        let gotPacket = false;
        const connect = () =>
          startMouthguardStream(
            paired.deviceId as string,
            (reading) => {
              if (stopped) return;
              gotPacket = true;
              setStreamLive(true);
              setStreamError(null);
              applyReading(reading);

              // Keep one sample per second so mode detection is not counted
              // once per packet.
              if (!reading.ready) return;
              if (
                reading.headAcceleration == null ||
                reading.heartRate == null ||
                reading.biteForce == null
              ) {
                return;
              }

              const now = Date.now();
              if (now - lastPushMs.current >= 1000) {
                lastPushMs.current = now;
                pushRecentTelemetrySample({
                  headAcceleration: reading.headAcceleration,
                  heartRate: reading.heartRate,
                  biteForce: reading.biteForce,
                  receivedAtMs: now,
                });
              }

              if (now - lastPersistMs.current < PERSIST_MS) return;
              lastPersistMs.current = now;

              void persistArgonTelemetryRecord({
                parsed: {
                  millis: reading.millis,
                  activeMinutes: reading.activeMinutes,
                  headAcceleration: reading.headAcceleration,
                  heartRate: reading.heartRate,
                  spO2: reading.spO2 ?? 0,
                  bodyTempF: reading.bodyTempF ?? 0,
                  biteForce: reading.biteForce,
                },
                raw: reading.raw,
                deviceId: deviceMeta.current.deviceId || paired.deviceId || '',
                deviceName: deviceMeta.current.deviceName,
              })
                .then((record) => {
                  void postArgonTelemetry(toBackendPayload(record)).catch(() => {});
                })
                .catch(() => {});
            },
            () => stopped,
          );

        // Reason 19 means the phone hung up. Stay on this screen and connect again.
        while (!stopped) {
          let silentTimer: ReturnType<typeof setTimeout> | null = null;
          try {
            gotPacket = false;
            link = await connect();
            if (stopped) {
              await link.stop();
              return;
            }
            // A live link with no packets is the stuck state. RESET used to clear it.
            silentTimer = setTimeout(() => {
              if (!gotPacket && !stopped) {
                void link?.stop();
              }
            }, 3000);
            await new Promise<void>((resolve) => {
              dropSub = bleManager.onDeviceDisconnected(paired.deviceId as string, () => {
                dropSub?.remove();
                dropSub = null;
                resolve();
              });
            });
          } catch (e) {
            if (stopped) return;
            const message = e instanceof Error ? e.message : String(e);
            if (!message.toLowerCase().includes('cancel')) {
              setStreamError(message);
            }
          } finally {
            if (silentTimer) clearTimeout(silentTimer);
          }
          link = null;
          if (stopped) return;
          setStreamLive(false);
          await new Promise((resolve) => setTimeout(resolve, 700));
        }
      };

      void run();

      return () => {
        stopped = true;
        setStreamLive(false);
        dropSub?.remove();
        void link?.stop();
      };
    }, [applyReading]),
  );

  return {
    connected,
    deviceName,
    streamLive,
    streamError,
    activeMinutes,
    headAccel,
    heartRate,
    spO2,
    bodyTemp,
    biteForce,
  };
}
