#include <Arduino.h>
#include <ArduinoJson.h>
#include <BH1750.h>
#include <DHT.h>
#include <esp_system.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <math.h>
#include <time.h>

#if __has_include("secrets.h")
#include "secrets.h"
#else
#include "secrets.example.h"
#endif

namespace {

constexpr uint8_t SOIL_PIN = 32;
constexpr uint8_t DHT_PIN = 4;
constexpr uint8_t LED_TEST_PIN = 26;
constexpr uint8_t DHT_TYPE = DHT11;
constexpr uint32_t SENSOR_INTERVAL_MS = 5000;
constexpr uint32_t COMMAND_POLL_INTERVAL_MS = 2000;
constexpr uint32_t HEARTBEAT_INTERVAL_MS = 30000;
constexpr uint32_t WIFI_RETRY_INTERVAL_MS = 10000;
constexpr uint16_t MOISTURE_DRY_ADC = 4095;
constexpr uint16_t MOISTURE_WET_ADC = 700;
constexpr float DEFAULT_MINIMUM_MOISTURE = 35.0f;
constexpr float DEFAULT_TARGET_MOISTURE = 45.0f;
constexpr char FIRMWARE_VERSION[] = "0.1.0-led-test";

const char GOOGLE_ROOT_CA[] PROGMEM = R"PEM(
-----BEGIN CERTIFICATE-----
MIIFVzCCAz+gAwIBAgINAgPlk28xsBNJiGuiFzANBgkqhkiG9w0BAQwFADBHMQsw
CQYDVQQGEwJVUzEiMCAGA1UEChMZR29vZ2xlIFRydXN0IFNlcnZpY2VzIExMQzEU
MBIGA1UEAxMLR1RTIFJvb3QgUjEwHhcNMTYwNjIyMDAwMDAwWhcNMzYwNjIyMDAw
MDAwWjBHMQswCQYDVQQGEwJVUzEiMCAGA1UEChMZR29vZ2xlIFRydXN0IFNlcnZp
Y2VzIExMQzEUMBIGA1UEAxMLR1RTIFJvb3QgUjEwggIiMA0GCSqGSIb3DQEBAQUA
A4ICDwAwggIKAoICAQC2EQKLHuOhd5s73L+UPreVp0A8of2C+X0yBoJx9vaMf/vo
27xqLpeXo4xL+Sv2sfnOhB2x+cWX3u+58qPpvBKJXqeqUqv4IyfLpLGcY9vXmX7w
Cl7raKb0xlpHDU0QM+NOsROjyBhsS+z8CZDfnWQpJSMHobTSPS5g4M/SCYe7zUjw
TcLCeoiKu7rPWRnWr4+wB7CeMfGCwcDfLqZtbBkOtdh+JhpFAz2weaSUKK0Pfybl
qAj+lug8aJRT7oM6iCsVlgmy4HqMLnXWnOunVmSPlk9orj2XwoSPwLxAwAtcvfaH
szVsrBhQf4TgTM2S0yDpM7xSma8ytSmzJSq0SPly4cpk9+aCEI3oncKKiPo4Zor8
Y/kB+Xj9e1x3+naH+uzfsQ55lVe0vSbv1gHR6xYKu44LtcXFilWr06zqkUspzBmk
MiVOKvFlRNACzqrOSbTqn3yDsEB750Orp2yjj32JgfpMpf/VjsPOS+C12LOORc92
wO1AK/1TD7Cn1TsNsYqiA94xrcx36m97PtbfkSIS5r762DL8EGMUUXLeXdYWk70p
aDPvOmbsB4om3xPXV2V4J95eSRQAogB/mqghtqmxlbCluQ0WEdrHbEg8QOB+DVr
NVjzRlwW5y0vtOUucxD/SVRNuJLDWcfr0wbrM7Rv1/oFB2ACYPTrIrnqYNxgFlQID
AQABo0IwQDAOBgNVHQ8BAf8EBAMCAYYwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4E
FgQU5K8rJnEaK0gnhS9SZizv8IkTcT4wDQYJKoZIhvcNAQEMBQADggIBAJ+qQibb
C5u+/x6Wki4+omVKapi6Ist9wTrYggoGxval3sBOh2Z5ofmmWJyq+bXmYOfg6LEe
QkEzCzc9zolwFcq1JKjPa7XSQCGYzyI0zzvFIoTgxQ6KfF2I5DUkzps+GlQebtuy
h6f88/qBVRRiClmpIgUxPoLW7ttXNLwzldMXG+gnoot7TiYaelpkttGsN/H9oPM4
7HLwEXWdyzRSjeZ2axfG34arJ45JK3VmgRAhpuo+9K4l/3wV3s6MJT/KYnAK9y8J
ZgfIPxz88NtFMN9iiMG1D53Dn0reWVlHxYciNuaCp+0KueIHoI17eko8cdLiA6Ef
MgfdG+RCzgwARWGAtQsgWSl4vflVy2PFPEz0tv/bal8xa5meLMFrUKTX5hgUvYU/
Z6tGn6D/Qqc6f1zLXbBwHSs09dR2CQzreExZBfMzQsNhFRAbd03OIozUhfJFfbdT
6u9AWpQKXCBfTkBdYiJ23//OYb2MI3jSNwLgjt7RETeJ9r/tSQdirpLsQBqvFAnZ
0E6yove+7u7Y/9waLd64NnHi/Hm3lCXRSHNboTXns5lndcEZOitHTtNCjv0xyBZm
2tIMPNuzjsmhDYAPexZ3FL//2wmUspO8IFgV6dtxQ/PeEMMA3KgqlbbC1j+Qa3bb
bP6MvPJwNQzcmRk13NfIRmPVNnGuV/u3gm3c
-----END CERTIFICATE-----
    )PEM";

