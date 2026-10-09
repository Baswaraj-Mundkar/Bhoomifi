# BhoomiFi

BhoomiFi is a Next.js dashboard for an ESP32-WROOM-32 smart irrigation device. It supports clearly labeled local Demo Mode and authenticated real-time Firebase/Firestore mode. Live mode begins OFFLINE/Unavailable and never substitutes sample values for missing Firebase telemetry.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Use **Demo Mode** in Settings to run the simulator without Firebase Authentication. Simulated readings and controls are explicitly identified as demo-only.

## Firebase client configuration

The app uses Firebase Web SDK client configuration only. Copy `.env.example` to `.env.local`, supply the Firebase Web API key from Firebase Console → Project settings → General → Your apps, and confirm the remaining values identify the `bhoomifi` project:

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=bhoomifi.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=bhoomifi
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=bhoomifi.firebasestorage.app
NEXT_PUBLIC_FIREBASE_FARM_ID=bhoomifi-farm-01
NEXT_PUBLIC_FIREBASE_DEVICE_ID=BHOOMIFI-ESP32-NODE-01
```

Restart Next.js after changing environment variables. `.env.local` is ignored by Git. `NEXT_PUBLIC_*` values are public browser configuration, not secrets. Never put Firebase Admin credentials or a service-account private key in the frontend, repository, or ESP32 firmware.

## Authentication and ownership setup

1. In Firebase Console, enable **Authentication → Sign-in method → Email/Password** and create the owner account. The web app only signs in/out; it does not provide public registration.
2. Copy the owner's Firebase Auth UID. Provision the farm document with that UID as `ownerUid`.
3. Create a separate Email/Password Auth account dedicated to the ESP32 and copy its Firebase-generated UID. Use it as the device document's `deviceUid`; never reuse the farm owner's UID.
4. Use Firebase Console as the trusted administrator (or another trusted Admin SDK environment) to provision the farm and device records. The app's Firestore rules deny client creation of either record.
5. Deploy the reviewed `firestore.rules` and `firestore.indexes.json` to the `bhoomifi` project. Do not broaden authenticated-user access.

### Firestore paths and records

The schema/path helpers are in `src/data/firebaseSchema.ts`; access control is in `firestore.rules`.

| Purpose | Path | Fields |
| --- | --- | --- |
| Farm | `farms/{farmId}` | `name` (string), `ownerUid` (Firebase Auth UID), `deviceIds` (string array) |
| Device | `devices/{deviceId}` | `deviceName`, `deviceStatus` (`ONLINE`/`OFFLINE`), `lastSeen` (Firestore Timestamp or null before first heartbeat), `firmwareVersion`, `wifiStatus`, `farmId`, `ownerUid`, `deviceUid` |
| Readings | `devices/{deviceId}/readings/{readingId}` | `soilMoisture`, `soilRawADC`, `temperature`, `humidity`, `light`, `timestamp`; optional `pumpStatus` |
| Current state | `devices/{deviceId}/state/current` | `soilMoisture`, `soilRawADC`, `temperature`, `humidity`, `light`, `pumpStatus`, `autoMode`, `deviceStatus`, `lastSeen`, `timestamp` |
| Commands | `devices/{deviceId}/commands/current` | `pumpCommand`, `autoMode`, `minimumMoisture`, `targetMoisture`, `updatedAt` (command fields are optional) |
| Irrigation history | `irrigation_history/{eventId}` | `deviceId`, `action`, `reason`, `soilMoisture`, `timestamp`, `source` (`AUTO`/`MANUAL`) |

Initial IDs are `bhoomifi-farm-01` and `BHOOMIFI-ESP32-NODE-01`. Farm and device ownership links must be consistent: farm `ownerUid` is the web owner; device `farmId` points at that farm; device `ownerUid` matches the owner for consistency; device `deviceUid` is the distinct device account UID; and farm `deviceIds` includes the device ID. Rules authorize farm ownership by looking up `farms/{farmId}.ownerUid` through the device's `farmId`; device identity is checked against `devices/{deviceId}.deviceUid`. The rules do not use the device's `ownerUid` or farm's `deviceIds` field to grant access.

The app starts Firestore listeners only after Firebase Auth confirms a signed-in user. It checks farm/device setup, listens to the current state and the latest 100 timestamped readings and irrigation events, and uses snapshot metadata to report network/cache status. Permission errors are surfaced as setup/access errors; missing records are never fabricated. Sensor values are range-validated before display. Soil moisture is computed from valid raw ADC using `((4095 - rawADC) / (4095 - 700)) * 100`, clamped to 0–100%; a malformed or missing sensor value displays as unavailable. A missing or invalid reported operating mode displays as unavailable; mode toggles and manual pump controls remain disabled until the device reports its mode. Heartbeats up to 90 seconds old display as LIVE/ONLINE, older valid heartbeats as STALE, and no heartbeat or an explicitly offline device as OFFLINE.

## ESP32 hardware and telemetry format

Expected wiring:

- ESP32-WROOM-32
- Capacitive Soil Moisture Sensor v2.0 analog output → GPIO32 / ADC
- DHT11 data → GPIO4
- BH1750 SDA → GPIO21; SCL → GPIO22
- Relay → GPIO25
- LED demonstration output → GPIO26

The device account should write a reading document at `devices/BHOOMIFI-ESP32-NODE-01/readings/{readingId}`. All fields required by the current rules are required:

```json
{
  "soilMoisture": 42.5,
  "soilRawADC": 2651,
  "temperature": 28,
  "humidity": 61,
  "light": 320,
  "pumpStatus": "OFF",
  "timestamp": "<Firestore Timestamp>"
}
```

`soilMoisture` is the calibrated 0–100% value; when valid, the client recalculates it from `soilRawADC`. `pumpStatus` is optional on individual readings but recommended. `timestamp` must be a valid Firestore Timestamp (or another timestamp representation understood by the client). For `state/current`, write all required state fields listed above, including `autoMode`, `deviceStatus`, `lastSeen`, and `timestamp`. Keep the device document's `deviceStatus` and `lastSeen` current; its heartbeat determines freshness. Update the device document only for the permitted heartbeat/status fields.

## Irrigation commands and control

The app writes commands to `devices/BHOOMIFI-ESP32-NODE-01/commands/current`, with `updatedAt` set by Firestore server time. Examples:

```json
{ "autoMode": true, "minimumMoisture": 35, "targetMoisture": 45 }
```

```json
{ "pumpCommand": "START" }
```

Valid one-shot `pumpCommand` values are `START` and `STOP`. The device should consume a pump command, safely apply it according to its local controls, and clear `pumpCommand` to `null` as the rules permit. The app reports commands as pending/unconfirmed until a later telemetry state confirms pump/mode changes. The current schema has no threshold-application acknowledgment field, so threshold changes remain explicitly unconfirmed by device state.

AUTO control must be enforced locally by firmware: turn the pump on below 35% moisture and turn it off at 45%; preserve the hysteresis/hold band between those thresholds. MANUAL mode permits an operator pump command. The relay is GPIO25 and the LED demonstration output is GPIO26. A web command is not proof that hardware operated; the UI waits for device-reported state.

## Firestore security and deployment notes

The existing rules restrict owner access to the farm UID link and device writes to the dedicated device UID. The app cannot create farms/devices. Only deploy security rules after reviewing them in Firebase Console or the Firebase CLI. Client-side Firebase Web configuration is public; device credentials embedded in firmware can be extracted. For a classroom prototype use a dedicated device account and protect its credentials as far as the hardware allows; for production use a trusted provisioning/backend flow rather than distributing reusable device passwords.

No real ESP32 connection is asserted until an authenticated device sends valid, fresh Firestore telemetry.
