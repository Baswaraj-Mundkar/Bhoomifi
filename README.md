This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## BhoomiFi Firebase and sensor data

The app starts in **Live** mode and subscribes to Firestore for the configured device. It shows `LIVE` only while the device heartbeat is fresh; after 90 seconds without a heartbeat it shows `OFFLINE`, keeps the last sensor values, and displays `lastSeen`. The timeout is in `src/data/firebaseService.ts` (`DEVICE_OFFLINE_AFTER_MS`). Select **Demo Mode** in Settings to deliberately use clearly labeled sample readings; simulated data is never presented as live.

### Firebase setup

1. The Firebase web app configuration in `.env.example` targets project `bhoomifi`. Add its Web API key to `NEXT_PUBLIC_FIREBASE_API_KEY` in your local environment; obtain it from Firebase Console → Project settings → General → Your apps. In Firebase Console, open **Authentication → Sign-in method**, enable **Email/Password**, and save. Then open **Authentication → Users → Add user**, enter the first user's email and a strong password, and create the account. Sign in to the app from Settings; public registration and anonymous authentication are not enabled.
2. Copy `.env.example` to `.env.local` and set the Web API key, farm ID, and device ID. These `NEXT_PUBLIC_*` values are public client configuration, not Admin credentials. Never put a service-account key or Firebase Admin credential in this app.
3. Deploy `firestore.rules` and `firestore.indexes.json` to the Firebase project (Firebase CLI: `firebase deploy --only firestore:rules,firestore:indexes`).
4. Provision `farms/{farmId}` and `devices/{deviceId}` from the trusted Firebase Console/Admin environment. Set the farm's `ownerUid` to the Firebase UID shown in Settings, its `deviceIds` to include the device ID, and the device fields `farmId`, `ownerUid`, and `deviceUid`. `deviceUid` must be the UID of the ESP32's dedicated Firebase Auth account. Do not allow client creation of these ownership records.
5. Restart the Next.js app after changing environment variables.

Firestore paths:

- `farms/{farmId}`: `name`, `ownerUid`, `deviceIds`.
- `devices/{deviceId}`: `deviceName`, `deviceStatus`, `lastSeen`, `firmwareVersion`, `wifiStatus`, and ownership links (`farmId`, `ownerUid`, `deviceUid`).
- Sensor data (`sensorData` in the app path map): `devices/{deviceId}/readings/{readingId}` with `soilMoisture`, `soilRawADC`, `temperature`, `humidity`, `light`, `timestamp`; `pumpStatus` is optional for accurately charting pump state alongside each sample.
- `devices/{deviceId}/state/current`: current sensor readings, `pumpStatus`, `autoMode`, `deviceStatus`, `lastSeen`, and `timestamp`.
- Device commands (`deviceCommands` in the app path map): `devices/{deviceId}/commands/current`; the app writes `pumpCommand` (`START`/`STOP`), `autoMode`, `minimumMoisture`, `targetMoisture`, and `updatedAt`. The ESP32 should consume and acknowledge/clear one-shot pump commands.
- `irrigation_history/{eventId}`: `deviceId`, `action`, `reason`, `soilMoisture`, `timestamp`, and `source` (`AUTO`/`MANUAL`).

The browser uses Firebase Email/Password Auth and Firestore client SDK listeners (`onSnapshot`) for current state, the latest 100 timestamped readings, commands, and irrigation history. Sign in and sign out are available in Settings. Firestore listeners start only after Firebase Auth confirms a signed-in user. Start/Stop and AUTO/threshold changes write to `commands/current`; the browser never addresses GPIO directly. Firestore access is unavailable until a signed-in Firebase UID owns the provisioned farm/device. If Firebase is not configured or a listener/write fails, the app shows an explicit connection/error state and Demo Mode remains usable.

The Firestore rules deny client creation of farms/devices. Farm owners can read their own device data and write commands; only the provisioned device UID can write sensor state, readings, and irrigation events. Firebase rules cannot keep a device credential secret if it is embedded in public firmware: use a dedicated device account and protect its credential on the ESP32. For production fleets, use a trusted backend/token provisioning flow instead.

### Hardware and irrigation behavior

HW-080 AOUT → GPIO32 (VCC 3.3V, GND), DHT11 DATA → GPIO4, BH1750 SDA/SCL → GPIO21/GPIO22, relay IN → GPIO25, and demonstration LED → GPIO26. Soil moisture uses the measured calibration `((4095 - rawADC) / (4095 - 700)) * 100`, clamped to 0–100%. AUTO uses 35% minimum and 45% target thresholds. The ESP32 firmware must enforce these thresholds locally so irrigation continues safely without Internet/Firebase; app commands configure/monitor the device and do not replace local control.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