DHT dht(DHT_PIN, DHT_TYPE);
BH1750 lightSensor;
String idToken;
String refreshToken;
uint32_t tokenExpiresAt = 0;
uint32_t lastSensorAt = 0;
uint32_t lastCommandPollAt = 0;
uint32_t lastHeartbeatAt = 0;
uint32_t lastWifiAttemptAt = 0;
uint32_t lastClockAttemptAt = 0;
uint32_t nextAuthAttemptAt = 0;
bool authRetryScheduled = false;
float minimumMoisture = DEFAULT_MINIMUM_MOISTURE;
float targetMoisture = DEFAULT_TARGET_MOISTURE;
bool autoMode = true;
bool configurationIsReady = false;
bool requestedLedOn = false;
bool sensorHealthy = false;
bool lightSensorReady = false;
float currentMoisture = NAN;

String firestoreBaseUrl() {
  return String("https://firestore.googleapis.com/v1/projects/")
    + FIREBASE_PROJECT_ID + "/databases/(default)/documents";
}

String deviceDocumentPath() {
  return String("/devices/") + FIREBASE_DEVICE_ID;
}

bool isPlaceholder(const char* value) {
  return value == nullptr
    || value[0] == '\0'
    || String(value).startsWith("REPLACE_WITH_");
}

bool configurationReady() {
  return !isPlaceholder(WIFI_SSID)
    && !isPlaceholder(WIFI_PASSWORD)
    && !isPlaceholder(FIREBASE_API_KEY)
    && !isPlaceholder(FIREBASE_PROJECT_ID)
    && !isPlaceholder(FIREBASE_DEVICE_ID)
    && !isPlaceholder(FIREBASE_DEVICE_EMAIL)
    && !isPlaceholder(FIREBASE_DEVICE_PASSWORD)
    && !isPlaceholder(FIREBASE_DEVICE_UID);
}

String urlEncode(const String& value) {
  static const char hex[] = "0123456789ABCDEF";
  String encoded;
  for (size_t i = 0; i < value.length(); ++i) {
    const uint8_t c = static_cast<uint8_t>(value[i]);
    if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')
        || (c >= '0' && c <= '9') || c == '-' || c == '_' || c == '.'
        || c == '~') {
      encoded += static_cast<char>(c);
    } else {
      encoded += '%';
      encoded += hex[c >> 4];
      encoded += hex[c & 0x0F];
    }
  }
  return encoded;
}

String randomDocumentId() {
  static constexpr char ALPHABET[] =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  char documentId[21];
  for (size_t i = 0; i < sizeof(documentId) - 1; ++i) {
    documentId[i] = ALPHABET[esp_random() % (sizeof(ALPHABET) - 1)];
  }
  documentId[sizeof(documentId) - 1] = '\0';
  return String(documentId);
}

