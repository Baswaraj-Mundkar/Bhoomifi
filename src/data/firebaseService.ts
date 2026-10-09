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
import { DeviceStatus, FirebaseDeviceCommand, IrrigationLog, SensorHistoryPoint } from '@/types';
import { moisturePercentFromAdc } from '@/data/sensorModel';
import { FIREBASE_PATHS } from '@/data/firebaseSchema';

export const DEVICE_OFFLINE_AFTER_MS = 90_000;
const FUTURE_TIMESTAMP_TOLERANCE_MS = 30_000;

type RecordData = Record<string, unknown>;
export type FirebaseConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
export type FirebaseSetupStatus =
  | 'not-configured'
  | 'checking'
  | 'ready'
  | 'missing-farm'
  | 'missing-device'
  | 'incomplete-record'
  | 'ownership-mismatch';

interface FirebaseTelemetry {
  soilMoisture: number | null;
  soilRawADC: number | null;
  temperature: number | null;
  humidity: number | null;
  light: number | null;
  pumpStatus: 'ON' | 'OFF' | null;
  autoMode: boolean | null;
  deviceStatus: DeviceStatus;
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
  onSetupStatus: (status: FirebaseSetupStatus) => void;
  onConnection: (status: FirebaseConnectionStatus, message: string) => void;
  onError: (error: Error) => void;
}

function isRecord(value: unknown): value is RecordData {
  return typeof value === 'object' && value !== null;
}

