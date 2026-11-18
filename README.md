# GuardSync (Expo / Android)

React Native companion app for a sensor-embedded mouthguard: BLE telemetry from the Smart Mouthguard (nRF52840), live athlete dashboard, local + Supabase history, and activity-mode prompts.

**How the code is laid out:** [docs/HOW_THE_APP_WORKS.md](docs/HOW_THE_APP_WORKS.md)

**Thesis (USF ETD draft):** [docs/thesis/GuardSync_ETD_draft.docx](docs/thesis/GuardSync_ETD_draft.docx) — formatting notes in [docs/ETD_FORMATTING_NOTES.md](docs/ETD_FORMATTING_NOTES.md)

## Prerequisites

- Node.js (LTS)
- Android phone with USB debugging, or same Wi‑Fi as your PC (for Metro)
- Optional: [EAS CLI](https://docs.expo.dev/build/setup/) for cloud dev builds

## Install

```bash
cd GuardSync
npm install
```

## Run in Expo Go (quick, limited)

```bash
npm start
```

Scan the QR code with Expo Go. **Expo Go cannot load custom native BLE code**; use a development build below to pair the mouthguard.

## Development build

1. Install EAS and log in:

   ```bash
   npm install -g eas-cli
   eas login
   ```

2. Link the project (first time only):

   ```bash
   cd GuardSync
   eas init
   ```

3. Build an Android development client:

   ```bash
   eas build --profile development --platform android
   ```

4. Install the APK on the phone.

5. Start Metro:

   ```bash
   npm run android:dev
   ```

   Open the installed **GuardSync** app so it connects to Metro.

## Stuck on “Loading from 10.x.x.x:8081…” (Android)

Metro can show **Android Bundled** on the PC while the phone never finishes. Android often blocks plain HTTP unless the app allows **cleartext**. This project sets `usesCleartextTraffic: true` via `expo-build-properties` — **rebuild** the dev client and reinstall the APK after that native change.

**Workarounds without rebuilding:**

1. Tunnel:

   ```bash
   npx expo start --tunnel
   ```

2. USB + adb reverse:

   ```bash
   adb reverse tcp:8081 tcp:8081
   ```

   Then set the bundler URL to `http://localhost:8081` in the device dev menu.

## Routes

File-based routes live under `app/` (`/role`, `/dashboard`, `/calibration-flow`, `/usage-mode`, `/history`, …). Supporting logic is in `ble/`, `telemetry/`, `modes/`, and `history/`.

## Bluetooth

The app uses **`react-native-ble-plx`** on Onboarding (`app/onboarding.tsx`) and the live Dashboard stream (`ble/useLiveTelemetry.ts`). After adding or updating this library, **rebuild the dev client**.

The board must be advertising as **Smart Mouthguard**. Android will prompt for **Bluetooth** and **location** (location is often required for BLE discovery). The data path is written out in [docs/HOW_THE_APP_WORKS.md](docs/HOW_THE_APP_WORKS.md).