void logHttpFailure(const String& label, int status, const String& response) {
  Serial.printf("%s failed (HTTP %d)", label.c_str(), status);
  if (response.length() > 0) {
    Serial.printf(": %s", response.c_str());
  }
  Serial.println();
}

int httpsRequest(
  const char* method,
  const String& url,
  const String& body,
  const char* contentType,
  bool authorized,
  String& response,
  bool logNotFound = true
) {
  WiFiClientSecure client;
  client.setCACert(GOOGLE_ROOT_CA);

  HTTPClient https;
  https.setTimeout(12000);
  if (!https.begin(client, url)) {
    Serial.printf("%s request could not be started.\n", method);
    return -1;
  }

  https.addHeader("Content-Type", contentType);
  if (authorized) {
    if (idToken.isEmpty()) {
      https.end();
      Serial.println("Firestore request skipped: no Firebase ID token.");
      return -1;
    }
    https.addHeader("Authorization", String("Bearer ") + idToken);
  }

  int status;
  if (strcmp(method, "GET") == 0) {
    status = https.GET();
  } else {
    status = https.sendRequest(method, body);
  }
  response = status > 0 ? https.getString() : "";
  https.end();

  if (status < 0) {
    Serial.printf("%s request failed: %s\n", method, HTTPClient::errorToString(status).c_str());
  } else if (status >= 400 && (status != 404 || logNotFound)) {
    logHttpFailure(method, status, response);
  }
  return status;
}

bool parseJsonResponse(const String& response, JsonDocument& document, const char* operation) {
  const DeserializationError error = deserializeJson(document, response);
  if (error) {
    Serial.printf("%s returned invalid JSON: %s\n", operation, error.c_str());
    return false;
  }
  return true;
}

bool syncClock() {
  lastClockAttemptAt = millis();
  configTime(0, 0, "pool.ntp.org", "time.google.com");
  const uint32_t startedAt = millis();
  while (time(nullptr) < 1700000000 && millis() - startedAt < 30000) {
    delay(250);
  }
  if (time(nullptr) < 1700000000) {
    Serial.println("NTP time unavailable; HTTPS is blocked until the clock is valid.");
    return false;
  }
  return true;
}

bool signInDevice() {
  JsonDocument request;
  request["email"] = FIREBASE_DEVICE_EMAIL;
  request["password"] = FIREBASE_DEVICE_PASSWORD;
  request["returnSecureToken"] = true;
  String body;
  serializeJson(request, body);

  String response;
  const String url = String("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=")
    + urlEncode(FIREBASE_API_KEY);
  const int status = httpsRequest("POST", url, body, "application/json", false, response);
  if (status < 200 || status >= 300) return false;

  JsonDocument result;
  if (!parseJsonResponse(response, result, "Firebase sign-in")) return false;
  const char* returnedUid = result["localId"] | "";
  if (String(returnedUid) != FIREBASE_DEVICE_UID) {
    Serial.println("Firebase sign-in UID does not match FIREBASE_DEVICE_UID; refusing to write.");
    return false;
  }

  idToken = result["idToken"] | "";
  refreshToken = result["refreshToken"] | "";
  const uint32_t expiresInSeconds = String(result["expiresIn"] | "3600").toInt();
  if (idToken.isEmpty() || refreshToken.isEmpty() || expiresInSeconds == 0) {
    Serial.println("Firebase sign-in response is missing a token or expiry.");
    idToken = "";
    refreshToken = "";
    return false;
  }
  tokenExpiresAt = millis() + (expiresInSeconds * 1000UL);
  Serial.println("Authenticated as the configured ESP32 device account.");
  return true;
}

