'use client';

import React from 'react';
import {
  ArrowLeft,
  Droplets,
  Cpu,
  AlertTriangle
} from 'lucide-react';
import { BhoomiFiTelemetry } from '@/types';

interface FieldScreenProps {
  telemetry: BhoomiFiTelemetry;
  isDemoMode: boolean;
  onBack: () => void;
  onNavigateToIrrigation: () => void;
}

export const FieldScreen: React.FC<FieldScreenProps> = ({
  telemetry,
  isDemoMode,
  onBack,
  onNavigateToIrrigation
}) => {
  const isMoistureLow = telemetry.soilMoisture !== null && telemetry.soilMoisture < 35;

  return (
    <div className="space-y-4 px-5 pb-8">
      {/* Top Bar with Back, Title, and Menu */}
      <div className="flex items-center justify-between pt-3 pb-1">
        <button
          onClick={onBack}
          aria-label="Back to Farm"
          className="w-10 h-10 rounded-full bg-white border border-neutral-200/80 flex items-center justify-center text-neutral-700 hover:bg-neutral-50 shadow-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <span className="text-sm font-semibold text-neutral-800">Sensors &amp; Device</span>

        <span className="w-10" aria-hidden="true" />
      </div>

      {/* Main Screen Title */}
      <div>
        <h1 className="text-[32px] font-bold text-[#141B18] tracking-tight leading-tight">
          Sensors &amp; Device
        </h1>
        <p className="text-[11px] text-neutral-400 font-medium">ESP32-WROOM-32 • {isDemoMode ? 'DEMO MODE' : telemetry.deviceStatus}</p>
      </div>

      <div className="bg-white rounded-[32px] p-5 border border-black/[0.04] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-[#E7F3EC] text-[#227C4F] flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">ESP32 Device</h3>
              <p className="text-[11px] text-neutral-400">BhoomiFi Node 01</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${telemetry.deviceStatus === 'ONLINE' ? 'bg-[#E7F3EC] text-[#227C4F]' : 'bg-amber-100 text-amber-800'}`}>
            {telemetry.deviceStatus}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-[#F5F7F6] p-3">
            <span className="text-[10px] font-medium text-neutral-400">Soil moisture</span>
            <p className="mt-1 text-xl font-extrabold text-neutral-900">{telemetry.soilMoisture === null ? '—' : `${telemetry.soilMoisture}%`}</p>
          </div>
          <div className="rounded-2xl bg-[#F5F7F6] p-3">
            <span className="text-[10px] font-medium text-neutral-400">Temperature</span>
            <p className="mt-1 text-xl font-extrabold text-neutral-900">{telemetry.temperature === null ? '—' : `${telemetry.temperature}°C`}</p>
          </div>
          <div className="rounded-2xl bg-[#F5F7F6] p-3">
            <span className="text-[10px] font-medium text-neutral-400">Humidity</span>
            <p className="mt-1 text-xl font-extrabold text-neutral-900">{telemetry.humidity === null ? '—' : `${telemetry.humidity}%`}</p>
          </div>
          <div className="rounded-2xl bg-[#F5F7F6] p-3">
            <span className="text-[10px] font-medium text-neutral-400">Light</span>
            <p className="mt-1 text-xl font-extrabold text-neutral-900">{telemetry.light === null ? '—' : telemetry.light} <span className="text-xs">lux</span></p>
          </div>
        </div>

        <button
          onClick={onNavigateToIrrigation}
          className={`w-full py-2.5 px-4 rounded-xl text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 ${isMoistureLow ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#1B5E38] hover:bg-[#143525]'}`}
        >
          {isMoistureLow ? <AlertTriangle className="w-3.5 h-3.5" /> : <Droplets className="w-3.5 h-3.5" />}
          <span>{isMoistureLow ? 'Moisture below minimum • Irrigation' : 'Open irrigation controls'}</span>
        </button>
      </div>

      {/* Soil moisture and configured irrigation thresholds */}
      <div className="bg-white rounded-[32px] p-5 border border-black/[0.04] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] space-y-4">
        {/* Top Title & Dual Metric */}
        <div className="space-y-1">
          <span className="text-xs text-neutral-400 font-medium">Soil Moisture & Target Cutoff</span>
          <div className="flex items-baseline justify-between pt-1">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-[#151B18] tracking-tight">
                {telemetry.soilMoisture === null ? '—' : `${telemetry.soilMoisture}%`}
              </span>
              <span className="text-xs font-semibold text-neutral-400">Current</span>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-neutral-400">
                {telemetry.targetMoistureThreshold}%
              </span>
              <span className="text-xs font-medium text-neutral-400">Target</span>
            </div>
          </div>
        </div>

        {/* Threshold Status and Dual Bar Chart */}
        <div className="flex items-end justify-between pt-1">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1 text-xs font-semibold text-[#227C4F]">
              <span>{telemetry.soilMoisture === null ? 'No live soil reading' : telemetry.soilMoisture < 35 ? 'Dry' : telemetry.soilMoisture < 45 ? 'Needs Water' : 'Adequate'}</span>
            </div>
            <p className="text-[11px] text-neutral-400 max-w-[170px] leading-snug">
              HW-080 ADC GPIO32 • Raw ADC {telemetry.soilRawADC ?? '—'} • AUTO: pump ON below 35%, OFF at 45%.
            </p>
          </div>

          {/* Current moisture and target level */}
          <div className="flex items-end gap-3 pb-1">
            {/* Green bar for current moisture */}
            <div className="flex flex-col items-center gap-1">
              <div className={`w-9 h-16 rounded-xl ${telemetry.soilMoisture === null ? 'bg-neutral-100 text-neutral-400' : 'bg-gradient-to-t from-[#227C4F] to-[#2E9B64] text-white'} flex items-center justify-center text-[11px] font-bold shadow-sm`}>
                {telemetry.soilMoisture === null ? '—' : `${telemetry.soilMoisture}%`}
              </div>
              <span className="text-[10px] text-neutral-400 font-medium">Actual</span>
            </div>

            {/* Coral/Amber bar for target threshold */}
            <div className="flex flex-col items-center gap-1">
              <div className="w-9 h-12 rounded-xl bg-gradient-to-t from-[#D96B43] to-[#EB8B67] flex items-center justify-center text-white text-[11px] font-bold shadow-sm">
                {telemetry.targetMoistureThreshold}%
              </div>
              <span className="text-[10px] text-neutral-400 font-medium">Target</span>
            </div>
          </div>
        </div>

        {/* Sensor and threshold values */}
        <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-center">
          {[
            { label: `Min ${telemetry.minMoistureThreshold}%`, val: telemetry.minMoistureThreshold, max: 100 },
            { label: `Target ${telemetry.targetMoistureThreshold}%`, val: telemetry.targetMoistureThreshold, max: 100 },
            { label: `${telemetry.temperature ?? '—'}°C`, val: telemetry.temperature ?? 0, max: 50 },
            { label: `${telemetry.humidity ?? '—'}%`, val: telemetry.humidity ?? 0, max: 100 },
            { label: `${telemetry.light ?? '—'}lx`, val: telemetry.light ?? 0, max: 1000 }
          ].map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="w-8 h-1.5 bg-[#E6ECE8] rounded-full mx-auto overflow-hidden">
                <div
                  className="h-full bg-[#227C4F] rounded-full"
                  style={{ width: `${(item.val / item.max) * 100}%` }}
                />
              </div>
              <span className="text-[9px] font-medium text-neutral-400">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* BHOOMIFI AUTOMATION LOGIC CARD (Replaces AI Insight) */}
      <div className="relative bg-white rounded-[32px] p-5 border border-black/[0.04] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg bg-[#E7F3EC] text-[#227C4F] flex items-center justify-center">
            <Cpu className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-sm font-bold text-neutral-900">Irrigation Automation Logic</h3>
        </div>

        <p className="text-xs text-neutral-600 leading-relaxed pr-6">
          In AUTO mode, the relay starts the pump below {telemetry.minMoistureThreshold}% moisture and stops it at {telemetry.targetMoistureThreshold}%. MANUAL mode follows the pump controls.
        </p>

        <div className="mt-3 flex items-center justify-between pt-2 border-t border-neutral-100/80 text-[11px]">
          <span className="text-[#227C4F] font-semibold">Pump: {telemetry.pumpStatus ?? '—'} • Mode: {telemetry.autoMode ? 'AUTO' : 'MANUAL'}</span>
          <button
            onClick={onNavigateToIrrigation}
            className="text-xs font-bold text-[#227C4F] hover:underline"
          >
            Manage Irrigation →
          </button>
        </div>
      </div>
    </div>
  );
};
