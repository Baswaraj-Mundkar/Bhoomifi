'use client';

import React from 'react';
import { DeviceFrame } from '@/components/DeviceFrame';
import { Header } from '@/components/Header';
import { Navbar } from '@/components/Navbar';
import { HomeScreen } from '@/components/screens/HomeScreen';
import { FieldScreen } from '@/components/screens/FieldScreen';
import {
  NavigationTab,
  BhoomiFiTelemetry,
  HardwareModule,
  IrrigationLog,
  SensorHistoryPoint,
  DeviceSettings
} from '@/types';

interface ShowcaseViewProps {
  telemetry: BhoomiFiTelemetry;
  hardware: HardwareModule[];
  irrigationLogs: IrrigationLog[];
  sensorHistory: SensorHistoryPoint[];
  settings: DeviceSettings;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onOpenSettings: () => void;
  onTogglePump: () => void;
  onToggleMode: () => void;
  onRefreshMetrics: () => void;
  onNavigateToTab: (tab: NavigationTab) => void;
  canControl: boolean;
  pendingCommand: string | null;
}

export const ShowcaseView: React.FC<ShowcaseViewProps> = ({
  telemetry,
  hardware,
  onOpenSearch,
  onOpenNotifications,
  onOpenSettings,
  onTogglePump,
  onToggleMode,
  onRefreshMetrics,
  onNavigateToTab,
  settings,
  canControl,
  pendingCommand
}) => {
  return (
    <div className="w-full min-h-screen bg-[#DCDEDD] py-12 px-4 flex flex-col items-center justify-center">
      {/* Presentation Banner */}
      <div className="text-center max-w-xl mb-8 space-y-2">
        <span className="text-xs font-bold tracking-widest uppercase text-[#227C4F] bg-white/80 px-4 py-1 rounded-full shadow-2xs">
          BhoomiFi IoT Hardware Ecosystem
        </span>
        <h2 className="text-3xl font-extrabold text-[#151B18] tracking-tight">
          ESP32-WROOM-32 Smart Irrigation
        </h2>
        <p className="text-xs text-neutral-600">
          {settings.demoMode ? 'DEMO MODE • ' : `${telemetry.deviceStatus} • `}
          Soil Moisture ({telemetry.soilMoisture === null ? '—' : `${telemetry.soilMoisture}%`}) •
          DHT11 ({telemetry.temperature === null ? '—' : `${telemetry.temperature}°C`}, {telemetry.humidity ?? '—'}% RH) •
          BH1750 ({telemetry.light ?? '—'} lux) • Relay &amp; Water Pump • {telemetry.autoMode === null ? 'Unavailable' : telemetry.autoMode ? 'AUTO' : 'MANUAL'} Mode
        </p>
        {pendingCommand && (
          <p role="status" className="mx-auto mt-3 max-w-2xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
            {pendingCommand}
          </p>
        )}
      </div>

      {/* 3 Devices Side-by-Side matching reference photo */}
      <div className="flex flex-wrap items-center justify-center gap-8 max-w-[1400px] w-full">
        {/* Device 1: Screen 1 (HomeScreen Overview) */}
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wider">
            Screen 1 • {settings.demoMode ? 'Demo' : 'Live'} Overview & Telemetry
          </span>
          <div className="w-[380px]">
            <DeviceFrame time="9:41">
              <Header
                onOpenSearch={onOpenSearch}
                onOpenNotifications={onOpenNotifications}
                onOpenSettings={onOpenSettings}
                isDemoMode={settings.demoMode}
                deviceStatus={telemetry.deviceStatus}
              />
              <HomeScreen
                telemetry={telemetry}
                hardware={hardware}
                onTogglePump={onTogglePump}
                onToggleMode={onToggleMode}
                onRefreshMetrics={onRefreshMetrics}
                onNavigateToTab={onNavigateToTab}
                isDemoMode={settings.demoMode}
                canControl={canControl}
              />
              <Navbar
                currentTab="home"
                onTabChange={onNavigateToTab}
                isDemoMode={settings.demoMode}
                deviceStatus={telemetry.deviceStatus}
              />
            </DeviceFrame>
          </div>
        </div>

        {/* Device 2: Screen 2 (FieldScreen Deployment & Thresholds) */}
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wider">
            Screen 2 • {settings.demoMode ? 'Demo' : 'Live'} Field & Thresholds
          </span>
          <div className="w-[380px]">
            <DeviceFrame time="9:41">
              <FieldScreen
                telemetry={telemetry}
                isDemoMode={settings.demoMode}
                onBack={() => onNavigateToTab('home')}
                onNavigateToIrrigation={() => onNavigateToTab('irrigation')}
              />
              <Navbar
                currentTab="field"
                onTabChange={onNavigateToTab}
                isDemoMode={settings.demoMode}
                deviceStatus={telemetry.deviceStatus}
              />
            </DeviceFrame>
          </div>
        </div>

        {/* Device 3: Screen 3 (Diagnostics & Sensor Channels) */}
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wider">
            Screen 3 • Diagnostics & Sensor Channels
          </span>
          <div className="w-[380px]">
            <DeviceFrame time="9:41">
              <Header
                onOpenSearch={onOpenSearch}
                onOpenNotifications={onOpenNotifications}
                onOpenSettings={onOpenSettings}
                isDemoMode={settings.demoMode}
                deviceStatus={telemetry.deviceStatus}
              />
              <div className="space-y-4 px-5 pb-8">
                <div className="pt-2">
                  <h1 className="text-[32px] font-bold text-[#141B18] tracking-tight leading-tight">
                    Your Farm
                  </h1>
                  <p className="text-[11px] text-neutral-400 font-medium">ESP32 Diagnostics & Hardware</p>
                </div>

                {/* Filter and Action row */}
                <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
                  <div className="flex items-center gap-2">
                    <span className="px-3.5 py-2 rounded-2xl bg-white border border-neutral-200/80 text-xs font-semibold text-neutral-800 shadow-2xs">
                      {settings.deviceId} ⌵
                    </span>
                    <span className="px-3.5 py-2 rounded-2xl bg-white border border-neutral-200/80 text-xs font-semibold text-neutral-800 shadow-2xs">
                      Mode: {telemetry.autoMode === null ? 'Unavailable' : telemetry.autoMode ? 'AUTO' : 'MANUAL'} ⌵
                    </span>
                  </div>

                  <button
                    onClick={onTogglePump}
                    disabled={!canControl || telemetry.autoMode !== false || telemetry.pumpStatus === null}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#227C4F] text-white text-xs font-bold shadow-sm"
                  >
                    <span>{telemetry.pumpStatus === 'ON' ? 'Stop Pump' : 'Start Pump'}</span>
                  </button>
                </div>

                {/* Overall Health Card */}
                <div className="bg-white rounded-[32px] p-5 border border-black/[0.04] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center justify-between">
                    <div className="space-y-3 max-w-[50%]">
                      <h3 className="text-sm font-bold text-neutral-900">ESP32 Health</h3>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                        telemetry.deviceStatus === 'ONLINE' ? 'bg-[#227C4F] text-white' : 'bg-neutral-200 text-neutral-700'
                      }`}>
                        {telemetry.deviceStatus}
                      </span>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        {settings.demoMode
                          ? 'Demo state only; these are sample sensor readings.'
                          : telemetry.lastSeen
                            ? `Last device heartbeat ${new Date(telemetry.lastSeen).toLocaleString()}.`
                            : 'No ESP32 heartbeat has been received.'}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center justify-center">
                      <div className="text-center">
                        <span className="text-4xl font-extrabold text-[#151B18] block">{telemetry.deviceStatus}</span>
                        <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Device Status</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hardware Modules Card */}
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
                        <span className="text-xs font-semibold text-neutral-400">Modules</span>
                      </div>
                    </div>
                    <span className="text-neutral-600 font-bold">↗</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="bg-[#FAF7F4] rounded-2xl p-2.5 border border-amber-200/40">
                      <span className="text-[9px] font-bold text-neutral-700 block">
                        Relay (GPIO25)
                      </span>
                      <div className={`w-full h-1 rounded-full mt-2 ${telemetry.pumpStatus === 'ON' ? 'bg-amber-500' : 'bg-neutral-200'}`}></div>
                    </div>

                    <div className="bg-[#F0F5F2] rounded-2xl p-2.5 border border-emerald-200/40">
                      <span className="text-[9px] font-bold text-neutral-700 block">
                        Pump ({telemetry.pumpStatus ?? '—'})
                      </span>
                      <div className="w-full h-4 bg-[#E1EDE6] rounded-md mt-1 flex items-center justify-center text-[8px] text-[#227C4F] font-semibold">
                        {telemetry.pumpStatus === null ? 'Unavailable' : telemetry.pumpStatus === 'ON' ? 'Active' : 'Standby'}
                      </div>
                    </div>

                    <div className="bg-[#EDF6F1] rounded-2xl p-2.5 border border-[#227C4F]/20">
                      <span className="text-[9px] font-bold text-neutral-800 block">
                        {settings.demoMode ? 'Demo Readings (4)' : 'Readings unavailable'}
                      </span>
                      <div className="flex items-center gap-[1px] mt-1 h-4 w-full">
                        {settings.demoMode ? Array.from({ length: 12 }).map((_, i) => (
                          <div
                            key={i}
                            className="flex-1 h-full bg-[#227C4F]/80 rounded-xs"
                            style={{ opacity: 0.6 + (i % 2) * 0.3 }}
                          />
                        )) : <span className="text-[8px] text-neutral-400">Waiting for live data</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sensor Channels */}
                <div className="space-y-2.5">
                  <div className="bg-white rounded-[24px] p-3.5 border border-black/[0.04] shadow-sm flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-neutral-900">Soil Moisture Sensor</h4>
                        <span className="text-xs text-[#227C4F]">✓</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-[#227C4F] font-semibold">
                        <span>
                          ● {telemetry.soilMoisture === null
                            ? 'No live reading'
                            : telemetry.soilMoisture < 35
                              ? 'Dry'
                              : telemetry.soilMoisture < 45
                                ? 'Needs Water'
                                : 'Adequate'}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400">
                        Capacitive v2.0 GPIO32 • ADC {telemetry.soilRawADC ?? '—'}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#E7F3EC] text-[#227C4F]">
                      {telemetry.soilMoisture === null ? '—' : `${telemetry.soilMoisture}%`}
                    </span>
                  </div>

                  <div className="bg-white rounded-[24px] p-3.5 border border-black/[0.04] shadow-sm flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-neutral-900">BH1750 Ambient Light</h4>
                        <span className="text-xs text-amber-500">●</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-amber-600 font-semibold">
                        <span>● {telemetry.light === null ? 'No live reading' : 'BH1750 reading'}</span>
                      </div>
                      <p className="text-[11px] text-neutral-400">I2C (GPIO21/22) • {telemetry.light ?? '—'} lux</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                      {telemetry.light === null ? '—' : `${telemetry.light} lx`}
                    </span>
                  </div>
                </div>
              </div>
              <Navbar
                currentTab="home"
                onTabChange={onNavigateToTab}
                isDemoMode={settings.demoMode}
                deviceStatus={telemetry.deviceStatus}
              />
            </DeviceFrame>
          </div>
        </div>
      </div>
    </div>
  );
};