bool refreshDeviceToken() {
  const String body = String("grant_type=refresh_token&refresh_token=") + urlEncode(refreshToken);
  String response;
  const String url = String("https://securetoken.googleapis.com/v1/token?key=")
    + urlEncode(FIREBASE_API_KEY);
  const int status = httpsRequest(
    "POST", url, body, "application/x-www-form-urlencoded", false, response
  );
  if (status < 200 || status >= 300) return false;

  JsonDocument result;
  if (!parseJsonResponse(response, result, "Firebase token refresh")) return false;
  const char* returnedUid = result["user_id"] | "";
  if (String(returnedUid) != FIREBASE_DEVICE_UID) {
    Serial.println("Refreshed token UID does not match FIREBASE_DEVICE_UID; refusing to write.");
    idToken = "";
    refreshToken = "";
    return false;
  }

  idToken = result["id_token"] | "";
  refreshToken = result["refresh_token"] | refreshToken;
  const uint32_t expiresInSeconds = String(result["expires_in"] | "3600").toInt();
  if (idToken.isEmpty() || expiresInSeconds == 0) {
    Serial.println("Firebase token refresh response is missing a token or expiry.");
    idToken = "";
    return false;
  }
  tokenExpiresAt = millis() + (expiresInSeconds * 1000UL);
  Serial.println("Firebase device token refreshed.");
  return true;
}

bool ensureDeviceAuth() {
  if (WiFi.status() != WL_CONNECTED) return false;
  const uint32_t now = millis();
  if (authRetryScheduled && static_cast<int32_t>(now - nextAuthAttemptAt) < 0) {
    return false;
  }

  bool authenticated = true;
  if (idToken.isEmpty()) {
    authenticated = signInDevice();
  } else if (static_cast<int32_t>(now - (tokenExpiresAt - 60000UL)) >= 0) {
    authenticated = refreshDeviceToken();
  }
  if (!authenticated) {
    nextAuthAttemptAt = now + 15000;
    authRetryScheduled = true;
    return false;
  }
  authRetryScheduled = false;
  return true;
}

bool firestorePatch(
  const String& documentPath,
  const String& updateMask,
  const String& body,
  const String& updateTime = ""
) {
  String url = firestoreBaseUrl() + documentPath + "?updateMask.fieldPaths=" + updateMask;
  if (!updateTime.isEmpty()) {
    url += "&currentDocument.updateTime=" + urlEncode(updateTime);
  }
  String response;
  const int status = httpsRequest("PATCH", url, body, "application/json", true, response);
  return status >= 200 && status < 300;
}

bool firestoreGet(const String& documentPath, String& response, bool quietNotFound = false) {
  const int status = httpsRequest(
    "GET", firestoreBaseUrl() + documentPath, "", "application/json", true, response,
    !quietNotFound
  );
  return status >= 200 && status < 300;
}

bool firestoreCreateReading(const String& body) {
  const String url = firestoreBaseUrl() + deviceDocumentPath()
    + "/readings?documentId=" + randomDocumentId();
  String response;
  const int status = httpsRequest("POST", url, body, "application/json", true, response);
  return status >= 200 && status < 300;
}

bool firestoreCreateIrrigationEvent(const String& body) {
  const String url = firestoreBaseUrl()
    + "/irrigation_history?documentId=" + randomDocumentId();
  String response;
  const int status = httpsRequest("POST", url, body, "application/json", true, response);
  return status >= 200 && status < 300;
}

bool readTimestamp(String& timestamp) {
  const time_t now = time(nullptr);
  if (now < 1700000000) {
    Serial.println("Cannot write telemetry: system clock is not synchronized.");
    return false;
  }
  struct tm utc;
  gmtime_r(&now, &utc);
  char formatted[25];
  if (strftime(formatted, sizeof(formatted), "%Y-%m-%dT%H:%M:%SZ", &utc) == 0) {
    Serial.println("Cannot format the current UTC timestamp.");
    return false;
  }
  timestamp = formatted;
  return true;
}

String makeTelemetryBody(
  uint16_t rawAdc,
  float moisture,
  float temperature,
  float humidity,
  float light,
  const String& timestamp
) {
  JsonDocument document;
  JsonObject fields = document["fields"].to<JsonObject>();
  fields["soilMoisture"]["doubleValue"] = moisture;
  fields["soilRawADC"]["integerValue"] = String(rawAdc);
  fields["temperature"]["doubleValue"] = temperature;
  fields["humidity"]["doubleValue"] = humidity;
  fields["light"]["doubleValue"] = light;
  fields["pumpStatus"]["stringValue"] = requestedLedOn ? "ON" : "OFF";
  fields["timestamp"]["timestampValue"] = timestamp;
  String body;
  serializeJson(document, body);
  return body;
}