function numeric(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function boundedNumeric(value: unknown, minimum: number, maximum: number): number | null {
  const parsed = numeric(value);
  return parsed !== null && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function timestampMillis(value: unknown): number | null {
  let millis: number | null = null;
  if (value instanceof Timestamp) millis = value.toMillis();
  else if (value instanceof Date) millis = value.getTime();
  if (typeof value === 'number' && Number.isFinite(value)) {
    millis = value < 1_000_000_000_000 ? value * 1000 : value;
  } else if (typeof value === 'string') {
    const parsed = Date.parse(value);
    millis = Number.isNaN(parsed) ? null : parsed;
  } else if (isRecord(value) && typeof value.seconds === 'number') {
    millis = value.seconds * 1000 + (typeof value.nanoseconds === 'number' ? value.nanoseconds / 1_000_000 : 0);
  }
  return millis !== null && Number.isFinite(millis) && Math.abs(millis) <= 8.64e15 ? millis : null;
}

function isoTimestamp(value: unknown): string | null {
  const millis = timestampMillis(value);
  return millis === null ? null : new Date(millis).toISOString();
}

function firstValidTimestamp(...values: unknown[]): unknown {
  return values.find((value) => timestampMillis(value) !== null);
}

function pumpStatus(value: unknown): 'ON' | 'OFF' | null {
  return value === 'ON' || value === 'OFF' ? value : null;
}

function historyPoint(data: RecordData): SensorHistoryPoint | null {
  const timestamp = isoTimestamp(data.timestamp);
  const soilRawADC = boundedNumeric(data.soilRawADC, 0, 4095);
  if (data.soilRawADC !== undefined && data.soilRawADC !== null && soilRawADC === null) return null;
  const soilMoisture = soilRawADC === null
    ? boundedNumeric(data.soilMoisture, 0, 100)
    : moisturePercentFromAdc(soilRawADC);
  const temperature = boundedNumeric(data.temperature, 0, 50);
  const humidity = boundedNumeric(data.humidity, 0, 100);
  const light = boundedNumeric(data.light, 0, 65_535);
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
  const rawADCValue = firstDefined('soilRawADC');
  const rawADC = boundedNumeric(rawADCValue, 0, 4095);
  const reportedMoisture = boundedNumeric(firstDefined('soilMoisture'), 0, 100);
  const lastSeenValue = firstValidTimestamp(
    deviceData.lastSeen,
    stateData.lastSeen,
    stateData.timestamp,
    latestReading.timestamp
  );
  const lastSeen = isoTimestamp(lastSeenValue);
  const lastSeenMillis = timestampMillis(lastSeenValue);
  const explicitlyOffline = deviceData.deviceStatus === 'OFFLINE' || stateData.deviceStatus === 'OFFLINE';
  const malformedDeviceStatus = [deviceData.deviceStatus, stateData.deviceStatus]
    .some((status) => status !== undefined && status !== null && status !== 'ONLINE' && status !== 'OFFLINE');
  const heartbeatAge = lastSeenMillis === null ? null : now - lastSeenMillis;
  const configuredMinimum = boundedNumeric(commandData.minimumMoisture, 0, 99);
  const configuredTarget = boundedNumeric(commandData.targetMoisture, 1, 100);
  const thresholdsValid = configuredMinimum !== null
    && configuredTarget !== null
    && configuredMinimum < configuredTarget;
  const deviceStatus: DeviceStatus = explicitlyOffline || malformedDeviceStatus || heartbeatAge === null
    ? 'OFFLINE'
    : heartbeatAge > DEVICE_OFFLINE_AFTER_MS || heartbeatAge < -FUTURE_TIMESTAMP_TOLERANCE_MS
      ? 'STALE'
      : 'ONLINE';

  return {
    soilMoisture: rawADCValue !== undefined && rawADCValue !== null && rawADC === null
      ? null
      : rawADC === null
      ? reportedMoisture
      : moisturePercentFromAdc(rawADC),
    soilRawADC: rawADC,
    temperature: boundedNumeric(firstDefined('temperature'), 0, 50),
    humidity: boundedNumeric(firstDefined('humidity'), 0, 100),
    light: boundedNumeric(firstDefined('light'), 0, 65_535),
    pumpStatus: pumpStatus(stateData.pumpStatus ?? latestReading.pumpStatus),
    autoMode: typeof stateData.autoMode === 'boolean'
      ? stateData.autoMode
      : typeof latestReading.autoMode === 'boolean' ? latestReading.autoMode : null,
    deviceStatus,
    timestamp: isoTimestamp(stateData.timestamp) ?? isoTimestamp(latestReading.timestamp),
    lastSeen,
    minMoistureThreshold: thresholdsValid ? configuredMinimum : 35,
    targetMoistureThreshold: thresholdsValid ? configuredTarget : 45
  };
}

function irrigationLog(id: string, data: RecordData): IrrigationLog | null {
  const millis = timestampMillis(data.timestamp);
  const soilMoisture = boundedNumeric(data.soilMoisture, 0, 100);
  if (
    millis === null
    || soilMoisture === null
    || typeof data.action !== 'string'
    || (data.source !== 'AUTO' && data.source !== 'MANUAL')
  ) return null;
  const action = data.action;
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
  farmId: string,
  deviceId: string,
  ownerUid: string,
  listeners: DeviceListeners
): () => void {
  const unsubscribeFunctions: Array<() => void> = [];
  let deviceData: RecordData = {};
  let stateData: RecordData = {};
  let latestReading: RecordData = {};
  let commandData: RecordData = {};
  let deviceListenersStarted = false;
  const snapshotCacheStates = new Map<string, boolean>();
  let listenerError: Error | null = null;

  const emitTelemetry = () => {
    listeners.onTelemetry(makeTelemetry(deviceData, stateData, latestReading, commandData, Date.now()));
  };
  const reportSnapshotConnection = (source: string, fromCache: boolean) => {
    if (listenerError) return;
    snapshotCacheStates.set(source, fromCache);
    const offline = Array.from(snapshotCacheStates.values()).every(Boolean);
    listeners.onConnection(
      offline ? 'disconnected' : 'connected',
      offline ? 'Using cached Firestore data; waiting for a network connection.' : 'Connected to Firebase Firestore.'
    );
  };
  const fail = (error: Error) => {
    if (listenerError) return;
    listenerError = error;
    listeners.onConnection('error', error.message);
    listeners.onError(error);
  };
  const startDeviceListeners = () => {
    if (deviceListenersStarted) return;
    deviceListenersStarted = true;

    unsubscribeFunctions.push(onSnapshot(
      doc(db, FIREBASE_PATHS.device(deviceId)),
      { includeMetadataChanges: true },
      (snapshot) => {
        reportSnapshotConnection('device', snapshot.metadata.fromCache);
        if (!snapshot.exists()) {
          listeners.onSetupStatus('missing-device');
          return;
        }
        deviceData = snapshot.data();
        if (
          deviceData.farmId !== farmId
          || deviceData.ownerUid !== ownerUid
          || typeof deviceData.deviceUid !== 'string'
          || deviceData.deviceUid.length === 0
          || deviceData.deviceUid === ownerUid
        ) {
          listeners.onSetupStatus('ownership-mismatch');
          return;
        }
        if (
          typeof deviceData.deviceName !== 'string'
          || (deviceData.deviceStatus !== 'ONLINE' && deviceData.deviceStatus !== 'OFFLINE')
          || !('lastSeen' in deviceData)
          || (deviceData.lastSeen !== null && timestampMillis(deviceData.lastSeen) === null)
          || typeof deviceData.firmwareVersion !== 'string'
          || typeof deviceData.wifiStatus !== 'string'
        ) {
          listeners.onSetupStatus('incomplete-record');
          return;
        }
        listeners.onSetupStatus('ready');
        listeners.onDeviceInfo({
          deviceName: typeof deviceData.deviceName === 'string' ? deviceData.deviceName : deviceId,
          firmwareVersion: typeof deviceData.firmwareVersion === 'string' ? deviceData.firmwareVersion : 'Not reported',
          wifiSSID: typeof deviceData.wifiStatus === 'string' ? deviceData.wifiStatus : 'Not reported'
        });
        emitTelemetry();
      },
      fail
    ));
    unsubscribeFunctions.push(onSnapshot(
      doc(db, FIREBASE_PATHS.state(deviceId)),
      { includeMetadataChanges: true },
      (snapshot) => {
        reportSnapshotConnection('state', snapshot.metadata.fromCache);
        stateData = snapshot.exists() ? snapshot.data() : {};
        emitTelemetry();
      },
      fail
    ));
    unsubscribeFunctions.push(onSnapshot(
      query(
        collection(db, FIREBASE_PATHS.sensorData(deviceId)),
        orderBy('timestamp', 'desc'),
        limit(100)
      ),
      { includeMetadataChanges: true },
      (snapshot) => {
        reportSnapshotConnection('readings', snapshot.metadata.fromCache);
        const points = snapshot.docs
          .map((item) => historyPoint(item.data()))
          .filter((point): point is SensorHistoryPoint => point !== null)
          .reverse();
        latestReading = snapshot.docs[0]?.data() ?? {};
        listeners.onHistory(points);
        emitTelemetry();
      },
      fail
    ));
    unsubscribeFunctions.push(onSnapshot(
      doc(db, FIREBASE_PATHS.deviceCommands(deviceId)),
      { includeMetadataChanges: true },
      (snapshot) => {
        reportSnapshotConnection('commands', snapshot.metadata.fromCache);
        commandData = snapshot.exists() ? snapshot.data() : {};
        emitTelemetry();
      },
      fail
    ));
    unsubscribeFunctions.push(onSnapshot(
      query(
        collection(db, FIREBASE_PATHS.irrigationHistory),
        where('deviceId', '==', deviceId),
        orderBy('timestamp', 'desc'),
        limit(100)
      ),
      { includeMetadataChanges: true },
      (snapshot) => {
        reportSnapshotConnection('irrigation-history', snapshot.metadata.fromCache);
        listeners.onIrrigationHistory(
          snapshot.docs
            .map((item) => irrigationLog(item.id, item.data()))
            .filter((log): log is IrrigationLog => log !== null)
        );
      },
      fail
    ));
  };

  listeners.onSetupStatus('checking');
  listeners.onConnection('connecting', 'Checking farm ownership in Firestore…');
  unsubscribeFunctions.push(onSnapshot(
    doc(db, FIREBASE_PATHS.farm(farmId)),
    { includeMetadataChanges: true },
    (snapshot) => {
      reportSnapshotConnection('farm', snapshot.metadata.fromCache);
      if (!snapshot.exists()) {
        listeners.onSetupStatus('missing-farm');
        return;
      }
      const farmData = snapshot.data();
      if (farmData.ownerUid !== ownerUid) {
        listeners.onSetupStatus('ownership-mismatch');
        return;
      }
      if (
        typeof farmData.name !== 'string'
        || !Array.isArray(farmData.deviceIds)
        || !farmData.deviceIds.includes(deviceId)
      ) {
        listeners.onSetupStatus('incomplete-record');
        return;
      }
      startDeviceListeners();
    },
    fail
  ));
  const freshnessTimer = window.setInterval(emitTelemetry, 15_000);
  return () => {
    window.clearInterval(freshnessTimer);
    unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
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
