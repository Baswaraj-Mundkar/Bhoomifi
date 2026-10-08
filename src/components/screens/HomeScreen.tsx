 'use client';

 import React, { useState } from 'react';
import {
  RotateCw,
  Maximize2,
  ChevronDown,
  ArrowUpRight,
  Sprout,
  Sliders,
  Power,
  Cpu,
  Droplets,
  Sun,
  Thermometer,
  Check
} from 'lucide-react';
import { ClimateGauge } from '@/components/ui/ClimateGauge';
import { SegmentedProgressBar } from '@/components/ui/SegmentedProgressBar';
import {
  BhoomiFiTelemetry,
  HardwareModule,
  HomeSubTab
} from '@/types';

interface HomeScreenProps {
  telemetry: BhoomiFiTelemetry;
  hardware: HardwareModule[];
  onTogglePump: () => void;
  onToggleMode: () => void;
  onRefreshMetrics: () => void;
  onNavigateToTab: (tab: 'field' | 'irrigation' | 'history' | 'settings') => void;
  isDemoMode: boolean;
  canControl: boolean;
}

function getTimestampDisplay(timestamp: string | null): { day: string; month: string } {
  if (!timestamp) return { day: '—', month: '' };
  const date = new Date(timestamp);
  return {
    day: String(date.getUTCDate()).padStart(2, '0'),
    month: date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })
  };
}