String makeCurrentStateBody(
  uint16_t rawAdc,
  float moisture,
  float temperature,
  float humidity,
  float light,
  const String& timestamp
) {
  JsonDocument document;
  JsonObject fields = document["fields"].to<JsonObject>();
  fields["soilMoisture"]["doubleValue"] = moisture;
  fields["soilRawADC"]["integerValue"] = String(rawAdc);
  fields["temperature"]["doubleValue"] = temperature;
  fields["humidity"]["doubleValue"] = humidity;
  fields["light"]["doubleValue"] = light;
  fields["pumpStatus"]["stringValue"] = requestedLedOn ? "ON" : "OFF";
  fields["autoMode"]["booleanValue"] = autoMode;
  fields["deviceStatus"]["stringValue"] = "ONLINE";
  fields["lastSeen"]["timestampValue"] = timestamp;
  fields["timestamp"]["timestampValue"] = timestamp;
  String body;
  serializeJson(document, body);
  return body;
}

String makeHeartbeatBody(const String& timestamp) {
  JsonDocument document;
  JsonObject fields = document["fields"].to<JsonObject>();
  fields["deviceStatus"]["stringValue"] = "ONLINE";
  fields["lastSeen"]["timestampValue"] = timestamp;
  fields["firmwareVersion"]["stringValue"] = FIRMWARE_VERSION;
  fields["wifiStatus"]["stringValue"] = WiFi.SSID();
  String body;
  serializeJson(document, body);
  return body;
}

String makeIrrigationEventBody(bool ledOn, const char* reason) {
  String timestamp;
  if (!readTimestamp(timestamp)) return "";

  JsonDocument document;
  JsonObject fields = document["fields"].to<JsonObject>();
  fields["deviceId"]["stringValue"] = FIREBASE_DEVICE_ID;
  fields["action"]["stringValue"] = ledOn ? "START" : "STOP";
  fields["reason"]["stringValue"] = reason;
  fields["soilMoisture"]["doubleValue"] = currentMoisture;
  fields["timestamp"]["timestampValue"] = timestamp;
  fields["source"]["stringValue"] = autoMode ? "AUTO" : "MANUAL";
  String body;
  serializeJson(document, body);
  return body;
}

void setLedState(bool ledOn, const char* reason) {
  if (requestedLedOn == ledOn) return;
  requestedLedOn = ledOn;
  digitalWrite(LED_TEST_PIN, requestedLedOn ? HIGH : LOW);

  if (!sensorHealthy || !isfinite(currentMoisture) || !ensureDeviceAuth()) return;
  const String body = makeIrrigationEventBody(ledOn, reason);
  if (body.isEmpty() || !firestoreCreateIrrigationEvent(body)) {
    Serial.println("LED state changed, but its irrigation history event could not be saved.");
  }
}

bool publishHeartbeat() {
  String timestamp;
  if (!readTimestamp(timestamp)) return false;
  return firestorePatch(
    deviceDocumentPath(),
    "deviceStatus&updateMask.fieldPaths=lastSeen&updateMask.fieldPaths=firmwareVersion&updateMask.fieldPaths=wifiStatus",
    makeHeartbeatBody(timestamp)
  );
}

bool publishTelemetry(
  uint16_t rawAdc,
  float moisture,
  float temperature,
  float humidity,
  float light
) {
  String timestamp;
  if (!readTimestamp(timestamp)) return false;

  const String readingBody = makeTelemetryBody(
    rawAdc, moisture, temperature, humidity, light, timestamp
  );
  if (!firestoreCreateReading(readingBody)) return false;

  const String stateBody = makeCurrentStateBody(
    rawAdc, moisture, temperature, humidity, light, timestamp
  );
  return firestorePatch(
    deviceDocumentPath() + "/state/current",
    "soilMoisture&updateMask.fieldPaths=soilRawADC&updateMask.fieldPaths=temperature"
      "&updateMask.fieldPaths=humidity&updateMask.fieldPaths=light"
      "&updateMask.fieldPaths=pumpStatus&updateMask.fieldPaths=autoMode"
      "&updateMask.fieldPaths=deviceStatus&updateMask.fieldPaths=lastSeen"
      "&updateMask.fieldPaths=timestamp",
    stateBody
  );
}

