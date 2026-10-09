'use client';

import React from 'react';
import {
  NavigationTab,
  BhoomiFiTelemetry,
  HardwareModule,
  IrrigationLog,
  SensorHistoryPoint,
  DeviceSettings
} from '@/types';
import { HomeScreen } from '@/components/screens/HomeScreen';
import { FieldScreen } from '@/components/screens/FieldScreen';
import { IrrigationScreen } from '@/components/screens/IrrigationScreen';
import { HistoryScreen } from '@/components/screens/HistoryScreen';
import { SettingsScreen } from '@/components/screens/SettingsScreen';
import { Sprout, Power, Search, Bell } from 'lucide-react';
import type { FirebaseConnectionStatus, FirebaseSetupStatus } from '@/data/firebaseService';

interface DesktopViewProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  telemetry: BhoomiFiTelemetry;
  hardware: HardwareModule[];
  irrigationLogs: IrrigationLog[];
  sensorHistory: SensorHistoryPoint[];
  settings: DeviceSettings;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onTogglePump: () => void;
  onToggleMode: () => void;
  onRefreshMetrics: () => void;
  onUpdateTelemetry: (t: Partial<BhoomiFiTelemetry>) => void;
  onSimulateDryEvent: () => void;
  onSimulateIrrigation: () => void;
  onResetDemo: () => void;
  onSetDemoMode: (demoMode: boolean) => void;
  canControl: boolean;
  commandError: string | null;
  connectionMessage: string;
  firebaseUid: string | null;
  firebaseConfigured: boolean;
  authLoading: boolean;
  authActionLoading: boolean;
  authError: string | null;
  firebaseConnectionStatus: FirebaseConnectionStatus;
  firebaseSetupStatus: FirebaseSetupStatus;
  pendingCommand: string | null;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}

