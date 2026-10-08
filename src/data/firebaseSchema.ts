import {
  FirebaseDevice,
  FirebaseDeviceCommand,
  FirebaseFarm,
  FirebaseIrrigationEvent,
  FirebaseSensorReading
} from '@/types';

export const FIREBASE_PATHS = {
  farm: (farmId: string) => `farms/${farmId}`,
  device: (deviceId: string) => `devices/${deviceId}`,
  sensorData: (deviceId: string) => `devices/${deviceId}/readings`,
  state: (deviceId: string) => `devices/${deviceId}/state/current`,
  deviceCommands: (deviceId: string) => `devices/${deviceId}/commands/current`,
  irrigationHistory: 'irrigation_history'
} as const;

export type FarmRecord = FirebaseFarm;
export type DeviceRecord = FirebaseDevice;
export type ReadingRecord = FirebaseSensorReading;
export type IrrigationHistoryRecord = FirebaseIrrigationEvent;
export type DeviceCommandRecord = FirebaseDeviceCommand;
