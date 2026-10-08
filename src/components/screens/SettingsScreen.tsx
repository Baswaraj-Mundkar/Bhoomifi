'use client';

import React, { useState } from 'react';
import {
  RefreshCw,
  Sun,
  Droplets,
  CheckCircle2,
  LoaderCircle,
  LogOut
} from 'lucide-react';
import { BhoomiFiTelemetry, DeviceSettings, OperationMode } from '@/types';

interface SettingsScreenProps {
  telemetry: BhoomiFiTelemetry;
  settings: DeviceSettings;
  onUpdateTelemetry: (newTelemetry: Partial<BhoomiFiTelemetry>) => void | Promise<void>;
  onSimulateDryEvent: () => void;
  onSimulateIrrigation: () => void;
  onResetDemo: () => void;
  onSetDemoMode: (demoMode: boolean) => void;
  connectionMessage: string;
  firebaseUid: string | null;
  canControl: boolean;
  firebaseConfigured: boolean;
  authLoading: boolean;
  authActionLoading: boolean;
  authError: string | null;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  telemetry,
  settings,
  onUpdateTelemetry,
  onSimulateDryEvent,
  onSimulateIrrigation,
  onResetDemo,
  onSetDemoMode,
  connectionMessage,
  firebaseUid,
  canControl,
  firebaseConfigured,
  authLoading,
  authActionLoading,
  authError,
  onSignIn,
  onSignOut
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleModeChange = async (mode: OperationMode) => {
    await onUpdateTelemetry({ autoMode: mode === 'AUTO' });
    showToast(`Switched mode to ${mode}`);
  };