export const DesktopView: React.FC<DesktopViewProps> = ({
  currentTab,
  onTabChange,
  telemetry,
  hardware,
  irrigationLogs,
  sensorHistory,
  settings,
  onOpenSearch,
  onOpenNotifications,
  onTogglePump,
  onToggleMode,
  onRefreshMetrics,
  onUpdateTelemetry,
  onSimulateDryEvent,
  onSimulateIrrigation,
  onResetDemo,
  onSetDemoMode,
  canControl,
  commandError,
  connectionMessage,
  firebaseUid,
  firebaseConfigured,
  authLoading,
  authActionLoading,
  authError,
  firebaseConnectionStatus,
  firebaseSetupStatus,
  pendingCommand,
  onSignIn,
  onSignOut
}) => {
  const isPumpOn = telemetry.pumpStatus === 'ON';

  return (
    <div className="min-h-screen bg-[#F3F4F3] text-neutral-900 pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-neutral-200/70 px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Demo pill */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E7F3EC] flex items-center justify-center text-[#227C4F] shadow-sm">
              <Sprout className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-neutral-900">
                  Bhoomi<span className="text-[#227C4F]">Fi</span>
                </span>
                <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-[#E7F3EC] text-[#227C4F]">
                  {settings.demoMode ? 'Demo Mode' : telemetry.deviceStatus === 'ONLINE' ? 'LIVE' : telemetry.deviceStatus}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">ESP32 IoT Irrigation Intelligence</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-[#EBECEB] p-1.5 rounded-2xl">
            {(
              [
                { id: 'home', label: 'Dashboard' },
                { id: 'field', label: 'Field Deployment' },
                { id: 'irrigation', label: 'Irrigation & Pump' },
                { id: 'history', label: 'Telemetry History' },
                { id: 'settings', label: 'Device Settings' }
              ] as Array<{ id: NavigationTab; label: string }>
            ).map((tab) => {
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-900 hover:bg-white/40'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenSearch}
              className="w-10 h-10 rounded-2xl bg-white border border-neutral-200/80 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 shadow-2xs transition-colors"
              title="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenNotifications}
              className="relative w-10 h-10 rounded-2xl bg-white border border-neutral-200/80 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 shadow-2xs transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
            </button>

            <button
              onClick={onTogglePump}
              disabled={!canControl || telemetry.autoMode !== false || telemetry.pumpStatus === null}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-white text-xs font-bold shadow-sm transition-all ${
                isPumpOn ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#227C4F] hover:bg-[#1A633F]'
              }`}
            >
              <Power className="w-4 h-4 stroke-[2.5]" />
              <span>{isPumpOn ? 'Stop Pump' : 'Start Pump'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-8 pt-8">
        {commandError && (
          <p role="alert" className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-800">
            {commandError}
          </p>
        )}
        {pendingCommand && (
          <p role="status" className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
            {pendingCommand}
          </p>
        )}
        {currentTab === 'home' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-extrabold text-[#141B18] tracking-tight">
                  BhoomiFi IoT Operations Console
                </h1>
                <p className="text-xs text-neutral-500 mt-1">
                  Node: {settings.deviceId} • ESP32-WROOM-32 • Moisture: {telemetry.soilMoisture === null ? '—' : `${telemetry.soilMoisture}%`} • Temp: {telemetry.temperature === null ? '—' : `${telemetry.temperature}°C`} • Lux: {telemetry.light ?? '—'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 ${
                  telemetry.deviceStatus === 'ONLINE' ? 'text-[#227C4F] bg-[#E7F3EC]' : 'text-amber-700 bg-amber-50'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${telemetry.deviceStatus === 'ONLINE' ? 'bg-[#227C4F] animate-pulse' : 'bg-amber-600'}`} />
                  ESP32 {telemetry.deviceStatus}
                </span>
                <span className="text-xs font-semibold text-neutral-700 bg-white border border-neutral-200 px-3 py-1 rounded-full">
                  Mode: {telemetry.autoMode === null ? 'Unavailable' : telemetry.autoMode ? 'AUTO' : 'MANUAL'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Home Telemetry */}
              <div className="lg:col-span-6 space-y-6">
                <HomeScreen
                  telemetry={telemetry}
                  hardware={hardware}
                  onTogglePump={onTogglePump}
                  onToggleMode={onToggleMode}
                  onRefreshMetrics={onRefreshMetrics}
                  onNavigateToTab={onTabChange}
                  isDemoMode={settings.demoMode}
                  canControl={canControl}
                />
              </div>

              {/* Right Column: Field Deployment Preview */}
              <div className="lg:col-span-6 space-y-6">
                <FieldScreen
                  telemetry={telemetry}
                  isDemoMode={settings.demoMode}
                  onBack={() => onTabChange('home')}
                  onNavigateToIrrigation={() => onTabChange('irrigation')}
                />
              </div>
            </div>
          </div>
        )}

        {currentTab === 'field' && (
          <div className="max-w-2xl mx-auto">
            <FieldScreen
              telemetry={telemetry}
              isDemoMode={settings.demoMode}
              onBack={() => onTabChange('home')}
              onNavigateToIrrigation={() => onTabChange('irrigation')}
            />
          </div>
        )}

        {currentTab === 'irrigation' && (
          <div className="max-w-2xl mx-auto">
            <IrrigationScreen
              telemetry={telemetry}
              logs={irrigationLogs}
              canControl={canControl}
              onTogglePump={onTogglePump}
              onToggleMode={onToggleMode}
              onUpdateThresholds={(min, target) => {
                onUpdateTelemetry({ minMoistureThreshold: min, targetMoistureThreshold: target });
              }}
              isDemoMode={settings.demoMode}
            />
          </div>
        )}

        {currentTab === 'history' && (
          <div className="max-w-3xl mx-auto">
            <HistoryScreen
              irrigationLogs={irrigationLogs}
              sensorHistory={sensorHistory}
              isDemoMode={settings.demoMode}
              deviceStatus={telemetry.deviceStatus}
            />
          </div>
        )}

        {currentTab === 'settings' && (
          <div className="max-w-2xl mx-auto">
            <SettingsScreen
              telemetry={telemetry}
              settings={settings}
              onUpdateTelemetry={onUpdateTelemetry}
              onSimulateDryEvent={onSimulateDryEvent}
              onSimulateIrrigation={onSimulateIrrigation}
              onResetDemo={onResetDemo}
              onSetDemoMode={onSetDemoMode}
              connectionMessage={connectionMessage}
              firebaseUid={firebaseUid}
              canControl={canControl}
              firebaseConfigured={firebaseConfigured}
              authLoading={authLoading}
              authActionLoading={authActionLoading}
              authError={authError}
              firebaseConnectionStatus={firebaseConnectionStatus}
              firebaseSetupStatus={firebaseSetupStatus}
              onSignIn={onSignIn}
              onSignOut={onSignOut}
            />
          </div>
        )}
      </main>
    </div>
  );
};