bool readFirestoreNumber(JsonObjectConst fields, const char* name, float& value) {
  const JsonObjectConst field = fields[name].as<JsonObjectConst>();
  if (field.isNull()) return false;
  if (field["doubleValue"].is<float>() || field["doubleValue"].is<double>()) {
    value = field["doubleValue"].as<float>();
    return isfinite(value);
  }
  if (!field["integerValue"].isNull()) {
    value = String(field["integerValue"].as<const char*>()).toFloat();
    return isfinite(value);
  }
  return false;
}

void clearOneShotCommand(const String& updateTime) {
  if (updateTime.isEmpty()) {
    Serial.println("Cannot safely clear pumpCommand: Firestore did not return updateTime.");
    return;
  }
  JsonDocument body;
  body["fields"]["pumpCommand"]["nullValue"] = nullptr;
  String serialized;
  serializeJson(body, serialized);
  if (!firestorePatch(
        deviceDocumentPath() + "/commands/current",
        "pumpCommand",
        serialized,
        updateTime
      )) {
    Serial.println("Pump command changed before it could be cleared; it will be checked again.");
  }
}

void applyIrrigationControl() {
  if (!sensorHealthy || !isfinite(currentMoisture)) {
    setLedState(false, "LED turned off because sensor data is unavailable");
  } else if (autoMode) {
    if (currentMoisture < minimumMoisture) {
      setLedState(true, "AUTO moisture below minimum threshold");
    } else if (currentMoisture >= targetMoisture) {
      setLedState(false, "AUTO target moisture reached");
    }
  }
}

void pollCommands() {
  String response;
  if (!firestoreGet(deviceDocumentPath() + "/commands/current", response, true)) return;

  JsonDocument document;
  if (!parseJsonResponse(response, document, "Firestore command read")) return;
  const JsonObjectConst fields = document["fields"].as<JsonObjectConst>();
  const String updateTime = document["updateTime"] | "";

  const JsonObjectConst modeField = fields["autoMode"].as<JsonObjectConst>();
  if (!modeField.isNull() && modeField["booleanValue"].is<bool>()) {
    autoMode = modeField["booleanValue"].as<bool>();
  }

  float nextMinimum = minimumMoisture;
  float nextTarget = targetMoisture;
  const bool hasMinimum = readFirestoreNumber(fields, "minimumMoisture", nextMinimum);
  const bool hasTarget = readFirestoreNumber(fields, "targetMoisture", nextTarget);
  const bool invalidMinimum = !fields["minimumMoisture"].isNull() && !hasMinimum;
  const bool invalidTarget = !fields["targetMoisture"].isNull() && !hasTarget;
  if (invalidMinimum || invalidTarget) {
    Serial.println("Ignoring malformed moisture thresholds in the command document.");
  } else if ((hasMinimum || hasTarget)
      && nextMinimum >= 0.0f && nextMinimum < nextTarget
      && nextTarget <= 100.0f) {
    minimumMoisture = nextMinimum;
    targetMoisture = nextTarget;
  } else if (hasMinimum || hasTarget) {
    Serial.println("Ignoring invalid moisture thresholds; minimum must be below target (0-100%).");
  }

  const JsonObjectConst pumpField = fields["pumpCommand"].as<JsonObjectConst>();
  const char* pumpCommand = pumpField["stringValue"] | "";
  if (strcmp(pumpCommand, "START") == 0 || strcmp(pumpCommand, "STOP") == 0) {
    if (autoMode) {
      Serial.println("Ignoring manual pump command while AUTO mode is active.");
      clearOneShotCommand(updateTime);
    } else if (!sensorHealthy) {
      Serial.println("Keeping manual LED command pending until a valid sensor sample is available.");
    } else {
      const bool ledOn = strcmp(pumpCommand, "START") == 0;
      setLedState(ledOn, ledOn ? "Manual LED START command" : "Manual LED STOP command");
      Serial.printf("Manual LED test command: %s\n", pumpCommand);
      clearOneShotCommand(updateTime);
    }
  }

  applyIrrigationControl();
}

bool validSensorReading(
  float temperature,
  float humidity,
  float light
) {
  return isfinite(temperature) && temperature >= 0.0f && temperature <= 50.0f
    && isfinite(humidity) && humidity >= 0.0f && humidity <= 100.0f
    && isfinite(light) && light >= 0.0f && light <= 65535.0f;
}

