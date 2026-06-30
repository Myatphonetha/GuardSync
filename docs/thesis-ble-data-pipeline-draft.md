# Real-Time Athlete Telemetry via Bluetooth Low Energy

## From Embedded Sensors to Cloud Storage and Machine Learning

---

**Author:** [Your Full Name]  
**Degree Program:** [e.g., B.S. Computer Science / M.S. Electrical Engineering]  
**Institution:** [University Name]  
**Advisor:** [Advisor Name]  
**Date:** June 2026

---

## Abstract

Wearable sports technology enables continuous monitoring of physiological and biomechanical signals during athletic activity. This thesis presents an end-to-end system that acquires multi-sensor data from a custom mouthguard instrumented with a Particle Argon microcontroller, transmits readings to a mobile application over Bluetooth Low Energy (BLE), persists telemetry in a cloud backend, and outlines a machine learning workflow for training predictive models on collected data.

The hardware layer samples metrics including head acceleration, heart rate, blood oxygen saturation (SpO₂), body temperature, and bite force. Data is serialized as comma-separated values and streamed via the Nordic UART Service (NUS) at approximately two-second intervals. The mobile application, built with React Native and `react-native-ble-plx`, performs device discovery, GATT connection, characteristic notification subscription, parsing, local buffering, and authenticated upload to Supabase (PostgreSQL). Row-level security ties telemetry records to authenticated users.

A proposed machine learning pipeline uses labeled telemetry windows to train classifiers for concussion-risk estimation and anomaly detection, with features derived from head-acceleration time series and correlated vital signs. This document describes system architecture, protocol design, implementation details, evaluation methodology, and future work. Results demonstrate reliable BLE streaming, offline-tolerant data persistence, and a scalable foundation for supervised model training on real-world athlete data.

