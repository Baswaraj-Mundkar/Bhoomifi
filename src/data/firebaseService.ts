'use client';

import {
  Timestamp,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { FirebaseDeviceCommand, IrrigationLog, SensorHistoryPoint } from '@/types';
import { moisturePercentFromAdc } from '@/data/sensorModel';
import { FIREBASE_PATHS } from '@/data/firebaseSchema';

export const DEVICE_OFFLINE_AFTER_MS = 90_000;

type RecordData = Record<string, unknown>;

interface FirebaseTelemetry {
  soilMoisture: number | null;
  soilRawADC: number | null;
  temperature: number | null;
  humidity: number | null;
  light: number | null;
  pumpStatus: 'ON' | 'OFF' | null;
  autoMode: boolean;
  deviceStatus: 'ONLINE' | 'OFFLINE';
  timestamp: string | null;
  lastSeen: string | null;
  minMoistureThreshold: number;
  targetMoistureThreshold: number;
}

export interface FirebaseDeviceInfo {
  deviceName: string;
  firmwareVersion: string;
  wifiSSID: string;
}

interface DeviceListeners {
  onTelemetry: (telemetry: FirebaseTelemetry) => void;
  onHistory: (history: SensorHistoryPoint[]) => void;
  onIrrigationHistory: (logs: IrrigationLog[]) => void;
  onDeviceInfo: (info: FirebaseDeviceInfo) => void;
  onError: (error: Error) => void;
}

function isRecord(value: unknown): value is RecordData {
  return typeof value === 'object' && value !== null;
}

function numeric(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function timestampMillis(value: unknown): number | null {
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 1_000_000_000_000 ? value * 1000 : value;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (isRecord(value) && typeof value.seconds === 'number') {
    return value.seconds * 1000 + (typeof value.nanoseconds === 'number' ? value.nanoseconds / 1_000_000 : 0);
  }
  return null;
}

function isoTimestamp(value: unknown): string | null {
  const millis = timestampMillis(value);
  return millis === null ? null : new Date(millis).toISOString();
}

function pumpStatus(value: unknown): 'ON' | 'OFF' | null {
  return value === 'ON' || value === 'OFF' ? value : null;
}

function historyPoint(data: RecordData): SensorHistoryPoint | null {
  const timestamp = isoTimestamp(data.timestamp);
  const soilRawADC = numeric(data.soilRawADC);
  const soilMoisture = soilRawADC === null
    ? numeric(data.soilMoisture)
    : moisturePercentFromAdc(soilRawADC);
  const temperature = numeric(data.temperature);
  const humidity = numeric(data.humidity);
  const light = numeric(data.light);
  if (
    timestamp === null
    || soilMoisture === null
    || temperature === null
    || humidity === null
    || light === null
  ) return null;

  return {
    timestamp,
    time: timestamp.slice(11, 16),
    soilMoisture,
    temperature,
    humidity,
    light,
    pumpStatus: pumpStatus(data.pumpStatus)
  };
}

function makeTelemetry(
  deviceData: RecordData,
  stateData: RecordData,
  latestReading: RecordData,
  commandData: RecordData,
  now: number
): FirebaseTelemetry {
  const firstDefined = (key: string) => stateData[key] ?? latestReading[key];
  const rawADC = numeric(firstDefined('soilRawADC'));
  const reportedMoisture = numeric(firstDefined('soilMoisture'));
  const lastSeenValue = deviceData.lastSeen ?? stateData.lastSeen ?? stateData.timestamp ?? latestReading.timestamp;
  const lastSeen = isoTimestamp(lastSeenValue);
  const lastSeenMillis = timestampMillis(lastSeenValue);
  const explicitlyOffline = deviceData.deviceStatus === 'OFFLINE' || stateData.deviceStatus === 'OFFLINE';

  return {
    soilMoisture: rawADC === null
      ? reportedMoisture
      : moisturePercentFromAdc(rawADC),
    soilRawADC: rawADC,
    temperature: numeric(firstDefined('temperature')),
    humidity: numeric(firstDefined('humidity')),
    light: numeric(firstDefined('light')),
    pumpStatus: pumpStatus(stateData.pumpStatus ?? latestReading.pumpStatus),
    autoMode: typeof stateData.autoMode === 'boolean'
      ? stateData.autoMode
      : typeof commandData.autoMode === 'boolean' ? commandData.autoMode : true,
    deviceStatus: !explicitlyOffline
      && lastSeenMillis !== null
      && now - lastSeenMillis <= DEVICE_OFFLINE_AFTER_MS
      ? 'ONLINE'
      : 'OFFLINE',
    timestamp: isoTimestamp(stateData.timestamp ?? latestReading.timestamp),
    lastSeen,
    minMoistureThreshold: numeric(commandData.minimumMoisture) ?? 35,
    targetMoistureThreshold: numeric(commandData.targetMoisture) ?? 45
  };
}

function irrigationLog(id: string, data: RecordData): IrrigationLog | null {
  const millis = timestampMillis(data.timestamp);
  const soilMoisture = numeric(data.soilMoisture);
  if (millis === null || soilMoisture === null) return null;
  const action = typeof data.action === 'string' ? data.action : 'PUMP_EVENT';
  const mode = data.source === 'MANUAL' ? 'MANUAL' : 'AUTO';
  const isStop = /stop|off/i.test(action);

  return {
    id,
    timestamp: new Date(millis).toLocaleString(),
    startedAt: isStop ? undefined : millis,
    mode,
    durationSeconds: 0,
    triggerReason: typeof data.reason === 'string' ? data.reason : action,
    startMoisture: soilMoisture,
    endMoisture: soilMoisture,
    status: isStop ? 'Completed' : 'Active'
  };
}

export function subscribeToFirebaseDevice(
  db: Firestore,
  deviceId: string,
  listeners: DeviceListeners
): () => void {
  let deviceData: RecordData = {};
  let stateData: RecordData = {};
  let latestReading: RecordData = {};
  let commandData: RecordData = {};

  const emitTelemetry = () => {
    listeners.onTelemetry(makeTelemetry(deviceData, stateData, latestReading, commandData, Date.now()));
  };
  const fail = (error: Error) => listeners.onError(error);

  const unsubscribeDevice = onSnapshot(
    doc(db, FIREBASE_PATHS.device(deviceId)),
    (snapshot) => {
      deviceData = snapshot.exists() ? snapshot.data() : {};
      listeners.onDeviceInfo({
        deviceName: typeof deviceData.deviceName === 'string' ? deviceData.deviceName : deviceId,
        firmwareVersion: typeof deviceData.firmwareVersion === 'string' ? deviceData.firmwareVersion : 'Not reported',
        wifiSSID: typeof deviceData.wifiStatus === 'string' ? deviceData.wifiStatus : 'Not reported'
      });
      emitTelemetry();
    },
    fail
  );
  const unsubscribeState = onSnapshot(
    doc(db, FIREBASE_PATHS.state(deviceId)),
    (snapshot) => {
      stateData = snapshot.exists() ? snapshot.data() : {};
      emitTelemetry();
    },
    fail
  );
  const unsubscribeReadings = onSnapshot(
    query(
      collection(db, FIREBASE_PATHS.sensorData(deviceId)),
      orderBy('timestamp', 'desc'),
      limit(100)
    ),
    (snapshot) => {
      const points = snapshot.docs
        .map((item) => historyPoint(item.data()))
        .filter((point): point is SensorHistoryPoint => point !== null)
        .reverse();
      latestReading = snapshot.docs[0]?.data() ?? {};
      listeners.onHistory(points);
      emitTelemetry();
    },
    fail
  );
  const unsubscribeCommands = onSnapshot(
    doc(db, FIREBASE_PATHS.deviceCommands(deviceId)),
    (snapshot) => {
      commandData = snapshot.exists() ? snapshot.data() : {};
      emitTelemetry();
    },
    fail
  );
  const unsubscribeIrrigationHistory = onSnapshot(
    query(
      collection(db, FIREBASE_PATHS.irrigationHistory),
      where('deviceId', '==', deviceId),
      orderBy('timestamp', 'desc'),
      limit(100)
    ),
    (snapshot) => {
      listeners.onIrrigationHistory(
        snapshot.docs
          .map((item) => irrigationLog(item.id, item.data()))
          .filter((log): log is IrrigationLog => log !== null)
      );
    },
    fail
  );

  const freshnessTimer = window.setInterval(emitTelemetry, 15_000);
  return () => {
    window.clearInterval(freshnessTimer);
    unsubscribeDevice();
    unsubscribeState();
    unsubscribeReadings();
    unsubscribeCommands();
    unsubscribeIrrigationHistory();
  };
}

export async function sendFirebaseCommand(
  db: Firestore,
  deviceId: string,
  command: FirebaseDeviceCommand
): Promise<void> {
  await setDoc(
    doc(db, FIREBASE_PATHS.deviceCommands(deviceId)),
    { ...command, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
