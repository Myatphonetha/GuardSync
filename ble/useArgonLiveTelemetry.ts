/**
 * Dashboard live feed: reconnects to the paired Argon when this screen is focused,
 * updates metric cards, and saves a sample about every 2 seconds.
 */
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { loadLatestArgonTelemetry, persistArgonTelemetryRecord } from '../telemetry/localStore';
import { pushRecentTelemetrySample } from '../telemetry/recentBuffer';
import { toBackendPayload } from '../telemetry/types';
import { postArgonTelemetry } from '../telemetry/upload';
import { ensureBlePermissions } from './blePermissions';
import { loadPairedDevice } from './deviceStorage';
import type { ArgonUartStreamHandle } from './uartStream';
import { startArgonUartStream } from './uartStream';

const PERSIST_MS = 2000;

export type LiveTelemetryState = {
  connected: boolean;
  deviceName: string | null;
  streamLive: boolean;
  streamError: string | null;
  activeMinutes: number;
  headAccel: number;
  heartRate: number;
  spO2: number;
  bodyTemp: number;
  biteForce: number;
};

export function useArgonLiveTelemetry(): LiveTelemetryState {
  const [connected, setConnected] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [streamLive, setStreamLive] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [activeMinutes, setActiveMinutes] = useState(0);
  const [headAccel, setHeadAccel] = useState(95);
  const [heartRate, setHeartRate] = useState(72);
  const [spO2, setSpO2] = useState(98);
  const [bodyTemp, setBodyTemp] = useState(98.4);
  const [biteForce, setBiteForce] = useState(160);

  const lastPersistMs = useRef(0);
  const deviceMeta = useRef({ deviceId: '', deviceName: 'Argon' });

  const applyRecord = useCallback(
    (parsed: {
      activeMinutes: number;
      headAcceleration: number;
      heartRate: number;
      spO2: number;
      bodyTempF: number;
      biteForce: number;
    }) => {
      setActiveMinutes(parsed.activeMinutes);
      setHeadAccel(parsed.headAcceleration);
      setHeartRate(parsed.heartRate);
      setSpO2(parsed.spO2);
      setBodyTemp(parsed.bodyTempF);
      setBiteForce(parsed.biteForce);
    },
    [],
  );

  const loadSnapshot = useCallback(async () => {
    const paired = await loadPairedDevice();
    setConnected(paired.connected);
    setDeviceName(paired.deviceName);
    if (paired.deviceId) deviceMeta.current.deviceId = paired.deviceId;
    if (paired.deviceName) deviceMeta.current.deviceName = paired.deviceName;

    const record = await loadLatestArgonTelemetry();
    if (record) {
      applyRecord(record);
    }
  }, [applyRecord]);

  useFocusEffect(
    useCallback(() => {
      let stream: ArgonUartStreamHandle | null = null;
      let cancelled = false;

      (async () => {
        setStreamLive(false);
        setStreamError(null);
        await loadSnapshot();

        const paired = await loadPairedDevice();
        if (!paired.connected || !paired.deviceId) return;

        const ok = await ensureBlePermissions();
        if (!ok) {
          if (!cancelled) setStreamError('Bluetooth permissions required.');
          return;
        }

        try {
          stream = await startArgonUartStream(paired.deviceId, (parsed, raw) => {
            if (cancelled) return;
            setStreamLive(true);
            setStreamError(null);
            applyRecord(parsed);

            pushRecentTelemetrySample({
              headAcceleration: parsed.headAcceleration,
              heartRate: parsed.heartRate,
              biteForce: parsed.biteForce,
              receivedAtMs: Date.now(),
            });

            const now = Date.now();
            if (now - lastPersistMs.current >= PERSIST_MS) {
              lastPersistMs.current = now;
              void persistArgonTelemetryRecord({
                parsed,
                raw,
                deviceId: deviceMeta.current.deviceId || paired.deviceId || '',
                deviceName: deviceMeta.current.deviceName,
              })
                .then((record) => {
                  void postArgonTelemetry(toBackendPayload(record)).catch(() => {});
                })
                .catch(() => {});
            }
          });
        } catch (e) {
          if (!cancelled) {
            setStreamError(e instanceof Error ? e.message : String(e));
          }
        }
      })();

      return () => {
        cancelled = true;
        setStreamLive(false);
        void stream?.stop();
      };
    }, [applyRecord, loadSnapshot]),
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
