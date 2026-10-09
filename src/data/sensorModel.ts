import { BhoomiFiTelemetry, FirebaseSensorReading } from '@/types';
import { Timestamp } from 'firebase/firestore';

export const DRY_ADC = 4095;
export const WET_ADC = 700;

export function moisturePercentFromAdc(rawADC: number): number {
  if (!Number.isFinite(rawADC)) {
    throw new RangeError('Soil raw ADC must be a finite number.');
  }

  return Math.min(100, Math.max(0, ((DRY_ADC - rawADC) / (DRY_ADC - WET_ADC)) * 100));
}

export function rawAdcFromMoisturePercent(moisturePercent: number): number {
  if (!Number.isFinite(moisturePercent)) {
    throw new RangeError('Soil moisture percentage must be a finite number.');
  }

  return Math.round(DRY_ADC - (Math.min(100, Math.max(0, moisturePercent)) / 100) * (DRY_ADC - WET_ADC));
}

export function telemetryFromFirebaseReading(
  reading: FirebaseSensorReading,
  thresholds: Pick<BhoomiFiTelemetry, 'minMoistureThreshold' | 'targetMoistureThreshold'>
): BhoomiFiTelemetry {
  const timestampMillis = reading.timestamp instanceof Timestamp
    ? reading.timestamp.toMillis()
    : reading.timestamp instanceof Date
      ? reading.timestamp.getTime()
      : typeof reading.timestamp === 'string'
        ? Date.parse(reading.timestamp)
        : reading.timestamp < 1_000_000_000_000 ? reading.timestamp * 1000 : reading.timestamp;
  if (!Number.isFinite(timestampMillis)) {
    throw new RangeError('Firebase reading timestamp must be a finite server timestamp.');
  }
  const timestamp = new Date(timestampMillis).toISOString();

  return {
    ...reading,
    soilMoisture: moisturePercentFromAdc(reading.soilRawADC),
    pumpStatus: reading.pumpStatus ?? null,
    autoMode: reading.autoMode ?? null,
    deviceStatus: reading.deviceStatus ?? 'OFFLINE',
    timestamp,
    lastSeen: timestamp,
    ...thresholds
  };
}
