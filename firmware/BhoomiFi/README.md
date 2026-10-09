# BhoomiFi ESP32 LED-only firmware test

This Arduino IDE sketch matches the web app's Firestore paths and field names. It is intentionally an **LED-only irrigation test**: GPIO26 indicates the requested pump state, while GPIO25 and any pump relay are never configured or driven by this firmware. Do not connect a pump expecting this version to operate it.

## Hardware

- ESP32-WROOM-32
- Capacitive soil moisture sensor analog output → GPIO32; power from 3.3 V and GND
- DHT11 data → GPIO4
- BH1750 SDA → GPIO21; SCL → GPIO22
- Test LED (with a suitable current-limiting resistor) → GPIO26

Keep mains voltage and the pump disconnected during this test. The LED output is active-high. Confirm the ESP32 pin voltage and LED/resistor wiring before powering the board.

## Arduino IDE setup

1. Install the Espressif ESP32 Arduino board package and select the correct ESP32-WROOM-32 board/port.
2. Install these Arduino libraries:
   - ArduinoJson 7
   - DHT sensor library by Adafruit
   - Adafruit Unified Sensor
   - BH1750 by Christopher Laws
3. Copy `secrets.example.h` to `secrets.h` in this sketch folder. Fill in Wi-Fi credentials, the Firebase Web API key, and the dedicated Firebase device account's email, password, and Auth UID. `secrets.h` is ignored by Git; do not commit it or share firmware binaries containing device credentials.
4. Use the project ID and device ID from the web app's `.env.local`. The defaults in the example file match the documented `bhoomifi` project and `BHOOMIFI-ESP32-NODE-01` device.
5. Verify the Firebase project has Email/Password Authentication enabled and that this device account's UID exactly matches `deviceUid` on the device record. Provision the farm/device documents and deploy the repository's Firestore rules and indexes first.
6. Open `BhoomiFi.ino`, compile, upload, and open Serial Monitor at 115200 baud.

The Web API key is public Firebase client configuration, not a service-account credential. Never put Firebase Admin credentials or service-account private keys in firmware. The device password and refresh token are still extractable from physical hardware; use a dedicated, least-privilege device account and revoke it if the board is lost.

## Firestore behavior

The sketch signs in through Firebase Auth REST, refreshes its ID token, and uses authenticated Firestore REST requests. It writes:

- `devices/{deviceId}/readings/{generatedId}` with `soilMoisture`, `soilRawADC`, `temperature`, `humidity`, `light`, `pumpStatus`, and a Firestore `timestamp`.
- `devices/{deviceId}/state/current` with those telemetry fields plus `autoMode`, `deviceStatus`, `lastSeen`, and `timestamp`.
- `devices/{deviceId}` heartbeat/status fields `deviceStatus`, `lastSeen`, `firmwareVersion`, and `wifiStatus`.
- `irrigation_history/{eventId}` on LED state transitions with `deviceId`, `action`, `reason`, `soilMoisture`, `timestamp`, and `source` (`AUTO` or `MANUAL`).
- Reads `devices/{deviceId}/commands/current`; accepts `autoMode`, `minimumMoisture`, `targetMoisture`, and one-shot `pumpCommand`. It clears a consumed pump command to `null` using Firestore's `updateTime` precondition so a concurrent newer command is not erased.

Reading IDs are 20-character alphanumeric random values to reduce document-ID collisions. `pumpStatus` in this test firmware reports the **LED indicator state**, not a measured pump or relay state. AUTO mode turns the LED on below the minimum threshold, turns it off at or above the target, and holds its prior state in between. MANUAL mode accepts `START` and `STOP` as LED commands; a command remains pending until a valid sensor sample is available. An invalid sensor sample forces the LED off and is not written as fabricated telemetry.

Soil moisture uses the same initial calibration as the web app: `((4095 - rawADC) / (4095 - 700)) * 100`, clamped to 0–100%. Calibrate `MOISTURE_DRY_ADC` and `MOISTURE_WET_ADC` for the specific sensor and soil before relying on readings. The BH1750 and DHT11 must both return in-range values before a complete telemetry sample is sent.

## Initial test

1. Keep the pump and relay disconnected.
2. Upload with valid device credentials and sensor wiring.
3. Confirm Serial Monitor reports Firebase authentication, sensor values, and successful Firestore writes without HTTP errors.
4. Confirm fresh `state/current` telemetry appears in the web app after signing in as the farm owner.
5. In the app, switch to MANUAL and send START/STOP. Verify only the GPIO26 LED responds and that the app reflects the later device-reported state.
6. To test AUTO safely, adjust the soil sensor input across the configured thresholds and verify the LED turns on below the minimum, turns off at the target, and holds state between thresholds.

Only consider relay/pump integration after separately reviewing the firmware safety controls, relay electrical isolation, power supply, pump behavior, and fail-safe states. This LED test version does not implement or verify those controls.