void sampleAndPublish() {
  uint32_t adcTotal = 0;
  for (uint8_t i = 0; i < 16; ++i) {
    adcTotal += analogRead(SOIL_PIN);
    delay(2);
  }
  const uint16_t rawAdc = static_cast<uint16_t>(adcTotal / 16);
  const float temperature = dht.readTemperature();
  const float humidity = dht.readHumidity();
  const float light = lightSensorReady ? lightSensor.readLightLevel() : NAN;

  sensorHealthy = validSensorReading(temperature, humidity, light);
  if (!sensorHealthy || rawAdc > 4095) {
    sensorHealthy = false;
    currentMoisture = NAN;
    applyIrrigationControl();
    Serial.println("Sensor sample invalid; LED set OFF and telemetry sample skipped.");
    return;
  }

  currentMoisture = constrain(
    ((static_cast<float>(MOISTURE_DRY_ADC) - rawAdc)
      / (MOISTURE_DRY_ADC - MOISTURE_WET_ADC)) * 100.0f,
    0.0f,
    100.0f
  );
  applyIrrigationControl();

  Serial.printf(
    "ADC %u | soil %.1f%% | %.1f C | %.1f%% RH | %.0f lux | AUTO %s | LED %s\n",
    rawAdc,
    currentMoisture,
    temperature,
    humidity,
    light,
    autoMode ? "ON" : "OFF",
    requestedLedOn ? "ON" : "OFF"
  );

  if (!ensureDeviceAuth()) return;
  if (!publishTelemetry(rawAdc, currentMoisture, temperature, humidity, light)) {
    Serial.println("Telemetry write failed; check the device account, Firestore rules, and network.");
  }
}

void maintainWifi() {
  if (WiFi.status() == WL_CONNECTED || millis() - lastWifiAttemptAt < WIFI_RETRY_INTERVAL_MS) {
    return;
  }
  lastWifiAttemptAt = millis();
  Serial.println("Reconnecting to configured Wi-Fi...");
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

}  // namespace

void setup() {
  Serial.begin(115200);
  pinMode(LED_TEST_PIN, OUTPUT);
  digitalWrite(LED_TEST_PIN, LOW);
  analogReadResolution(12);
  dht.begin();
  Wire.begin(21, 22);
  lightSensorReady = lightSensor.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);

  Serial.println();
  Serial.println("BhoomiFi ESP32 LED-only irrigation test firmware");
  Serial.println("GPIO26 is the test indicator; GPIO25 relay and pump are not used.");
  configurationIsReady = configurationReady();
  if (!configurationIsReady) {
    Serial.println("Configuration incomplete. Copy secrets.example.h to secrets.h and fill its local values.");
    return;
  }
  if (!lightSensorReady) {
    Serial.println("BH1750 not detected; no complete sensor samples will be published.");
  }

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  const uint32_t startedAt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startedAt < 30000) {
    delay(500);
    Serial.print('.');
  }
  Serial.println();
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi is unavailable. The firmware will retry in the background.");
    return;
  }
  Serial.printf("Connected to Wi-Fi; IP %s\n", WiFi.localIP().toString().c_str());
  syncClock();
}

void loop() {
  if (!configurationIsReady) {
    delay(1000);
    return;
  }
  maintainWifi();
  if (WiFi.status() != WL_CONNECTED) {
    delay(50);
    return;
  }

  if (time(nullptr) < 1700000000
      && millis() - lastClockAttemptAt >= 60000) {
    syncClock();
  }
  if (!ensureDeviceAuth()) {
    delay(250);
    return;
  }

  const uint32_t now = millis();
  if (now - lastCommandPollAt >= COMMAND_POLL_INTERVAL_MS) {
    lastCommandPollAt = now;
    pollCommands();
  }
  if (now - lastSensorAt >= SENSOR_INTERVAL_MS) {
    lastSensorAt = now;
    sampleAndPublish();
  }
  if (now - lastHeartbeatAt >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatAt = now;
    if (!publishHeartbeat()) {
      Serial.println("Device heartbeat write failed.");
    }
  }
  delay(20);
}