  return (
    <div className="space-y-4 px-5 pb-8">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#143525] text-white px-4 py-2.5 rounded-full text-xs font-semibold shadow-xl border border-white/20 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Title */}
      <div className="pt-2">
        <h1 className="text-[32px] font-bold text-[#141B18] tracking-tight leading-tight">
          Settings
        </h1>
        <p className="text-xs text-neutral-400 mt-0.5">
          {settings.demoMode ? 'ESP32 Configuration & Demo Simulator' : 'ESP32 Configuration & Live Data'}
        </p>
      </div>

      {/* DEMO MODE CONTROL LAB CARD */}
      <div className="bg-white rounded-[32px] p-5 border border-black/[0.04] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${settings.demoMode || telemetry.deviceStatus === 'ONLINE' ? 'bg-[#227C4F] animate-ping' : 'bg-amber-500'}`} />
            <h3 className="text-sm font-bold text-neutral-900">
              {settings.demoMode ? 'Demo Telemetry Simulator' : 'Live ESP32 / Firebase'}
            </h3>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
            settings.demoMode || telemetry.deviceStatus === 'ONLINE' ? 'bg-[#E7F3EC] text-[#227C4F]' : 'bg-amber-50 text-amber-700'
          }`}>
            {settings.demoMode ? 'DEMO MODE' : telemetry.deviceStatus === 'ONLINE' ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>

        <p className="text-xs text-neutral-500 leading-relaxed">
          {settings.demoMode
            ? 'Demo readings are simulated and are not real sensor data.'
            : telemetry.deviceStatus === 'ONLINE'
              ? `LIVE • Connected to Firebase. Last sensor update: ${telemetry.timestamp ? new Date(telemetry.timestamp).toLocaleString() : 'not reported'}.`
              : `OFFLINE • ${telemetry.lastSeen ? `Last seen ${new Date(telemetry.lastSeen).toLocaleString()}. ` : ''}${connectionMessage || 'Last known readings are retained; no simulated values are shown.'}`}
        </p>

        <div className="flex gap-2">
          <button
            onClick={() => onSetDemoMode(true)}
            className={`flex-1 rounded-xl px-3 py-2 text-[11px] font-bold ${
              settings.demoMode ? 'bg-[#227C4F] text-white' : 'bg-neutral-100 text-neutral-600'
            }`}
          >
            Demo Mode
          </button>
          <button
            onClick={() => onSetDemoMode(false)}
            className={`flex-1 rounded-xl px-3 py-2 text-[11px] font-bold ${
              !settings.demoMode ? 'bg-[#227C4F] text-white' : 'bg-neutral-100 text-neutral-600'
            }`}
          >
            Live ESP32 Mode
          </button>
        </div>

        {settings.demoMode ? <>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => {
              onSimulateDryEvent();
              showToast('Simulated dry soil (32% < 35% min threshold)');
            }}
            disabled={!settings.demoMode}
            className="p-3 rounded-2xl bg-[#FAF6F2] border border-amber-300/40 hover:bg-[#FDF2E8] text-amber-900 text-left transition-all"
          >
            <div className="flex items-center gap-2 mb-1">
              <Sun className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold">Simulate Dry Soil</span>
            </div>
            <p className="text-[10px] text-neutral-500">Drops moisture to 32% (triggers auto-pump)</p>
          </button>

          <button
            onClick={() => {
              onSimulateIrrigation();
              showToast('Simulated irrigation (moisture rises to target 45% -> 62%)');
            }}
            disabled={!settings.demoMode}
            className="p-3 rounded-2xl bg-[#F0F7F3] border border-[#227C4F]/30 hover:bg-[#E2F2E8] text-[#143525] text-left transition-all"
          >
            <div className="flex items-center gap-2 mb-1">
              <Droplets className="w-4 h-4 text-[#227C4F]" />
              <span className="text-xs font-bold">Simulate Watering</span>
            </div>
            <p className="text-[10px] text-neutral-500">Waters soil to optimal 62% and cuts pump</p>
          </button>
        </div>

        <div className="pt-1">
          <button
            onClick={() => {
              onResetDemo();
              showToast('Reset to default BhoomiFi demo values (Moisture 62%, Temp 30.2°C, 52% RH, 420 lux, Pump OFF, AUTO)');
            }}
            disabled={!settings.demoMode}
            className="w-full py-2.5 px-4 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset to Standard Demo Values</span>
          </button>
        </div>
        </> : (
          <div className="space-y-3">
            <p className="rounded-2xl bg-neutral-50 p-3 text-xs text-neutral-500">
              {connectionMessage || 'Listening for Firestore sensor data and irrigation events.'}
              {firebaseUid && <span className="mt-2 block break-all text-[10px]">Authenticated Firebase UID: {firebaseUid}</span>}
              {telemetry.lastSeen && <span className="mt-1 block">Last device heartbeat: {new Date(telemetry.lastSeen).toLocaleString()}</span>}
              {canControl && <span className="mt-1 block">Manual controls and AUTO settings send commands through Firestore.</span>}
            </p>

            {firebaseConfigured && firebaseUid ? (
              <button
                type="button"
                onClick={() => void onSignOut()}
                disabled={authActionLoading}
                className="w-full rounded-xl bg-neutral-100 px-3 py-2.5 text-xs font-bold text-neutral-700 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {authActionLoading
                  ? <LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" />
                  : <LogOut className="mr-2 inline h-4 w-4" />}
                Sign out
              </button>
            ) : firebaseConfigured ? (
              <form
                className="space-y-3 rounded-2xl border border-neutral-100 bg-white p-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void onSignIn(email.trim(), password);
                }}
              >
                <p className="text-xs font-bold text-neutral-800">Sign in to your BhoomiFi account</p>
                <label className="block space-y-1 text-[11px] font-semibold text-neutral-600">
                  Email
                  <input
                    type="email"
                    name="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={authLoading || authActionLoading}
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm font-normal text-neutral-900 outline-none transition focus:border-[#227C4F] focus:ring-2 focus:ring-[#227C4F]/15 disabled:opacity-60"
                  />
                </label>
                <label className="block space-y-1 text-[11px] font-semibold text-neutral-600">
                  Password
                  <input
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={authLoading || authActionLoading}
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm font-normal text-neutral-900 outline-none transition focus:border-[#227C4F] focus:ring-2 focus:ring-[#227C4F]/15 disabled:opacity-60"
                  />
                </label>
                {authError && (
                  <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
                    {authError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={authLoading || authActionLoading}
                  className="w-full rounded-xl bg-[#227C4F] px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#1b6841] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {authLoading || authActionLoading
                    ? <LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" />
                    : null}
                  {authLoading ? 'Checking authentication…' : authActionLoading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
            ) : null}

            {firebaseUid && authError && (
              <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
                {authError}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Threshold Configuration */}
      <div className="bg-white rounded-[32px] p-5 border border-black/[0.04] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] space-y-4">
        <h3 className="text-sm font-bold text-neutral-900">Irrigation Threshold Rules</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-neutral-100">
            <div>
              <span className="text-xs font-bold text-neutral-900 block">Minimum Moisture (Trigger)</span>
              <span className="text-[10px] text-neutral-400">Pump activates when soil falls below this level</span>
            </div>
            <span className="text-xs font-extrabold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl">
              {telemetry.minMoistureThreshold}%
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-neutral-100">
            <div>
              <span className="text-xs font-bold text-neutral-900 block">Target Moisture (Cutoff)</span>
              <span className="text-[10px] text-neutral-400">Pump turns off once soil reaches this level</span>
            </div>
            <span className="text-xs font-extrabold text-[#227C4F] bg-[#E7F3EC] px-2.5 py-1 rounded-xl">
              {telemetry.targetMoistureThreshold}%
            </span>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <span className="text-xs font-bold text-neutral-900 block">Operating Mode</span>
              <span className="text-[10px] text-neutral-400">AUTO enforces thresholds; MANUAL allows direct override</span>
            </div>
            <div className="flex items-center gap-1 bg-[#EBECEB] p-1 rounded-xl">
              <button
                onClick={() => handleModeChange('AUTO')}
                disabled={!canControl}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                  telemetry.autoMode
                    ? 'bg-[#227C4F] text-white shadow-2xs'
                    : 'text-neutral-500'
                }`}
              >
                AUTO
              </button>
              <button
                onClick={() => handleModeChange('MANUAL')}
                disabled={!canControl}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                  !telemetry.autoMode
                    ? 'bg-[#227C4F] text-white shadow-2xs'
                    : 'text-neutral-500'
                }`}
              >
                MANUAL
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hardware Profile */}
      <div className="bg-white rounded-[32px] p-5 border border-black/[0.04] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] space-y-4">
        <h3 className="text-sm font-bold text-neutral-900">BhoomiFi Hardware Profile</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-neutral-100">
            <span className="text-xs text-neutral-500">Microcontroller</span>
            <span className="text-xs font-bold text-neutral-900">ESP32-WROOM-32</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-neutral-100">
            <span className="text-xs text-neutral-500">Firmware Build</span>
            <span className="text-xs font-bold text-neutral-900">{settings.firmwareVersion}</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-neutral-100">
            <span className="text-xs text-neutral-500">Sensors Wired</span>
            <span className="text-xs font-bold text-neutral-900">HW-080, DHT11, BH1750</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-neutral-100">
            <span className="text-xs text-neutral-500">Sensor Pins</span>
            <span className="text-xs font-bold text-neutral-900">32 AOUT • 3.3V/GND • 4 DATA • 21/22 I²C</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-neutral-100">
            <span className="text-xs text-neutral-500">Actuators</span>
            <span className="text-xs font-bold text-neutral-900">Relay IN 25 • LED 26 • Pump</span>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-neutral-500">Hardware Integration</span>
            <span className="text-xs font-bold text-[#227C4F]">
              {settings.demoMode ? 'Demo Emulation Ready' : 'Waiting for live connection'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
