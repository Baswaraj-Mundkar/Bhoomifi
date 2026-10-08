import {
  BhoomiFiTelemetry,
  HardwareModule,
  IrrigationLog,
  SensorHistoryPoint,
  DeviceSettings
} from '@/types';
import { rawAdcFromMoisturePercent } from '@/data/sensorModel';

const now = new Date('2026-10-08T08:09:24.000Z');
const historyPoint = (
  hoursAgo: number,
  soilMoisture: number,
  temperature: number,
  humidity: number,
  light: number,
  pumpStatus: 'ON' | 'OFF'
): SensorHistoryPoint => {
  const date = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
  return {
    timestamp: date.toISOString(),
    time: date.toISOString().slice(11, 16),
    soilMoisture,
    temperature,
    humidity,
    light,
    pumpStatus
  };
};

export const initialTelemetry: BhoomiFiTelemetry = {
  soilMoisture: 62,
  soilRawADC: rawAdcFromMoisturePercent(62),
  temperature: 30.2,
  humidity: 52,
  light: 420,
  deviceStatus: 'ONLINE',
  pumpStatus: 'OFF',
  autoMode: true,
  minMoistureThreshold: 35,
  targetMoistureThreshold: 45,
  timestamp: now.toISOString(),
  lastSeen: now.toISOString()
};

export const unavailableLiveTelemetry: BhoomiFiTelemetry = {
  soilMoisture: null,
  soilRawADC: null,
  temperature: null,
  humidity: null,
  light: null,
  deviceStatus: 'OFFLINE',
  pumpStatus: null,
  autoMode: true,
  minMoistureThreshold: 35,
  targetMoistureThreshold: 45,
  timestamp: null,
  lastSeen: null
};

export const hardwareModules: HardwareModule[] = [
  {
    id: 'esp32',
    name: 'ESP32-WROOM-32',
    component: 'Main MCU & Wi-Fi Gateway',
    pin: 'Core SOC',
    status: 'Operational',
    reading: 'Demo device online'
  },
  {
    id: 'soil-sensor',
    name: 'HW-080 Soil Moisture Hygrometer',
    component: 'Analog soil moisture sensor',
    pin: 'GPIO32 (AOUT) • 3.3V (VCC) • GND',
    status: 'Operational',
    reading: 'Demo: 62% • ADC 1990'
  },
  {
    id: 'dht11',
    name: 'DHT11 Sensor',
    component: 'Temperature & humidity',
    pin: 'GPIO4 (DATA)',
    status: 'Operational',
    reading: 'Demo: 30.2°C • 52%'
  },
  {
    id: 'bh1750',
    name: 'BH1750 Ambient Light',
    component: 'Digital ambient light sensor',
    pin: 'GPIO21 (SDA) / GPIO22 (SCL)',
    status: 'Operational',
    reading: 'Demo: 420 lux'
  },
  {
    id: 'relay',
    name: 'Relay Module',
    component: 'Pump/LED demonstration output',
    pin: 'GPIO25 (IN)',
    status: 'Standby',
    reading: 'Demo: OFF'
  },
  {
    id: 'led',
    name: 'LED Demonstration Output',
    component: 'Current relay/pump indicator',
    pin: 'GPIO26',
    status: 'Standby',
    reading: 'Demo: OFF'
  },
  {
    id: 'pump',
    name: 'Water Pump',
    component: 'Irrigation pump controlled by relay',
    pin: 'Relay output',
    status: 'Standby',
    reading: 'Demo: OFF'
  }
];

export const initialIrrigationLogs: IrrigationLog[] = [
  {
    id: 'irr-1',
    timestamp: 'Today, 06:15 AM',
    mode: 'AUTO',
    durationSeconds: 42,
    triggerReason: 'Moisture dropped below 35% (read 33.8%)',
    startMoisture: 34,
    endMoisture: 46,
    status: 'Completed'
  },
  {
    id: 'irr-2',
    timestamp: 'Yesterday, 07:30 PM',
    mode: 'MANUAL',
    durationSeconds: 30,
    triggerReason: 'Manual operator test cycle',
    startMoisture: 41,
    endMoisture: 52,
    status: 'Completed'
  },
  {
    id: 'irr-3',
    timestamp: 'Yesterday, 08:10 AM',
    mode: 'AUTO',
    durationSeconds: 48,
    triggerReason: 'Moisture dropped below 35% (read 34.2%)',
    startMoisture: 34,
    endMoisture: 45,
    status: 'Completed'
  },
  {
    id: 'irr-4',
    timestamp: 'Oct 02, 05:45 PM',
    mode: 'AUTO',
    durationSeconds: 38,
    triggerReason: 'Routine soil hydration cycle',
    startMoisture: 33,
    endMoisture: 45,
    status: 'Completed'
  }
];

export const initialSensorHistory: SensorHistoryPoint[] = [
  historyPoint(20, 68, 24.5, 64, 0, 'OFF'),
  historyPoint(16, 66, 23.8, 66, 0, 'OFF'),
  historyPoint(12, 65, 27.4, 58, 280, 'OFF'),
  historyPoint(8, 63, 31.8, 48, 750, 'OFF'),
  historyPoint(4, 62, 30.2, 52, 420, 'OFF'),
  historyPoint(0, 62, 27.6, 55, 45, 'OFF')
];

export const initialDeviceSettings: DeviceSettings = {
  farmId: process.env.NEXT_PUBLIC_FIREBASE_FARM_ID ?? 'bhoomifi-farm-01',
  deviceId: process.env.NEXT_PUBLIC_FIREBASE_DEVICE_ID ?? 'BHOOMIFI-ESP32-NODE-01',
  deviceName: 'BhoomiFi Smart Pot / Bed Node',
  firmwareVersion: 'Not connected',
  wifiSSID: 'Not connected',
  ipAddress: 'Not connected',
  minMoistureThreshold: 35,
  targetMoistureThreshold: 45,
  demoMode: false
};