**Keywords:** Bluetooth Low Energy, Nordic UART, IoT, sports telemetry, concussion monitoring, Supabase, machine learning, edge-to-cloud pipeline

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Literature Review](#2-literature-review)
3. [System Architecture](#3-system-architecture)
4. [Hardware and BLE Implementation](#4-hardware-and-ble-implementation)
5. [Mobile Software and Data Transfer](#5-mobile-software-and-data-transfer)
6. [Backend Design](#6-backend-design)
7. [Machine Learning Pipeline](#7-machine-learning-pipeline)
8. [Evaluation](#8-evaluation)
9. [Discussion](#9-discussion)
10. [Conclusion and Future Work](#10-conclusion-and-future-work)
11. [References](#11-references)
12. [Appendices](#12-appendices)

---

## 1. Introduction

### 1.1 Background and Motivation

Contact sports expose athletes to head impacts that may cause concussions or sub-concussive trauma. Traditional sideline assessment relies on subjective protocols and may miss transient events. Wearable sensors embedded in mouthguards offer a promising platform: they remain in the oral cavity during play, can host inertial measurement units (IMUs) and physiological sensors, and can communicate wirelessly to coaches, trainers, and parents.

Modern low-power microcontrollers such as the Particle Argon support BLE peripheral mode, enabling direct phone-to-device communication without a dedicated gateway. Coupling real-time mobile visualization with cloud storage creates a dataset suitable for longitudinal analysis and machine learning.

### 1.2 Problem Statement

Designing a reliable athlete monitoring system requires solving four coupled problems:

1. **Hardware acquisition** — sampling multiple sensors with bounded latency and power consumption
2. **Wireless transport** — BLE connection stability, packet loss, and Android permission constraints
3. **Software integration** — parsing, buffering, authentication, and synchronization to a backend
4. **Analytics** — transforming raw streams into actionable risk indicators via rule-based or learned models

This thesis addresses the full stack from firmware UART output to cloud ingestion and defines an ML training methodology for impact classification.

### 1.3 Objectives

| # | Objective |
|---|-----------|
| O1 | Implement BLE peripheral firmware on Particle Argon using Nordic UART Service |
| O2 | Develop a mobile client capable of scanning, pairing, and streaming telemetry |
| O3 | Design a backend schema and secure ingestion API using Supabase |
| O4 | Define feature extraction and ML training procedures for concussion-related classification |
| O5 | Evaluate end-to-end latency, throughput, and connection reliability |

### 1.4 Scope and Limitations

- **In scope:** BLE data path, mobile app, cloud persistence, ML pipeline design
- **Out of scope (initial phase):** FDA/medical certification, clinical validation, iOS deployment details
- **Assumptions:** Athletes use Android development builds with BLE permissions; trainers access data through authenticated accounts

### 1.5 Thesis Organization

Chapter 2 reviews related work. Chapter 3 presents system architecture. Chapters 4–6 cover hardware/BLE, mobile software, and backend. Chapter 7 describes ML training. Chapter 8 discusses evaluation. Chapter 9 concludes.

---

## 2. Literature Review

### 2.1 Concussion Detection and Mouthguard Sensors

Prior research has shown that instrumented mouthguards can measure linear and angular head acceleration with fidelity comparable to helmet-mounted sensors in some conditions. Mouthguard form factor reduces motion artifacts relative to skin-mounted wearables during high-intensity activity.

### 2.2 Bluetooth Low Energy in Wearables

BLE GATT (Generic Attribute Profile) defines services and characteristics for structured data exchange. The **Nordic UART Service (NUS)** is a de-facto standard for serial-style streaming over BLE, widely used in nRF52 and compatible ecosystems including Particle firmware. NOTIFY characteristics allow the peripheral to push data without repeated read requests, reducing connection overhead.

### 2.3 Edge-to-Cloud IoT Architectures

Typical IoT pipelines follow: **sense → preprocess → transmit → store → analyze**. Mobile devices often act as gateways when direct Wi-Fi on the wearable is impractical. Offline-first designs use local queues (outbox pattern) before cloud sync—critical when BLE remains connected but cellular/Wi-Fi is intermittent.

### 2.4 Machine Learning for Impact Detection

Supervised approaches use labeled impact events (video review, instrumented dummies) to train classifiers on acceleration magnitude, jerk, and frequency-domain features. Semi-supervised and anomaly-detection methods help when labeled concussion data is scarce. Multi-modal fusion (acceleration + heart rate variability) may improve sensitivity.

---

## 3. System Architecture

### 3.1 High-Level Overview

```
┌─────────────────┐     BLE (NUS)      ┌──────────────────┐
│  Particle Argon │ ──────────────────► │  Mobile App       │
│  (Firmware)     │   NOTIFY / 2s       │  (GuardSync)      │
│  IMU, HR, SpO2  │                     │  React Native     │
└─────────────────┘                     └────────┬─────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
                    ▼                          ▼                          ▼
            ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
            │ AsyncStorage │          │ Live UI      │          │ Supabase     │
            │ (local cache │          │ Dashboard /  │          │ PostgreSQL   │
            │  + outbox)   │          │ History      │          │ + Auth RLS   │
            └──────────────┘          └──────────────┘          └──────┬───────┘
                                                                       │
                                                                       ▼
                                                              ┌──────────────┐
                                                              │ ML Training  │
                                                              │ (Python)     │
                                                              └──────────────┘
```

### 3.2 Data Flow Summary

1. Firmware aggregates sensor readings and formats a CSV line.
2. BLE NUS TX characteristic notifies the phone.
3. Mobile app decodes Base64 characteristic value, parses CSV, updates UI.
4. Every ~2 seconds, app persists locally and POSTs to Supabase if user is authenticated.
5. History views merge local outbox + cloud rows for charting.
6. Exported datasets feed offline ML training.

### 3.3 Technology Stack

| Layer | Technology |
|-------|------------|
| Hardware | Particle Argon, onboard/custom sensors |
| Firmware BLE | Nordic UART Service UUID `6E400001-...` |
| Mobile | Expo / React Native, `react-native-ble-plx` |
| Local storage | `@react-native-async-storage/async-storage` |
| Backend | Supabase (Auth + PostgreSQL) |
| ML (proposed) | Python, pandas, scikit-learn / PyTorch |

---

## 4. Hardware and BLE Implementation

### 4.1 Sensor Suite

The mouthguard prototype measures:

| Metric | Field name | Description |
|--------|------------|-------------|
| Device uptime | `millis` | Firmware monotonic clock (ms) |
| Active time | `active_minutes` | Cumulative wear/session time |
| Head acceleration | `head_acceleration` | Proxy for impact severity (scaled unit) |
| Heart rate | `heart_rate` | BPM |
| Blood oxygen | `spo2` | Percentage |
| Body temperature | `body_temp_f` | Fahrenheit |
| Bite force | `bite_force` | Oral pressure / clamp force |

### 4.2 Firmware Telemetry Format

Primary UART line format (7 fields):

```
millis,active_minutes,head_acceleration,heart_rate,spo2,body_temp_f,bite_force
```

Example:

```
123456,15,95,72,98,98.4,160
```

Legacy 3-field format (`millis,v1,v2`) is supported for backward compatibility during firmware migration.

### 4.3 BLE Service Design

| Component | UUID / Value |
|-----------|----------------|
| Service | Nordic UART `6E400001-B5A3-F393-E0A9-E50E24DCCA9E` |
| TX (device → phone) | `6E400003-B5A3-F393-E0A9-E50E24DCCA9E` (NOTIFY) |
| Device name | `Argon` (GAP) |
| Advertising | Service UUID in ADV packet for filtered scanning |

Firmware transmits on a **~2 second** cadence. The mobile client subscribes to NOTIFY on the TX characteristic and processes each notification as one logical sample.

### 4.4 Design Considerations

- **MTU and payload size:** CSV lines are small (<100 bytes), well within default ATT MTU.
- **Power:** BLE connection interval and notification rate trade battery life vs. temporal resolution.
- **Reliability:** UART text protocol tolerates occasional dropped notifications; sequence gaps detectable via `millis` discontinuities.
- **Security:** BLE pairing/bonding can be added for production; current prototype uses open peripheral mode suitable for lab evaluation.

---

## 5. Mobile Software and Data Transfer

### 5.1 BLE Client Architecture

The mobile application (GuardSync) uses a **singleton BleManager** to avoid multiple native BLE stacks. Key modules:

| Module | Responsibility |
|--------|----------------|
| `blePermissions.ts` | Android 12+ Bluetooth scan/connect; legacy location for discovery |
| `onboarding.tsx` | Filtered scan for NUS UUID + Argon name; device selection |
| `argonUartConnect.ts` | Connect, discover GATT, wait for first valid line (pairing validation) |
| `argonUartStream.ts` | Persistent NOTIFY subscription during dashboard session |
| `argonNordicUart.ts` | UUID constants, device filter, CSV parser |
| `decodeBleCharacteristic.ts` | Base64 → UTF-8 string decode |

### 5.2 Onboarding and Pairing Flow

1. Request BLE permissions.
2. Verify Bluetooth powered on.
3. Scan for devices advertising Nordic UART service (15 s window).
4. User selects device; app connects and waits for first telemetry line (15 s timeout).
5. Store `device_id`, `device_name`, `connected=true` in AsyncStorage.
6. Navigate to calibration → dashboard.

### 5.3 Live Telemetry Hook

`useArgonLiveTelemetry` runs when the dashboard is focused:

- Reconnects to stored `device_id`
- Starts UART stream
- Updates React state for real-time metric cards
- Every **2000 ms**, calls `persistArgonTelemetryRecord` and `postArgonTelemetry`

This decouples UI refresh rate from cloud upload rate while matching firmware cadence.

### 5.4 Local Persistence (Offline-First)

Each sample creates an `ArgonTelemetryRecord` with schema version 1, all parsed metrics, `rawLine`, `receivedAtMs`, `deviceId`, and `deviceName`.

- **Latest snapshot** → fast dashboard reload
- **Outbox queue** → append-only buffer for sync when cloud unavailable

`syncLocalOutboxToSupabase()` uploads pending records and prunes acknowledged entries.

### 5.5 Dashboard Risk Heuristics (Rule-Based Baseline)

Before ML deployment, the app applies threshold rules:

| Signal | Moderate | High |
|--------|----------|------|
| Head acceleration | ≥ 90 | ≥ 120 |
| SpO₂ | < 95% | < 92% |
| Body temp (°F) | ≥ 100 | > 100.4 |

These rules provide an interpretable baseline against which ML models can be compared.

---

## 6. Backend Design

### 6.1 Supabase Architecture

Supabase provides:

- **Authentication** — email/password; `auth.uid()` for user identity
- **PostgreSQL** — relational telemetry storage
- **Row-Level Security (RLS)** — users read/write only their own samples

### 6.2 Database Schema

**Table: `argon_telemetry_samples`**

| Column | Type | Description |
|--------|------|-------------|
| `id` | `bigint` PK | Auto-increment |
| `user_id` | `uuid` FK | Owner (auth.users) |
| `schema_version` | `int` | Payload version (1) |
| `source` | `text` | `argon_nordic_uart` |
| `device_id` | `text` | BLE MAC / identifier |
| `device_name` | `text` | e.g., `Argon` |
| `device_uptime_ms` | `bigint` | Firmware `millis` |
| `metric_v1` | `numeric` | Head acceleration |
| `metric_v2` | `numeric` | Heart rate |
| `csv_raw` | `text` | Original UART line |
| `received_at_ms` | `bigint` | Phone receipt timestamp |
| `created_at` | `timestamptz` | Server insert time |

### 6.3 Ingestion API

Mobile clients insert directly via Supabase client SDK. Each insert includes `user_id`, `schema_version`, `source`, `device_id`, `device_name`, `device_uptime_ms`, `metric_v1`, `metric_v2`, `csv_raw`, and `received_at_ms`.

**Design rationale:** Direct insert reduces custom API surface; RLS enforces security. `csv_raw` preserves full fidelity for ML reprocessing if schema evolves.

### 6.4 History and Analytics Queries

`fetchTelemetryHistory(minutes)` merges:

1. Local outbox (time window or last N samples)
2. Latest local snapshot
3. Supabase rows `WHERE received_at_ms >= since`

Deduplication key: `deviceId:receivedAtMs`.

### 6.5 Future Backend Extensions

- Edge Functions for batch export to data lake (S3 / BigQuery)
- Materialized views for session-level aggregates
- Webhook triggers on high-risk samples for trainer alerts
- Separate `calibration_sessions` table for ground-truth labels

---

## 7. Machine Learning Pipeline

### 7.1 Problem Formulation

**Primary task:** Binary or multi-class classification of windows as `{normal activity, sub-concussive impact, significant impact}`.

**Secondary tasks:**

- Anomaly detection on unexplained HR/SpO₂ deviations
- Regression of impact severity (peak g-force proxy)

### 7.2 Dataset Construction

**Sources:**

1. Supabase export (`argon_telemetry_samples`)
2. Calibration sessions with known activities (clench, sprint, simulated impact)
3. External labeled datasets for transfer learning

**Windowing:**

- Window size: 5–30 s (2–15 samples at 2 s cadence)
- Stride: 50% overlap
- Label assignment: window inherits label if any sample exceeds impact threshold or manual annotation

**Features (per window):**

| Category | Features |
|----------|----------|
| Head accel | mean, max, std, peak-to-peak, rate of change |
| HR | mean, delta from baseline, HRV proxy |
| SpO₂ / temp | min, trend slope |
| Bite force | max, sustained duration above threshold |
| Meta | active_minutes, time since session start |

### 7.3 Training Workflow

```
Export CSV/Parquet from Supabase
        ↓
Clean & parse csv_raw → structured columns
        ↓
Session segmentation (gaps > 5 min)
        ↓
Windowing + feature extraction
        ↓
Train/val/test split (by athlete/session, not random rows)
        ↓
Model training (Random Forest, XGBoost, 1D-CNN)
        ↓
Evaluation: precision, recall, F1, latency
        ↓
Export model (ONNX / TFLite) → optional on-device inference
```

### 7.4 Recommended Models

| Model | Pros | Cons |
|-------|------|------|
| Random Forest / XGBoost | Interpretable, works with small tabular windows | Misses temporal patterns |
| 1D CNN / LSTM | Captures temporal dynamics | Needs more labeled data |
| Isolation Forest | Unsupervised anomaly flag | Higher false positive rate |

**Baseline:** Replicate dashboard thresholds (head_accel ≥ 120 → positive) as a rule classifier; report ML lift over baseline.

### 7.5 Deployment Options

1. **Cloud inference** — Supabase Edge Function or separate API scores incoming streams
2. **Mobile inference** — TFLite model in React Native for sideline offline alerts
3. **Firmware edge** — threshold pre-filter on device; phone receives flagged events only

### 7.6 Ethical and Data Considerations

- Informed consent from athletes/parents (minor data)
- De-identification before research publication
- Avoid deterministic medical claims without clinical validation

---

## 8. Evaluation

### 8.1 BLE Performance Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Connection success rate | > 95% | N pairing attempts in lab |
| Time to first sample | < 5 s | `waitForFirstUartLine` timing |
| Notification delivery rate | > 98% | Compare firmware send count vs. app receive count |
| End-to-end latency | < 3 s | `received_at_ms - device_uptime_ms` (clock skew adjusted) |
| Reconnection after dropout | < 10 s | Intentional range test |

### 8.2 Backend Metrics

| Metric | Target |
|--------|--------|
| Insert success rate (authenticated) | > 99% |
| Outbox sync recovery | 100% after connectivity restore |
| Query latency (5 min history) | < 2 s |

### 8.3 ML Metrics (when labels available)

- Precision, recall, F1 per class
- ROC-AUC for binary impact detection
- Confusion matrix vs. rule-based baseline
- Cross-athlete generalization (leave-one-athlete-out CV)

### 8.4 User Study (Optional)

- Trainers rate alert usefulness (Likert scale)
- Task completion time for onboarding flow

*[Insert your measured results tables and graphs here.]*

---

## 9. Discussion

### 9.1 Achievements

The system demonstrates a complete **hardware → BLE → mobile → cloud** pipeline suitable for iterative research. Nordic UART provides a simple, debuggable transport. Offline outbox pattern improves robustness. Supabase accelerates auth and storage without custom server maintenance.

### 9.2 Challenges Encountered

- **Android BLE discovery** — location permission legacy; incomplete `localName` on first ADV packet (mitigated by service UUID filter)
- **Clock domains** — `millis` (device) vs. `received_at_ms` (phone) require alignment for latency analysis
- **Sparse labels** — real concussion events are rare; calibration and synthetic impacts needed for ML

### 9.3 Comparison to Objectives

| Objective | Status |
|-----------|--------|
| O1 BLE firmware | Implemented |
| O2 Mobile streaming | Implemented |
| O3 Backend ingestion | Implemented |
| O4 ML pipeline | Designed; training [in progress / completed] |
| O5 Evaluation | [Partial / complete] |

---

## 10. Conclusion and Future Work

This thesis presented an integrated approach to athlete telemetry using BLE, mobile computing, cloud persistence, and machine learning. The GuardSync architecture proves that commodity mobile platforms can serve as BLE gateways for mouthguard-class wearables, enabling real-time monitoring and longitudinal data collection.

**Future work:**

1. Increase sampling rate and add raw IMU axes for richer ML features
2. Implement full calibration UI with labeled activity capture
3. BLE bonding and encrypted characteristics for production security
4. iOS build and cross-platform parity
5. Clinical study with certified impact reference instrumentation
6. Deploy trained models with trainer/parent alert workflows
7. Federated learning across teams while preserving privacy

---

## 11. References

1. Bluetooth SIG. *Bluetooth Core Specification*, GATT and BLE profiles.
2. Nordic Semiconductor. *UART Service specification*.
3. Particle Industries. *Argon Datasheet and Device OS BLE APIs*.
4. Bartsch, A., et al. Embedded mouthguard accelerometer for measuring head impacts in sports. *[Add full citation]*
5. Cortes, N., et al. Head impact exposure in collegiate football players. *[Add full citation]*
6. Supabase Documentation. *Row Level Security and JavaScript Client*.
7. React Native BLE PLX. *Library documentation*.

---

## 12. Appendices

### Appendix A — BLE UUID Reference

| Name | UUID |
|------|------|
| Nordic UART Service | `6E400001-B5A3-F393-E0A9-E50E24DCCA9E` |
| UART TX (notify) | `6E400003-B5A3-F393-E0A9-E50E24DCCA9E` |

### Appendix B — Example Backend Payload

```json
{
  "schema_version": 1,
  "source": "argon_nordic_uart",
  "device_id": "AA:BB:CC:DD:EE:FF",
  "device_name": "Argon",
  "device_uptime_ms": 123456,
  "metric_v1": 95,
  "metric_v2": 72,
  "raw_line": "123456,15,95,72,98,98.4,160",
  "received_at_ms": 1735689600000
}
```

### Appendix C — Supabase RLS Policy (example)

```sql
CREATE POLICY "Users insert own telemetry"
ON argon_telemetry_samples FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own telemetry"
ON argon_telemetry_samples FOR SELECT
USING (auth.uid() = user_id);
```

### Appendix D — ML Feature Extraction Pseudocode

```python
def extract_window_features(df_window):
    return {
        "accel_max": df_window["head_acceleration"].max(),
        "accel_std": df_window["head_acceleration"].std(),
        "hr_mean": df_window["heart_rate"].mean(),
        "spo2_min": df_window["spo2"].min(),
        "bite_max": df_window["bite_force"].max(),
    }
```

---

*Document generated for GuardSync thesis project. Replace bracketed placeholders with your institution-specific details and measured results.*
