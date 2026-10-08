'use client';

import React, { useState } from 'react';
import {
  Droplets,
  Power,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { BhoomiFiTelemetry, IrrigationLog } from '@/types';

interface IrrigationScreenProps {
  telemetry: BhoomiFiTelemetry;
  logs: IrrigationLog[];
  isDemoMode: boolean;
  canControl: boolean;
  onTogglePump: () => void | Promise<void>;
  onToggleMode: () => void | Promise<void>;
  onUpdateThresholds: (min: number, target: number) => void | Promise<void>;
}

export const IrrigationScreen: React.FC<IrrigationScreenProps> = ({
  telemetry,
  logs,
  isDemoMode,
  canControl,
  onTogglePump,
  onToggleMode,
  onUpdateThresholds
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const isPumpOn = telemetry.pumpStatus === 'ON';
  const isAuto = telemetry.autoMode;
  const isMoistureLow = telemetry.soilMoisture !== null && telemetry.soilMoisture < telemetry.minMoistureThreshold;

  const handlePumpClick = async () => {
    if (isAuto || !canControl || telemetry.pumpStatus === null) return;
    await onTogglePump();
    showToast(isDemoMode
      ? `Water pump turned ${isPumpOn ? 'OFF' : 'ON'}`
      : `Pump command sent to Firebase; awaiting ESP32 ${isPumpOn ? 'OFF' : 'ON'} state`);
  };

  const updateMinimum = (value: string) => {
    const minimum = Number(value);
    if (Number.isInteger(minimum) && minimum >= 0 && minimum < telemetry.targetMoistureThreshold) {
      void onUpdateThresholds(minimum, telemetry.targetMoistureThreshold);
    }
  };

  const updateTarget = (value: string) => {
    const target = Number(value);
    if (Number.isInteger(target) && target > telemetry.minMoistureThreshold && target <= 100) {
      void onUpdateThresholds(telemetry.minMoistureThreshold, target);
    }
  };

  const handleModeClick = async () => {
    if (!canControl) return;
    await onToggleMode();
    showToast(isDemoMode
      ? `Switched to ${isAuto ? 'MANUAL' : 'AUTO'} Mode`
      : `${isAuto ? 'MANUAL' : 'AUTO'} command sent to Firebase; awaiting ESP32 state`);
  };

  /** Returns a human-readable reason for the current pump state */
  const getPumpStateReason = (): string => {
    if (!isDemoMode && telemetry.deviceStatus === 'OFFLINE') {
      const lastSeen = telemetry.lastSeen
        ? ` Last seen ${new Date(telemetry.lastSeen).toLocaleString()}.`
        : ' No heartbeat has been received yet.';
      return `ESP32 is OFFLINE; the last confirmed sensor and pump readings are retained.${lastSeen}`;
    }
    if (telemetry.soilMoisture === null || telemetry.pumpStatus === null) {
      return 'Waiting for a soil reading before applying irrigation rules.';
    }
    if (isAuto) {
      if (isPumpOn) {
        return `AUTO: Moisture at ${telemetry.soilMoisture}% — below ${telemetry.minMoistureThreshold}% minimum. Pump running until ${telemetry.targetMoistureThreshold}%.`;
      }
      if (telemetry.soilMoisture >= telemetry.targetMoistureThreshold) {
        return `AUTO: Moisture at ${telemetry.soilMoisture}% — target reached. Pump OFF.`;
      }
      if (isMoistureLow) {
        return `AUTO: Moisture at ${telemetry.soilMoisture}% — below ${telemetry.minMoistureThreshold}% minimum. Pump ON.`;
      }
      return `AUTO: Moisture at ${telemetry.soilMoisture}% — in the ${telemetry.minMoistureThreshold}–${telemetry.targetMoistureThreshold - 1}% hold band. Pump state unchanged.`;
    }
    // MANUAL mode
    if (isPumpOn) {
      return `MANUAL: Pump running by operator command. Tap to stop.`;
    }
    return `MANUAL: Pump stopped. Tap Start Pump to irrigate manually.`;
  };
  const operationMode = isAuto ? 'AUTO' : 'MANUAL';

  return (
    <div className="space-y-4 px-5 pb-8">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#143525] text-white px-4 py-2.5 rounded-full text-xs font-semibold shadow-xl border border-white/20 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Droplets className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Title */}
      <div className="pt-2 flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-[#141B18] tracking-tight leading-tight">
            Irrigation
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">Water Pump &amp; Relay Control</p>
        </div>

        {/* Mode badge / toggle */}
        <button
          onClick={handleModeClick}
          disabled={!canControl}
          className="bg-[#E7F3EC] hover:bg-[#D7EFE2] text-[#227C4F] px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
          title="Click to toggle AUTO / MANUAL"
        >
          <span className="w-2 h-2 rounded-full bg-[#227C4F] animate-pulse"></span>
          <span>{operationMode} Mode</span>
        </button>
      </div>

      {/* Main Hydration Status Card */}
      <div className="bg-white rounded-[32px] p-5 border border-black/[0.04] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-neutral-400">Current Soil Moisture</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-3xl font-extrabold text-[#151B18] tracking-tight">
                {telemetry.soilMoisture === null ? '—' : `${telemetry.soilMoisture}%`}
              </span>
              <span className="text-xs font-bold text-neutral-400">
                (Min: {telemetry.minMoistureThreshold}% • Target: {telemetry.targetMoistureThreshold}%)
              </span>
            </div>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-[#E7F3EC] text-[#227C4F] flex items-center justify-center">
            <Droplets className="w-6 h-6 stroke-[2]" />
          </div>
        </div>

        {/* 3 Metric Pills */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="bg-[#F5F7F6] rounded-2xl p-3">
            <span className={`text-lg font-bold block leading-tight ${isPumpOn ? 'text-emerald-700' : 'text-neutral-900'}`}>
              {telemetry.pumpStatus ?? '—'}
            </span>
            <span className="text-[10px] text-neutral-400 font-medium">Pump Status</span>
          </div>

          <div className="bg-[#F5F7F6] rounded-2xl p-3">
            <span className="text-lg font-bold text-amber-700 block leading-tight">
              {telemetry.minMoistureThreshold}%
            </span>
            <span className="text-[10px] text-neutral-400 font-medium">Min Threshold</span>
          </div>

          <div className="bg-[#F5F7F6] rounded-2xl p-3">
            <span className="text-lg font-bold text-[#227C4F] block leading-tight">
              {telemetry.targetMoistureThreshold}%
            </span>
            <span className="text-[10px] text-neutral-400 font-medium">Target Moisture</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-neutral-100 pt-3">
          <label className="space-y-1">
            <span className="block text-[10px] font-semibold text-neutral-500">Minimum trigger (%)</span>
            <input
              type="number"
              min={0}
              max={telemetry.targetMoistureThreshold - 1}
              value={telemetry.minMoistureThreshold}
              onChange={(event) => updateMinimum(event.target.value)}
              disabled={!canControl}
              aria-label="Minimum moisture threshold"
              className="w-full rounded-xl border border-neutral-200 bg-[#F8F9F8] px-3 py-2 text-sm font-bold text-neutral-900 outline-none focus:border-[#227C4F] focus:ring-2 focus:ring-[#227C4F]/15"
            />
          </label>
          <label className="space-y-1">
            <span className="block text-[10px] font-semibold text-neutral-500">Target cutoff (%)</span>
            <input
              type="number"
              min={telemetry.minMoistureThreshold + 1}
              max={100}
              value={telemetry.targetMoistureThreshold}
              onChange={(event) => updateTarget(event.target.value)}
              disabled={!canControl}
              aria-label="Target moisture threshold"
              className="w-full rounded-xl border border-neutral-200 bg-[#F8F9F8] px-3 py-2 text-sm font-bold text-neutral-900 outline-none focus:border-[#227C4F] focus:ring-2 focus:ring-[#227C4F]/15"
            />
          </label>
        </div>
      </div>

      {/* Relay Actuator & Pump Controller Card */}
      <div className="bg-white rounded-[32px] p-5 border border-black/[0.04] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">1-Channel Relay Module</h3>
            <p className="text-[11px] text-neutral-400">Relay GPIO25 • LED demonstration output GPIO26</p>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              isPumpOn ? 'bg-emerald-100 text-emerald-800 animate-pulse' : 'bg-neutral-100 text-neutral-600'
            }`}
          >
            {telemetry.pumpStatus === null ? 'Waiting for live status' : isPumpOn ? 'Relay Active (Pump ON)' : 'Relay Standby (Pump OFF)'}
          </span>
        </div>

        {/* Control Row */}
        <div className="p-4 rounded-2xl bg-[#F6F8F7] border border-neutral-200/60 flex items-center justify-between gap-4">
          <div className="space-y-1 flex-1 min-w-0">
            <h4 className="text-xs font-bold text-neutral-900">
              {isAuto ? 'Automatic Irrigation Rule' : 'Manual Relay Override'}
            </h4>
            <p className="text-[11px] text-neutral-500 leading-snug">
              {isAuto
                ? `Pump triggers automatically if soil moisture drops below ${telemetry.minMoistureThreshold}% until ${telemetry.targetMoistureThreshold}% is reached.`
                : 'Direct manual control enabled. Use Start Pump or Stop Pump.'}
            </p>
          </div>

          <button
            onClick={handlePumpClick}
            disabled={isAuto || !canControl || telemetry.pumpStatus === null}
            aria-label={isAuto ? 'Pump controlled automatically' : isPumpOn ? 'Stop Pump' : 'Start Pump'}
            className={`min-h-12 px-3 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-200 shadow-md shrink-0 disabled:cursor-not-allowed disabled:opacity-45 ${
              isPumpOn
                ? 'bg-emerald-600 text-white shadow-emerald-600/30 ring-4 ring-emerald-600/20'
                : 'bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200'
            }`}
            title={isAuto ? 'Pump state is controlled by moisture thresholds in AUTO mode' : isPumpOn ? 'Stop Pump' : 'Start Pump'}
          >
            <Power className="w-6 h-6 stroke-[2.2]" />
            <span className="text-[9px] font-bold whitespace-nowrap">
              {isAuto ? 'AUTO' : isPumpOn ? 'Stop Pump' : 'Start Pump'}
            </span>
          </button>
        </div>

        {/* Pump state reason — always visible, no hardcoded values */}
        <div className="flex items-start gap-2 pt-1">
          {isDemoMode && isMoistureLow && isAuto && !isPumpOn ? (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-[#227C4F] shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-neutral-600 leading-snug">
              {getPumpStateReason()}
            </p>
          </div>
          <button
            onClick={handleModeClick}
            disabled={!canControl}
            className="text-[11px] text-[#227C4F] font-bold hover:underline shrink-0 disabled:opacity-40"
          >
            → {isAuto ? 'MANUAL' : 'AUTO'}
          </button>
        </div>
      </div>

      {/* Irrigation History Log */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-neutral-900">Irrigation History</h3>
          <span className="text-xs text-neutral-400">Pump Activation Log</span>
        </div>

        {logs.length === 0 ? (
          <div className="bg-white rounded-[28px] p-6 border border-black/[0.04] text-center">
            <p className="text-sm text-neutral-400">No irrigation cycles recorded yet.</p>
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="bg-white rounded-[28px] p-4 border border-black/[0.04] shadow-sm flex items-start justify-between gap-3"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-neutral-900 leading-snug">{log.triggerReason}</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E7F3EC] text-[#227C4F] font-bold shrink-0">
                    {log.mode}
                  </span>
                </div>
                <p className="text-xs text-neutral-500">
                  Moisture: {log.startMoisture}% → {log.endMoisture}% • Duration: {log.durationSeconds}s
                </p>
                <div className="flex items-center gap-3 text-[11px] text-neutral-400 pt-0.5">
                  <span>Relay GPIO25 • LED GPIO26</span>
                  <span>•</span>
                  <span>{log.timestamp}</span>
                  {log.status === 'Active' && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-600 font-semibold animate-pulse">Active</span>
                    </>
                  )}
                </div>
              </div>

              <div className="px-2.5 py-1 rounded-xl bg-neutral-100 text-[10px] font-bold text-neutral-600 shrink-0">
                {log.durationSeconds}s
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