function formatUtcTimestamp(timestamp: string | null): string {
  if (!timestamp) return 'No live readings';
  const date = new Date(timestamp);
  return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  telemetry,
  hardware,
  onTogglePump,
  onToggleMode,
  onRefreshMetrics,
  onNavigateToTab,
  isDemoMode,
  canControl
}) => {
  const [subTab, setSubTab] = useState<HomeSubTab>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    onRefreshMetrics();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const isPumpOn = telemetry.pumpStatus === 'ON';
  const today = getTimestampDisplay(telemetry.timestamp);
  const operationMode = telemetry.autoMode ? 'AUTO' : 'MANUAL';
  const pumpReason = telemetry.pumpStatus === null
    ? 'Waiting for live device data.'
    : telemetry.autoMode
    ? isPumpOn
      ? `Below ${telemetry.minMoistureThreshold}% minimum; running to ${telemetry.targetMoistureThreshold}%.`
      : telemetry.soilMoisture !== null && telemetry.soilMoisture >= telemetry.targetMoistureThreshold
        ? `Target reached; stopped at ${telemetry.soilMoisture}%.`
        : telemetry.soilMoisture !== null && telemetry.soilMoisture < telemetry.minMoistureThreshold
          ? `Below minimum; pump is OFF pending a live device connection.`
          : `In the ${telemetry.minMoistureThreshold}–${telemetry.targetMoistureThreshold - 1}% hold band; pump state unchanged.`
    : isPumpOn ? 'Pump started manually.' : 'Pump stopped manually.';

  // Determine moisture status label from current reading
  const getMoistureStatus = (): { label: string; className: string } => {
    if (telemetry.soilMoisture === null) {
      return { label: 'Unavailable', className: 'text-neutral-600 bg-neutral-100' };
    }
    if (telemetry.soilMoisture < 35) {
      return { label: 'Dry', className: 'text-amber-700 bg-amber-100' };
    }
    if (telemetry.soilMoisture >= 45) {
      return { label: 'Adequate', className: 'text-emerald-700 bg-emerald-100' };
    }
    return { label: 'Needs Water', className: 'text-amber-700 bg-amber-100' };
  };

  const moistureStatus = getMoistureStatus();
  const lastUpdate = formatUtcTimestamp(telemetry.timestamp);

  return (
    <div className="space-y-4 px-5 pb-8">
      {/* Heading */}
      <div className="pt-2">
        <h1 className="text-[32px] font-bold text-[#141B18] tracking-tight leading-tight">
          BhoomiFi Overview
        </h1>
        <p className="text-[11px] text-neutral-400 font-medium">ESP32-WROOM-32 • {isDemoMode ? 'DEMO MODE' : telemetry.deviceStatus}</p>
      </div>

      {/* Sub-tab Pill Switcher */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSubTab(subTab === 'overview' ? 'monitoring' : 'overview')}
          className="w-10 h-10 rounded-2xl bg-white border border-neutral-200/80 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 shadow-sm transition-colors"
          title="Toggle Overview / Diagnostics"
        >
          <Sliders className="w-4 h-4 text-neutral-600" />
        </button>

        <div className="bg-[#EBECEB] p-1 rounded-2xl flex items-center gap-1">
          <button
            onClick={() => setSubTab('overview')}
            className={`px-5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
              subTab === 'overview'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setSubTab('monitoring')}
            className={`px-5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
              subTab === 'monitoring'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Diagnostics
          </button>
        </div>
      </div>

      {/* VIEW 1: OVERVIEW TAB */}
      {subTab === 'overview' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Main Rounded Schedule & Telemetry Card */}
          <div className="bg-white rounded-[32px] p-5 border border-black/[0.04] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] space-y-5">
            {/* Top Row: System Status & Actuator Controls */}
            <div className="grid grid-cols-12 gap-3 pb-3 border-b border-neutral-100">
              {/* Left Column: ESP32 Device & Date Status */}
              <div className="col-span-5 flex flex-col justify-between pr-2 border-r border-neutral-100">
                <div>
                  <div className="flex items-center gap-1.5 text-neutral-700">
                    <span className={`w-2 h-2 rounded-full ${telemetry.deviceStatus === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`}></span>
                    <span className="text-xs font-bold tracking-tight">ESP32 Device</span>
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-0.5 leading-snug">
                    Status: <span className={`font-semibold ${telemetry.deviceStatus === 'ONLINE' ? 'text-emerald-700' : 'text-neutral-600'}`}>{telemetry.deviceStatus}</span>
                  </p>
                </div>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-[#151B18] tracking-tight">{today.day}</span>
                  <span className="text-xs font-semibold text-neutral-500">{today.month}</span>
                </div>
              </div>

              {/* Right Column: Actuator & Threshold Status */}
              <div className="col-span-7 pl-1 space-y-2">
                {/* Pump Status Card */}
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#F6F7F6] border border-neutral-200/50 hover:border-neutral-300 transition-colors">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-neutral-700 shadow-2xs shrink-0">
                      <Power className={`w-3 h-3 ${isPumpOn ? 'text-emerald-600' : 'text-neutral-500'}`} />
                    </div>
                    <div className="truncate">
                      <h4 className="text-[11px] font-bold text-neutral-900 truncate">
                        Water Pump
                      </h4>
                      <p className="text-[9px] text-neutral-400 truncate" title={pumpReason}>
                        {pumpReason}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 ml-1 ${
                      isPumpOn ? 'bg-emerald-600 text-white animate-pulse' : 'bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    {telemetry.pumpStatus ?? '—'}
                  </span>
                </div>

                {/* Automation Mode Card */}
                <div
                  onClick={() => {
                    if (canControl) onToggleMode();
                  }}
                  aria-disabled={!canControl}
                  className={`flex items-center justify-between p-2.5 rounded-2xl bg-[#F6F7F6] border border-neutral-200/50 hover:border-neutral-300 transition-colors ${canControl ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  title="Click to toggle between AUTO and MANUAL mode"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-neutral-700 shadow-2xs shrink-0">
                      <Droplets className="w-3 h-3 text-[#227C4F]" />
                    </div>
                    <div className="truncate">
                      <h4 className="text-[11px] font-bold text-neutral-900 truncate">
                        Irrigation Mode
                      </h4>
                      <p className="text-[9px] text-neutral-400 truncate">
                        Min {telemetry.minMoistureThreshold}% • Target {telemetry.targetMoistureThreshold}%
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#227C4F] text-white shrink-0 ml-1">
                    {operationMode}
                  </span>
                </div>
              </div>
            </div>

            {/* Sub-Cards Row: Soil Moisture & DHT11 Microclimate */}
            <div className="grid grid-cols-2 gap-3">
              {/* Card 1: Soil Moisture */}
              <div
                onClick={() => onNavigateToTab('irrigation')}
                className="bg-[#F3F5F4] rounded-[24px] p-4 flex flex-col justify-between min-h-[140px] cursor-pointer hover:bg-[#EDF2EF] transition-colors"
              >
                <div className="flex items-center gap-2 text-neutral-800">
                  <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#227C4F] shadow-2xs">
                    <Sprout className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-semibold leading-tight text-neutral-700">
                    Soil Moisture
                  </span>
                </div>

                <div className="mt-4">
                  <span className="text-3xl font-extrabold text-[#151B18] tracking-tight">
                    {telemetry.soilMoisture === null ? '—' : `${telemetry.soilMoisture}%`}
                  </span>
                  <span className={`text-[10px] font-bold ml-1.5 px-1.5 py-0.5 rounded-md ${moistureStatus.className}`}>
                    {moistureStatus.label}
                  </span>
                  <p className="text-[10px] text-neutral-400 mt-1">
                    HW-080 • ADC {telemetry.soilRawADC ?? '—'} • GPIO32
                  </p>
                </div>
              </div>

              {/* Card 2: Climate Overview with Arch Gauge */}
              <div className="bg-[#F3F5F4] rounded-[24px] p-4 flex flex-col justify-between min-h-[140px]">
                <ClimateGauge
                  temperature={telemetry.temperature}
                  humidity={telemetry.humidity}
                  light={telemetry.light}
                  isDemoMode={isDemoMode}
                  deviceStatus={telemetry.deviceStatus}
                  maxTemperature={35}
                />
              </div>
            </div>
          </div>

          {/* BhoomiFi Telemetry Summary Card */}
          <div className="bg-white rounded-[32px] p-5 border border-black/[0.04] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">BhoomiFi {isDemoMode ? 'Demo' : telemetry.deviceStatus === 'ONLINE' ? 'Live ESP32' : 'Offline ESP32'} Telemetry</h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  ESP32-WROOM-32 • {isDemoMode ? 'DEMO MODE' : telemetry.deviceStatus} • Last update: {lastUpdate}
                  {!isDemoMode && telemetry.lastSeen && ` • Last seen: ${formatUtcTimestamp(telemetry.lastSeen)}`}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleRefresh}
                  className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors"
                  disabled={!isDemoMode}
                  title={isDemoMode ? 'Restore standard demo readings' : 'Waiting for live ESP32/Firebase data'}
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => onNavigateToTab('history')}
                  className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors"
                  title="View sensor history"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 4 Metric Columns */}
            <div className="grid grid-cols-4 gap-2 pt-1 text-left">
              <div>
                <span className="text-2xl font-extrabold text-neutral-900 tracking-tight">
                  {telemetry.soilMoisture === null ? '—' : `${telemetry.soilMoisture}%`}
                </span>
                <p className="text-[10px] text-neutral-400 font-medium mt-0.5">Moisture</p>
              </div>

              <div>
                <span className="text-2xl font-extrabold text-neutral-900 tracking-tight">
                  {telemetry.temperature === null ? '—' : `${telemetry.temperature}°`}
                </span>
                <p className="text-[10px] text-neutral-400 font-medium mt-0.5">Temp (°C)</p>
              </div>

              <div>
                <span className="text-2xl font-extrabold text-neutral-900 tracking-tight">
                  {telemetry.humidity === null ? '—' : `${telemetry.humidity}%`}
                </span>
                <p className="text-[10px] text-neutral-400 font-medium mt-0.5">Humidity</p>
              </div>

              <div>
                <span className="text-2xl font-extrabold text-neutral-900 tracking-tight">
                  {telemetry.light ?? '—'}
                </span>
                <p className="text-[10px] text-neutral-400 font-medium mt-0.5">Lux</p>
              </div>
            </div>

            {/* Segmented bar for Soil Moisture Level */}
            <div className="pt-2">
              {telemetry.soilMoisture === null ? (
                <p className="text-center text-[11px] text-neutral-400">No live soil reading</p>
              ) : (
              <SegmentedProgressBar
                percentage={telemetry.soilMoisture}
                totalBars={46}
                leftLabel="Dry (0%)"
                rightLabel="Hydrated (100%)"
              />
              )}
            </div>
          </div>

          {/* HW-080 Probe & Relay Status Card */}
          <div className="bg-white rounded-[24px] p-4 border border-black/[0.04] shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-[#E7F3EC] text-[#227C4F] flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-neutral-900">Soil Sensor &amp; Pump Relay</h4>
                <p className="text-[11px] text-neutral-400">GPIO32 • GPIO25 • {isDemoMode ? 'Demo status' : telemetry.deviceStatus}</p>
              </div>
            </div>

            <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-[#E7F3EC] text-[#227C4F]">
              Pump {telemetry.pumpStatus ?? '—'}
            </span>
          </div>
        </div>
      )}

      {/* VIEW 2: DIAGNOSTICS & HARDWARE TAB */}
      {subTab === 'monitoring' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Action and Filter Pills Row */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white border border-neutral-200/80 text-xs font-semibold text-neutral-800 shadow-2xs">
                <span>ESP32 Node 01</span>
                <span className={`w-1.5 h-1.5 rounded-full ${telemetry.deviceStatus === 'ONLINE' ? 'bg-emerald-500' : 'bg-neutral-400'}`}></span>
              </div>
              <button
                onClick={onToggleMode}
                disabled={!canControl}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white border border-neutral-200/80 text-xs font-semibold text-neutral-800 shadow-2xs hover:bg-neutral-50"
              >
                <span>Mode: {operationMode}</span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
              </button>
            </div>

            <button
              onClick={onTogglePump}
              disabled={!canControl || telemetry.autoMode || telemetry.pumpStatus === null}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-white text-xs font-bold shadow-sm transition-all duration-200 shrink-0 ${
                isPumpOn ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#227C4F] hover:bg-[#1A633F]'
              }`}
            >
              <Power className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isPumpOn ? 'Stop Pump' : 'Start Pump'}</span>
            </button>
          </div>

          {/* Overall Node Health Card */}
          <div className="bg-white rounded-[32px] p-5 border border-black/[0.04] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between">
              <div className="space-y-3 max-w-[50%]">
                <h3 className="text-sm font-bold text-neutral-900">ESP32 Device Status</h3>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                  telemetry.deviceStatus === 'ONLINE' ? 'bg-[#227C4F] text-white' : 'bg-neutral-200 text-neutral-700'
                }`}>
                  {telemetry.deviceStatus}
                </span>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  {isDemoMode
                    ? 'Demo device state only; these are sample sensor readings.'
                    : telemetry.deviceStatus === 'ONLINE'
                      ? 'Live readings are arriving from the ESP32 through Firebase.'
                      : `No recent ESP32 heartbeat. Last known readings are retained${telemetry.lastSeen ? `; last seen ${formatUtcTimestamp(telemetry.lastSeen)}` : ''}.`}
                </p>
              </div>

              <div className="shrink-0 rounded-2xl bg-[#F3F5F4] px-4 py-3 text-right">
                <span className="block text-xl font-extrabold text-neutral-900">{telemetry.pumpStatus ?? '—'}</span>
                <span className="text-[10px] font-semibold text-neutral-500">Pump • {operationMode}</span>
              </div>
            </div>
          </div>

          {/* Hardware Modules Status Card */}
          <div className="bg-white rounded-[32px] p-5 border border-black/[0.04] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1 text-xs text-neutral-500 font-medium">
                  <span>Hardware Modules</span>
                  <span className="w-3.5 h-3.5 rounded-full border border-neutral-300 text-[9px] flex items-center justify-center text-neutral-400">
                    i
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-extrabold text-neutral-900 tracking-tight">
                    {hardware.length}
                  </span>
                    <span className="text-xs font-semibold text-neutral-400">Components</span>
                </div>
              </div>

              <button
                onClick={() => onNavigateToTab('settings')}
                className="w-8 h-8 rounded-full bg-neutral-50 hover:bg-neutral-100 flex items-center justify-center text-neutral-600 transition-colors"
              >
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            {/* Three Breakdown Blocks */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {/* Relay Module */}
              <div className="bg-[#FAF7F4] rounded-2xl p-3 border border-amber-200/40 relative overflow-hidden">
                <span className="text-[10px] font-bold text-neutral-700 block">
                  Relay (GPIO25)
                </span>
                <div className="w-full h-1.5 bg-amber-500 rounded-full mt-2.5"></div>
              </div>

              {/* Pump Module */}
              <div className="bg-[#F0F5F2] rounded-2xl p-3 border border-emerald-200/40">
                <span className="text-[10px] font-bold text-neutral-700 block">
                  Pump Status
                </span>
                <div className="w-full h-5 bg-[#E1EDE6] rounded-lg mt-2 flex items-center justify-center text-[9px] text-[#227C4F] font-semibold">
                  {telemetry.pumpStatus ?? '—'}
                </div>
              </div>

              {/* Active Sensor Bus */}
              <div className="bg-[#EDF6F1] rounded-2xl p-3 border border-[#227C4F]/20">
                <span className="text-[10px] font-bold text-neutral-800 block">
                  {isDemoMode ? 'Demo Readings (4)' : 'Readings unavailable'}
                </span>
                <div className="flex items-center gap-[2px] mt-2 h-5 w-full">
                  {isDemoMode ? Array.from({ length: 14 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 h-full bg-[#227C4F]/70 rounded-sm"
                      style={{ opacity: 0.5 + (i % 3) * 0.2 }}
                    />
                  )) : <span className="text-[9px] text-neutral-400">Waiting for data</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Sensor Channels List */}
          <div className="space-y-3">
            {/* Channel 1: Soil Moisture */}
            <div
              onClick={() => onNavigateToTab('irrigation')}
              className="bg-white rounded-[28px] p-4 border border-black/[0.04] shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-neutral-900">Soil Moisture Sensor</h4>
                  <div className="w-4 h-4 rounded-full bg-[#E7F3EC] text-[#227C4F] flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-[#227C4F]"></span>
                  <span className="font-semibold text-neutral-700">
                    {telemetry.soilMoisture === null ? 'No live reading' : telemetry.soilMoisture < 35 ? 'Dry' : telemetry.soilMoisture < 45 ? 'Needs Water' : 'Adequate'}
                  </span>
                </div>

                <p className="text-xs text-neutral-400">
                  HW-080 • GPIO32 • ADC {telemetry.soilRawADC ?? '—'} • {telemetry.soilMoisture === null ? 'No reading' : `${telemetry.soilMoisture}%`}
                </p>
              </div>

              <div className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#E7F3EC] text-[#227C4F]">
                {telemetry.soilMoisture === null ? '—' : `${telemetry.soilMoisture}%`}
              </div>
            </div>

            {/* Channel 2: Ambient Light BH1750 */}
            <div className="bg-white rounded-[28px] p-4 border border-black/[0.04] shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-neutral-900">BH1750 Ambient Light</h4>
                  <div className="w-4 h-4 rounded-full bg-[#E7F3EC] text-[#227C4F] flex items-center justify-center">
                    <Sun className="w-2.5 h-2.5 text-amber-500" />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="font-semibold text-neutral-700">
                    {telemetry.light === null ? 'No live reading' : telemetry.light > 500 ? 'High Light' : telemetry.light > 100 ? 'Daylight Sun' : 'Low Light'}
                  </span>
                </div>

                <p className="text-xs text-neutral-400">
                  I2C Bus (GPIO21/22) • Reading: {telemetry.light ?? '—'} lux
                </p>
              </div>

              <div className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100/70 text-amber-800">
                {telemetry.light === null ? '—' : `${telemetry.light} lux`}
              </div>
            </div>

            {/* Channel 3: DHT11 Temp & Humidity */}
            <div className="bg-white rounded-[28px] p-4 border border-black/[0.04] shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-neutral-900">DHT11 Temp &amp; Humidity</h4>
                  <div className="w-4 h-4 rounded-full bg-[#E7F3EC] text-[#227C4F] flex items-center justify-center">
                    <Thermometer className="w-2.5 h-2.5 text-emerald-600" />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-[#227C4F]"></span>
                  <span className="font-semibold text-neutral-700">Stable Microclimate</span>
                </div>

                <p className="text-xs text-neutral-400">
                  GPIO4 • {telemetry.temperature ?? '—'}°C / {telemetry.humidity ?? '—'}% RH
                </p>
              </div>

              <div className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#E7F3EC] text-[#227C4F]">
                {telemetry.temperature === null ? '—' : `${telemetry.temperature}°C`}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
