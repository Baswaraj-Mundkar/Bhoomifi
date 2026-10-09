import type { Timestamp } from 'firebase/firestore';

export type NavigationTab = 'home' | 'field' | 'irrigation' | 'history' | 'settings';
export type HomeSubTab = 'overview' | 'monitoring';
export type OperationMode = 'AUTO' | 'MANUAL';
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'STALE';
export type FirebaseReportedDeviceStatus = 'ONLINE' | 'OFFLINE';
export type PumpStatus = 'ON' | 'OFF';

export interface BhoomiFiTelemetry {
  soilMoisture: number | null;
  soilRawADC: number | null;
  temperature: number | null;
  humidity: number | null;
  light: number | null;
  pumpStatus: PumpStatus | null;
  autoMode: boolean | null;
  deviceStatus: DeviceStatus;
  timestamp: string | null;
  lastSeen: string | null;
  minMoistureThreshold: number;
  targetMoistureThreshold: number;
}

export interface HardwareModule {
  id: string;
  name: string;
  component: string;
  pin: string;
  status: 'Operational' | 'Standby' | 'Offline';
  reading: string;
}

export interface IrrigationLog {
  id: string;
  timestamp: string;
  startedAt?: number;
  mode: OperationMode;
  durationSeconds: number;
  triggerReason: string;
  startMoisture: number;
  endMoisture: number;
  status: 'Completed' | 'Active';
}

export interface SensorHistoryPoint {
  timestamp: string;
  time: string;
  soilMoisture: number;
  temperature: number;
  humidity: number;
  light: number;
  pumpStatus: PumpStatus | null;
}

export interface DeviceSettings {
  farmId: string;
  deviceId: string;
  deviceName: string;
  firmwareVersion: string;
  wifiSSID: string;
  ipAddress: string;
  minMoistureThreshold: number;
  targetMoistureThreshold: number;
  demoMode: boolean;
}

export type FirebaseTimestamp = number | string | Date | Timestamp;

export interface FirebaseSensorReading {
  soilMoisture: number;
  soilRawADC: number;
  temperature: number;
  humidity: number;
  light: number;
  pumpStatus?: PumpStatus;
  autoMode?: boolean;
  deviceStatus?: FirebaseReportedDeviceStatus;
  timestamp: FirebaseTimestamp;
}

export interface FirebaseFarm {
  name: string;
  ownerUid: string;
  deviceIds: string[];
}

export interface FirebaseDevice {
  deviceName: string;
  deviceStatus: FirebaseReportedDeviceStatus;
  lastSeen: FirebaseTimestamp | null;
  firmwareVersion: string;
  wifiStatus: string;
  farmId: string;
  ownerUid: string;
  deviceUid: string;
}

export interface FirebaseIrrigationEvent {
  timestamp: FirebaseTimestamp;
  deviceId: string;
  action: string;
  reason: string;
  soilMoisture: number;
  source: OperationMode;
}

export interface FirebaseDeviceCommand {
  pumpCommand?: 'START' | 'STOP' | null;
  autoMode?: boolean;
  minimumMoisture?: number;
  targetMoisture?: number;
}
