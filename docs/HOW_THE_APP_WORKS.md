# How GuardSync works

This is the map of the Expo app. Start here if you want to understand a screen or a number without reading every file.

## Folder map

| Want to… | Open |
|----------|------|
| Change a **screen URL / route** | `app/` — Expo Router: filename = URL (`dashboard.tsx` → `/dashboard`) |
| Change **Bluetooth / mouthguard packets** | `ble/` |
| Change **saving, uploading, or loading samples** | `telemetry/` |
| Change **Training / Game / Sleep** | `modes/` |
| Change **History charts** | `history/` |
| Change **buttons, charts, cards** | `components/` |
| Change **login** | `services/auth.ts` |
| Shared leftovers | `lib/` (`supabase.ts`, `safeBack.ts`) and `theme.ts` |

Route files in `app/` stay thin when they can. The athlete History UI lives in `history/HistoryScreen.tsx`; `app/history.tsx` only re-exports it.

## Athlete happy path

1. **Sign in** — `app/index.tsx` → `services/auth.ts`
2. **Pick role** — `app/role.tsx`
3. **Scan / pair mouthguard** — `app/onboarding.tsx` finds the name Smart Mouthguard, then saves one sample
4. **Calibration stub** — `app/calibration-flow.tsx`
5. **Pick activity** — `app/usage-mode.tsx` writes Training / Game / Sleep via `modes/storage.ts`
6. **Live dashboard** — `app/dashboard.tsx` + `ble/useLiveTelemetry.ts`  
   Four BLE packets → one reading → show metrics → save locally every ~2s → optional Supabase upload
7. **History** — `/history` loads phone outbox + latest snapshot + cloud, then draws one timeline

## How Bluetooth data reaches the app

The chip advertises as **Smart Mouthguard**. It does not put service UUIDs in the advertisement, so the phone scans all nearby devices and keeps that name.

Once connected, the chip's `loop()` waits about one second, then sends four packets. The phone subscribes to each characteristic and merges them into one reading.

```
Chip setup()
    name = "Smart Mouthguard"
    start advertising
    init ADC + IMU

Chip loop(), only while a phone is connected
    heart notify      5 bytes   bpm + millis
    temperature indicate  6 bytes   Celsius×100 + millis
    motion notify     32 bytes  gyro, ±16g accel, high-g, mag, millis
    bite notify       8 bytes   left force×100, right, millis

Phone
    scan by name                         app/onboarding.tsx
    connect + larger packet size         ble/stream.ts
    base64 → bytes                       ble/bytes.ts
    bytes → numbers                      ble/protocol.ts
    latest of each sensor → one reading  ble/stream.ts
    dashboard cards                      app/dashboard.tsx
    save comma line every ~2s            telemetry/localStore.ts
    optional upload                      telemetry/upload.ts
    History charts                       history/
```

Packet layouts live in `ble/protocol.ts`. Numbers are little-endian, matching the packed C structs.

| Dashboard card | Packet | How the number is made |
|----------------|--------|------------------------|
| Heart rate | heart | The byte as BPM. Current firmware sends 70. |
| Body temperature | temperature | int16 ÷ 100 = °C, then converted to °F |
| Head acceleration | motion | Length of the ±16 g accelerometer vector, in g. About 1 g at rest. |
| Bite force | bite | Left int16 ÷ 100. The chip loop fills the left sensor. |
| SpO2 | none | Shown as —. This sketch does not read a pulse-ox sensor. |

The motion packet also carries a high-g accelerometer (`m/s² × 1000` in an int16). That overflows above about 3 g, so the head-acceleration card uses the ±16 g sensor instead.

The phone asks Android for a 185-byte MTU before listening. The motion packet is 32 bytes, and the default BLE payload is 20, so a small MTU would drop it.

Saved lines still use `millis,active_minutes,head_g,heart_rate,spo2,temp_f,bite` so older History rows keep loading. SpO2 is stored as 0.

## What the Dashboard numbers mean

| Metric | Where it comes from | Rough meaning |
|--------|---------------------|----------------|
| Head acceleration | ±16 g accelerometer vector, in g | Impact magnitude. About 1 g when still. |
| Concussion risk | Derived from head acceleration | Low / moderate / high bands in `app/dashboard.tsx` |
| Heart rate | Heart packet, BPM | Exertion / recovery. Firmware currently sends 70. |
| SpO2 | Not sent by this firmware | Card stays — |
| Body temperature | Thermistor, shown in °F | Heat / fever-style alerts |
| Bite force | Left force sensor, firmware value ÷ 100 | Clench / contact |

Activity mode (Training / Game / Sleep) is **chosen by the athlete**. Live samples keep that mode. The app may **ask** to switch if vitals look like a different activity; it does not switch silently.

## Rules vs future ML

Today, “does this look like Game?” is a **rule-based classifier** in `modes/detect.ts` (impacts, heart rate, bite force, night hours).  
`modes/suggestChange.ts` only **prompts** when confidence is high or vitals jumped.

Replace `detectUsageMode()` later with a trained model; keep the same sample shape (`headAcceleration`, `heartRate`, `biteForce`, `receivedAtMs`).

## Saved line format

After the four packets are merged, the app stores:

`millis,active_minutes,head_g,heart_rate,spo2,temp_f,bite`

Parser: `ble/protocol.ts` (`parseStoredLine`). Older 3-field lines still load.
