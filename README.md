# GuardSync (Expo / Android dev build)

This folder is the **React Native (Expo)** app. The original Vite web UI lives in the repo root under `src/`; screens here are a **working navigation shell** so you can run on a phone and port UI incrementally.

## Prerequisites

- Node.js (LTS)
- Android phone with USB debugging or same Wi‑Fi as your PC (for Metro)
- Optional: [EAS CLI](https://docs.expo.dev/build/setup/) for cloud dev builds

## Install

```bash
cd mobile
npm install
```

## Run in Expo Go (quick, limited)

```bash
npm start
```

Scan the QR code with Expo Go. **Expo Go cannot load custom dev-client-only native code**; use a dev build below for BLE or other native modules later.

## Development build (what you asked for)

1. Install EAS and log in:

   ```bash
   npm install -g eas-cli
   eas login
   ```

2. Link the project (first time only):

   ```bash
   cd mobile
   eas init
   ```

3. Build an **Android development client** (installable APK):

   ```bash
   eas build --profile development --platform android
   ```

4. Download and install the APK on your phone.

5. Start Metro with the dev client:

   ```bash
   npm run android:dev
   ```

   Open the installed **GuardSync** app; it should connect to Metro.

## Stuck on “Loading from 10.x.x.x:8081…” (Android)

Metro can show **Android Bundled** on your PC while the phone never finishes loading. Common cause: **Android blocks plain HTTP** (`http://` to your LAN IP) unless the app allows **cleartext** traffic. This project sets `usesCleartextTraffic: true` via `expo-build-properties` — **you must create a new dev build** (`eas build --profile development --platform android`) and reinstall the APK for that native change.

**Workarounds without rebuilding:**

1. **Tunnel** (often fixes immediately):

   ```bash
   npx expo start --tunnel
   ```

   Open the project using the new URL/QR (HTTPS tunnel, not raw LAN HTTP).

2. **USB + adb reverse** (uses `localhost` instead of the LAN IP):

   ```bash
   adb reverse tcp:8081 tcp:8081
   ```

   Then in the dev client, set the bundler URL to `http://localhost:8081` (dev menu on the device), or restart after scanning if your client picks it up.

## Routes

File-based routes under `app/` mirror the web router (`/role`, `/dashboard`, `/calibration-flow`, …). Replace placeholder screens with full layouts ported from `src/app/pages/*.tsx`.

## Bluetooth

The app uses **`react-native-ble-plx`** for real BLE scanning on the **Onboarding** screen (`app/onboarding.tsx`). After adding or updating this library, **rebuild the dev client** (`eas build --profile development --platform android`) and reinstall the APK so native code is included.

Android will prompt for **Bluetooth** and **location** (location is often required for BLE discovery on older devices). Turn on Bluetooth and keep the peripheral in pairing/advertising range.
