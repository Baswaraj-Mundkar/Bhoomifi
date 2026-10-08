'use client';

import React, { useEffect, useState } from 'react';
import { DeviceFrame } from '@/components/DeviceFrame';
import { Header } from '@/components/Header';
import { Navbar } from '@/components/Navbar';
import { DesktopView } from '@/components/DesktopView';
import { ShowcaseView } from '@/components/ShowcaseView';
import { HomeScreen } from '@/components/screens/HomeScreen';
import { FieldScreen } from '@/components/screens/FieldScreen';
import { IrrigationScreen } from '@/components/screens/IrrigationScreen';
import { HistoryScreen } from '@/components/screens/HistoryScreen';
import { SettingsScreen } from '@/components/screens/SettingsScreen';
import { SearchModal } from '@/components/SearchModal';
import { NotificationDrawer } from '@/components/NotificationDrawer';
import {
  NavigationTab,
  BhoomiFiTelemetry,
  HardwareModule,
  IrrigationLog,
  SensorHistoryPoint,
  DeviceSettings,
  FirebaseDeviceCommand
} from '@/types';
import {
  initialTelemetry,
  unavailableLiveTelemetry,
  hardwareModules,
  initialIrrigationLogs,
  initialSensorHistory,
  initialDeviceSettings
} from '@/data/mockData';
import { rawAdcFromMoisturePercent } from '@/data/sensorModel';
import { firebaseConfigured, getFirebaseServices } from '@/data/firebaseClient';
import { sendFirebaseCommand, subscribeToFirebaseDevice } from '@/data/firebaseService';
import { Smartphone, Monitor, LayoutGrid } from 'lucide-react';

function resolvePumpStatus(
  moisture: number | null,
  autoMode: boolean,
  currentStatus: BhoomiFiTelemetry['pumpStatus'],
  minimum: number,
  target: number
): BhoomiFiTelemetry['pumpStatus'] {
  if (!autoMode || moisture === null) return currentStatus;
  if (moisture < minimum) return 'ON';
  if (moisture >= target) return 'OFF';
  return currentStatus;
}

function createAutoIrrigationLog(moisture: number, minimum: number): IrrigationLog {
  return {
    id: `irr-${Date.now()}`,
    timestamp: new Date().toLocaleString(),
    startedAt: Date.now(),
    mode: 'AUTO',
    durationSeconds: 0,
    triggerReason: `AUTO started below ${minimum}% minimum`,
    startMoisture: moisture,
    endMoisture: moisture,
    status: 'Active'
  };
}

function completeActiveLogs(logs: IrrigationLog[], moisture: number): IrrigationLog[] {
  return logs.map((log) => log.status === 'Active'
    ? {
        ...log,
        status: 'Completed',
        durationSeconds: log.startedAt ? Math.max(1, Math.round((Date.now() - log.startedAt) / 1000)) : log.durationSeconds,
        endMoisture: moisture
      }
    : log);
}

function toSensorHistoryPoint(telemetry: BhoomiFiTelemetry): SensorHistoryPoint | null {
  const { soilMoisture, temperature, humidity, light, pumpStatus, timestamp } = telemetry;
  if (
    soilMoisture === null
    || temperature === null
    || humidity === null
    || light === null
    || pumpStatus === null
    || timestamp === null
  ) {
    return null;
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError('Sensor history requires a valid telemetry timestamp.');
  }

  return {
    timestamp: date.toISOString(),
    time: date.toISOString().slice(11, 16),
    soilMoisture,
    temperature,
    humidity,
    light,
    pumpStatus
  };
}

export default function BhoomiFiApp() {
  // Navigation & View Mode
  const [currentTab, setCurrentTab] = useState<NavigationTab>('home');
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop' | 'showcase'>('mobile');

  // Modals state
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);

  // Live mode remains unavailable until a configured data source supplies a reading.
  const [telemetry, setTelemetry] = useState<BhoomiFiTelemetry>(unavailableLiveTelemetry);
  const [hardware, setHardware] = useState<HardwareModule[]>(hardwareModules.map((module) => ({
    ...module,
    status: 'Offline',
    reading: 'No live device data'
  })));
  const [irrigationLogs, setIrrigationLogs] = useState<IrrigationLog[]>([]);
  const [sensorHistory, setSensorHistory] = useState<SensorHistoryPoint[]>([]);
  const [settings, setSettings] = useState<DeviceSettings>(initialDeviceSettings);
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(firebaseConfigured);
  const [authActionLoading, setAuthActionLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [firebaseMessage, setFirebaseMessage] = useState(
    firebaseConfigured
      ? 'Connecting to Firebase Authentication…'
      : 'Firebase is not configured. Add the public Firebase settings from .env.example to .env.local.'
  );
  const [commandError, setCommandError] = useState<string | null>(null);
  const canControl = settings.demoMode || (!authLoading && firebaseUid !== null);

  useEffect(() => {
    if (settings.demoMode) return;

    const markUnavailable = (message: string) => {
      setFirebaseMessage(message);
      setTelemetry((previous) => ({ ...previous, deviceStatus: 'OFFLINE' }));
      setHardware((modules) => modules.map((module) => ({
        ...module,
        status: 'Offline',
        reading: 'Waiting for Firebase device data'
      })));
    };

    if (!firebaseConfigured) return;

    let disposed = false;
    let unsubscribeDevice: (() => void) | undefined;
    let unsubscribeAuth: (() => void) | undefined;
    void getFirebaseServices().then(async (services) => {
      if (disposed) return;
      if (!services) {
        markUnavailable('Firebase could not be initialized. Check the Firebase environment settings.');
        setAuthLoading(false);
        return;
      }
      const { onAuthStateChanged } = await import('firebase/auth');
      if (disposed) return;
      unsubscribeAuth = onAuthStateChanged(
        services.auth,
        (user) => {
          unsubscribeDevice?.();
          unsubscribeDevice = undefined;
          setFirebaseUid(user?.uid ?? null);
          setAuthLoading(false);
          if (!user) {
            markUnavailable('Sign in with Firebase Authentication to access this farm. Demo Mode remains available.');
            setTelemetry(unavailableLiveTelemetry);
            setSensorHistory([]);
            setIrrigationLogs([]);
            return;
          }

          setFirebaseMessage(`Authenticated. Listening for ${settings.deviceId}…`);
          unsubscribeDevice = subscribeToFirebaseDevice(services.db, settings.deviceId, {
            onTelemetry: (nextTelemetry) => {
              setTelemetry(nextTelemetry);
              setHardware((modules) => modules.map((module) => {
                if (module.id === 'esp32') {
                  return {
                    ...module,
                    status: nextTelemetry.deviceStatus === 'ONLINE' ? 'Operational' : 'Offline',
                    reading: nextTelemetry.lastSeen
                      ? `Last seen ${new Date(nextTelemetry.lastSeen).toLocaleString()}`
                      : 'No device heartbeat received'
                  };
                }
                if (module.id === 'relay' || module.id === 'led' || module.id === 'pump') {
                  return {
                    ...module,
                    status: nextTelemetry.pumpStatus === null ? 'Offline' : nextTelemetry.pumpStatus === 'ON' ? 'Operational' : 'Standby',
                    reading: nextTelemetry.pumpStatus ?? 'No live pump state'
                  };
                }
                return {
                  ...module,
                  status: nextTelemetry.deviceStatus === 'ONLINE' ? 'Operational' : 'Offline',
                  reading: nextTelemetry.deviceStatus === 'ONLINE' ? 'Live sensor stream' : 'Last value retained; device offline'
                };
              }));
              setSettings((previous) => ({
                ...previous,
                minMoistureThreshold: nextTelemetry.minMoistureThreshold,
                targetMoistureThreshold: nextTelemetry.targetMoistureThreshold
              }));
            },
            onHistory: setSensorHistory,
            onIrrigationHistory: setIrrigationLogs,
            onDeviceInfo: (info) => {
              setSettings((previous) => ({
                ...previous,
                deviceName: info.deviceName,
                firmwareVersion: info.firmwareVersion,
                wifiSSID: info.wifiSSID
              }));
            },
            onError: (error) => {
              setFirebaseMessage(`Firestore listener error: ${error.message}`);
              setTelemetry((previous) => ({ ...previous, deviceStatus: 'OFFLINE' }));
            }
          });
        },
        (error) => {
          unsubscribeDevice?.();
          unsubscribeDevice = undefined;
          setFirebaseUid(null);
          setAuthLoading(false);
          markUnavailable(`Firebase Authentication error: ${error.message}`);
        }
      );
    }).catch((error: unknown) => {
      if (disposed) return;
      markUnavailable(`Firebase could not initialize: ${error instanceof Error ? error.message : String(error)}`);
      setAuthLoading(false);
    });

    return () => {
      disposed = true;
      unsubscribeDevice?.();
      unsubscribeAuth?.();
    };
  }, [settings.demoMode, settings.deviceId]);
  const recordSensorHistory = (reading: BhoomiFiTelemetry) => {
    const point = toSensorHistoryPoint(reading);
    if (point) setSensorHistory((history) => [...history, point].slice(-100));
  };

  const writeCommand = async (command: FirebaseDeviceCommand) => {
    const services = await getFirebaseServices();
    if (!services || !firebaseUid) {
      throw new Error('Firebase Authentication is required before sending device commands.');
    }
    await sendFirebaseCommand(services.db, settings.deviceId, command);
  };

  const handleSignIn = async (email: string, password: string) => {
    setAuthActionLoading(true);
    setAuthError(null);
    try {
      const services = await getFirebaseServices();
      if (!services) throw new Error('Firebase is not configured. Check the local Firebase environment settings.');
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      await signInWithEmailAndPassword(services.auth, email, password);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : String(error));
    } finally {
      setAuthActionLoading(false);
    }
  };

  const handleSignOut = async () => {
    setAuthActionLoading(true);
    setAuthError(null);
    try {
      const services = await getFirebaseServices();
      if (!services) throw new Error('Firebase is not configured. Check the local Firebase environment settings.');
      const { signOut } = await import('firebase/auth');
      await signOut(services.auth);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : String(error));
    } finally {
      setAuthActionLoading(false);
    }
  };

  // Pump Toggle Handler (Supports Manual override and logs)
  const handleTogglePump = async () => {
    if (telemetry.autoMode || telemetry.pumpStatus === null || telemetry.soilMoisture === null) return;

    const soilMoisture = telemetry.soilMoisture;
    const nextStatus = telemetry.pumpStatus === 'ON' ? 'OFF' : 'ON';
    if (!settings.demoMode) {
      try {
        setCommandError(null);
        await writeCommand({ pumpCommand: nextStatus === 'ON' ? 'START' : 'STOP' });
      } catch (error) {
        setCommandError(`Could not send pump command: ${error instanceof Error ? error.message : String(error)}`);
      }
      return;
    }

    setTelemetry((prev) => ({
      ...prev,
      pumpStatus: nextStatus,
      timestamp: new Date().toISOString()
    }));
    recordSensorHistory({
      ...telemetry,
      pumpStatus: nextStatus,
      timestamp: new Date().toISOString()
    });

    // If turned ON, record a log entry
    if (nextStatus === 'ON') {
      const newLog: IrrigationLog = {
        id: `irr-${Date.now()}`,
        timestamp: 'Just now',
        mode: telemetry.autoMode ? 'AUTO' : 'MANUAL',
        durationSeconds: 0,
        startedAt: Date.now(),
        triggerReason: 'Pump started manually',
        startMoisture: soilMoisture,
        endMoisture: soilMoisture,
        status: 'Active'
      };
      setIrrigationLogs((prev) => [newLog, ...prev]);
    } else {
      setIrrigationLogs((prev) =>
        prev.map((log) => log.status === 'Active' && log.mode === 'MANUAL'
          ? {
              ...log,
              status: 'Completed',
              durationSeconds: log.startedAt ? Math.max(1, Math.round((Date.now() - log.startedAt) / 1000)) : log.durationSeconds,
              endMoisture: soilMoisture
            }
          : log)
      );
    }
  };

  // Mode Toggle Handler (AUTO <-> MANUAL)
  const handleToggleMode = async () => {
    if (!settings.demoMode) {
      const autoMode = !telemetry.autoMode;
      try {
        setCommandError(null);
        await writeCommand({
          autoMode,
          minimumMoisture: telemetry.minMoistureThreshold,
          targetMoisture: telemetry.targetMoistureThreshold
        });
      } catch (error) {
        setCommandError(`Could not update device mode: ${error instanceof Error ? error.message : String(error)}`);
      }
      return;
    }
    if (telemetry.soilMoisture === null || telemetry.pumpStatus === null) return;
    const soilMoisture = telemetry.soilMoisture;
    const nextMode = !telemetry.autoMode;
    const nextTelemetry = {
      ...telemetry,
      autoMode: nextMode,
      pumpStatus: resolvePumpStatus(
        soilMoisture,
        nextMode,
        telemetry.pumpStatus,
        telemetry.minMoistureThreshold,
        telemetry.targetMoistureThreshold
      ),
      timestamp: new Date().toISOString()
    };
    setTelemetry(nextTelemetry);
    recordSensorHistory(nextTelemetry);
    setSettings((prev) => ({
      ...prev,
      demoMode: true
    }));

    if (telemetry.pumpStatus === 'OFF' && nextTelemetry.pumpStatus === 'ON') {
      setIrrigationLogs((prev) => [
        createAutoIrrigationLog(soilMoisture, telemetry.minMoistureThreshold),
        ...prev
      ]);
    }
    if (telemetry.pumpStatus === 'ON' && nextTelemetry.pumpStatus === 'OFF') {
      setIrrigationLogs((prev) => completeActiveLogs(prev, soilMoisture));
    }
  };

  // Telemetry updates helper
  const handleUpdateTelemetry = async (updates: Partial<BhoomiFiTelemetry>) => {
    if (!settings.demoMode) {
      const minimumMoisture = updates.minMoistureThreshold ?? telemetry.minMoistureThreshold;
      const targetMoisture = updates.targetMoistureThreshold ?? telemetry.targetMoistureThreshold;
      const command: FirebaseDeviceCommand = {
        minimumMoisture,
        targetMoisture
      };
      if (typeof updates.autoMode === 'boolean') command.autoMode = updates.autoMode;
      try {
        setCommandError(null);
        await writeCommand(command);
        setTelemetry((previous) => ({
          ...previous,
          minMoistureThreshold: minimumMoisture,
          targetMoistureThreshold: targetMoisture
        }));
        setSettings((previous) => ({
          ...previous,
          minMoistureThreshold: minimumMoisture,
          targetMoistureThreshold: targetMoisture
        }));
      } catch (error) {
        setCommandError(`Could not update Firebase device settings: ${error instanceof Error ? error.message : String(error)}`);
      }
      return;
    }
    if (telemetry.soilMoisture === null || telemetry.pumpStatus === null) return;
    const next = { ...telemetry, ...updates };
    if (next.soilMoisture === null) return;
    const nextSoilMoisture = next.soilMoisture;
    next.pumpStatus = resolvePumpStatus(
      nextSoilMoisture,
      next.autoMode,
      telemetry.pumpStatus,
      next.minMoistureThreshold,
      next.targetMoistureThreshold
    );
    next.timestamp = new Date().toISOString();
    setTelemetry(next);
    recordSensorHistory(next);
    if (telemetry.pumpStatus === 'OFF' && next.pumpStatus === 'ON') {
      setIrrigationLogs((prev) => [
        next.autoMode
          ? createAutoIrrigationLog(nextSoilMoisture, next.minMoistureThreshold)
          : {
              id: `irr-${Date.now()}`,
              timestamp: 'Just now',
              startedAt: Date.now(),
              mode: 'MANUAL',
              durationSeconds: 0,
              triggerReason: 'Pump started manually',
              startMoisture: nextSoilMoisture,
              endMoisture: nextSoilMoisture,
              status: 'Active'
            },
        ...prev
      ]);
    } else if (telemetry.pumpStatus === 'ON' && next.pumpStatus === 'OFF') {
      setIrrigationLogs((prev) => completeActiveLogs(prev, nextSoilMoisture));
    }
    setSettings((prev) => ({
      ...prev,
      minMoistureThreshold: next.minMoistureThreshold,
      targetMoistureThreshold: next.targetMoistureThreshold
    }));
  };

  const handleRefreshMetrics = () => {
    if (!settings.demoMode) return;
    setTelemetry((prev) => ({
      ...initialTelemetry,
      autoMode: prev.autoMode,
      minMoistureThreshold: prev.minMoistureThreshold,
      targetMoistureThreshold: prev.targetMoistureThreshold,
      pumpStatus: resolvePumpStatus(
        initialTelemetry.soilMoisture,
        prev.autoMode,
        prev.pumpStatus,
        prev.minMoistureThreshold,
        prev.targetMoistureThreshold
      )
    }));
  };

  // Simulator Handlers
  const handleSimulateDryEvent = () => {
    if (!settings.demoMode) return;
    // Soil drops below the configured minimum in the demo simulator.
    const newMoisture = 32;
    const nextPumpStatus = resolvePumpStatus(
      newMoisture,
      telemetry.autoMode,
      telemetry.pumpStatus,
      telemetry.minMoistureThreshold,
      telemetry.targetMoistureThreshold
    );
    const nextTelemetry = {
      ...telemetry,
      soilMoisture: newMoisture,
      soilRawADC: rawAdcFromMoisturePercent(newMoisture),
      pumpStatus: nextPumpStatus,
      timestamp: new Date().toISOString()
    };
    setTelemetry((prev) => ({
      ...prev,
      ...nextTelemetry
    }));
    recordSensorHistory(nextTelemetry);

    if (telemetry.autoMode && telemetry.pumpStatus === 'OFF' && nextPumpStatus === 'ON') {
      setIrrigationLogs((prev) => [createAutoIrrigationLog(newMoisture, telemetry.minMoistureThreshold), ...prev]);
    }
  };

  const handleSimulateIrrigation = () => {
    if (!settings.demoMode) return;
    const nextTelemetry = {
      ...telemetry,
      soilMoisture: 62,
      soilRawADC: rawAdcFromMoisturePercent(62),
      pumpStatus: resolvePumpStatus(
        62,
        telemetry.autoMode,
        telemetry.pumpStatus,
        telemetry.minMoistureThreshold,
        telemetry.targetMoistureThreshold
      ),
      timestamp: new Date().toISOString()
    };
    setTelemetry((prev) => ({
      ...prev,
      ...nextTelemetry
    }));
    recordSensorHistory(nextTelemetry);

    if (telemetry.autoMode && telemetry.pumpStatus === 'ON' && nextTelemetry.pumpStatus === 'OFF') {
      setIrrigationLogs((prev) => completeActiveLogs(prev, 62));
    }
  };

  const handleResetDemo = () => {
    setTelemetry(initialTelemetry);
    setHardware(hardwareModules);
    setIrrigationLogs(initialIrrigationLogs);
    setSensorHistory(initialSensorHistory);
    setSettings({ ...initialDeviceSettings, demoMode: true });
  };

  const handleSetDemoMode = (demoMode: boolean) => {
    setCommandError(null);
    setSettings((prev) => ({ ...prev, demoMode }));
    if (demoMode) {
      setTelemetry({
        ...initialTelemetry,
        minMoistureThreshold: settings.minMoistureThreshold,
        targetMoistureThreshold: settings.targetMoistureThreshold
      });
      setHardware(hardwareModules);
      setIrrigationLogs(initialIrrigationLogs);
      setSensorHistory(initialSensorHistory);
      return;
    }

    setTelemetry({
      ...unavailableLiveTelemetry,
      minMoistureThreshold: settings.minMoistureThreshold,
      targetMoistureThreshold: settings.targetMoistureThreshold
    });
    setHardware((modules) => modules.map((module) => ({
      ...module,
      status: 'Offline',
      reading: 'Waiting for live device data'
    })));
    setIrrigationLogs([]);
    setSensorHistory([]);
  };

  return (
    <div className="min-h-screen bg-[#E5E7E6] text-neutral-900 flex flex-col items-center">
      {/* PERSISTENT TOP FLOATING VIEW SWITCHER */}
      <aside aria-label="View mode switcher" className="fixed top-3 z-50 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-neutral-200/80 flex items-center gap-1">
        <button
          onClick={() => setViewMode('mobile')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
            viewMode === 'mobile'
              ? 'bg-[#153B28] text-white shadow-xs'
              : 'text-neutral-500 hover:text-neutral-800'
          }`}
          title="Mobile Frame Experience"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Mobile Frame</span>
        </button>

        <button
          onClick={() => setViewMode('desktop')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
            viewMode === 'desktop'
              ? 'bg-[#153B28] text-white shadow-xs'
              : 'text-neutral-500 hover:text-neutral-800'
          }`}
          title="Responsive Desktop Experience"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Desktop View</span>
        </button>

        <button
          onClick={() => setViewMode('showcase')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
            viewMode === 'showcase'
              ? 'bg-[#153B28] text-white shadow-xs'
              : 'text-neutral-500 hover:text-neutral-800'
          }`}
          title="3-Phone Reference Showcase"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Reference 1:1 Showcase</span>
        </button>
      </aside>

      {/* VIEW 1: MOBILE DEVICE EXPERIENCE (PRIMARY) */}
      {viewMode === 'mobile' && (
        <div className="w-full min-h-screen flex items-center justify-center p-3 pt-14 pb-8">
          <DeviceFrame time="9:41">
            {/* Header shown on non-field screens */}
            {currentTab !== 'field' && (
              <Header
                onOpenSearch={() => setIsSearchModalOpen(true)}
                onOpenSettings={() => setCurrentTab('settings')}
                onOpenNotifications={() => setIsNotifDrawerOpen(true)}
                isDemoMode={settings.demoMode}
                deviceStatus={telemetry.deviceStatus}
              />
            )}

            {/* Screen Router */}
            <main>
              {commandError && (
                <p role="alert" className="mx-5 mt-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-800">
                  {commandError}
                </p>
              )}
              {currentTab === 'home' && (
                <HomeScreen
                  telemetry={telemetry}
                  hardware={hardware}
                  canControl={canControl}
                  onTogglePump={handleTogglePump}
                  onToggleMode={handleToggleMode}
                  onRefreshMetrics={handleRefreshMetrics}
                  onNavigateToTab={(tab) => setCurrentTab(tab)}
                  isDemoMode={settings.demoMode}
                />
              )}

              {currentTab === 'field' && (
                <FieldScreen
                  telemetry={telemetry}
                  isDemoMode={settings.demoMode}
                  onBack={() => setCurrentTab('home')}
                  onNavigateToIrrigation={() => setCurrentTab('irrigation')}
                />
              )}

              {currentTab === 'irrigation' && (
                <IrrigationScreen
                  telemetry={telemetry}
                  logs={irrigationLogs}
                  canControl={canControl}
                  onTogglePump={handleTogglePump}
                  onToggleMode={handleToggleMode}
                  onUpdateThresholds={(min, target) => {
                    handleUpdateTelemetry({ minMoistureThreshold: min, targetMoistureThreshold: target });
                  }}
                  isDemoMode={settings.demoMode}
                />
              )}

              {currentTab === 'history' && (
                <HistoryScreen
                  irrigationLogs={irrigationLogs}
                  sensorHistory={sensorHistory}
                  isDemoMode={settings.demoMode}
                  deviceStatus={telemetry.deviceStatus}
                />
              )}

              {currentTab === 'settings' && (
                <SettingsScreen
                  telemetry={telemetry}
                  settings={settings}
                  onUpdateTelemetry={handleUpdateTelemetry}
                  onSimulateDryEvent={handleSimulateDryEvent}
                  onSimulateIrrigation={handleSimulateIrrigation}
                  onResetDemo={handleResetDemo}
                  onSetDemoMode={handleSetDemoMode}
                  connectionMessage={firebaseMessage}
                  firebaseUid={firebaseUid}
                  canControl={canControl}
                  firebaseConfigured={firebaseConfigured}
                  authLoading={authLoading}
                  authActionLoading={authActionLoading}
                  authError={authError}
                  onSignIn={handleSignIn}
                  onSignOut={handleSignOut}
                />
              )}
            </main>

            {/* Bottom Dock Navbar */}
            <Navbar
              currentTab={currentTab}
              onTabChange={setCurrentTab}
              isDemoMode={settings.demoMode}
              deviceStatus={telemetry.deviceStatus}
            />
          </DeviceFrame>
        </div>
      )}

      {/* VIEW 2: FULL RESPONSIVE DESKTOP EXPERIENCE */}
      {viewMode === 'desktop' && (
        <div className="w-full pt-12">
          <DesktopView
            currentTab={currentTab}
            onTabChange={setCurrentTab}
            telemetry={telemetry}
            hardware={hardware}
            irrigationLogs={irrigationLogs}
            sensorHistory={sensorHistory}
            settings={settings}
            onOpenSearch={() => setIsSearchModalOpen(true)}
            onOpenNotifications={() => setIsNotifDrawerOpen(true)}
            onTogglePump={handleTogglePump}
            onToggleMode={handleToggleMode}
            onRefreshMetrics={handleRefreshMetrics}
            onUpdateTelemetry={handleUpdateTelemetry}
            onSimulateDryEvent={handleSimulateDryEvent}
            onSimulateIrrigation={handleSimulateIrrigation}
            onResetDemo={handleResetDemo}
            onSetDemoMode={handleSetDemoMode}
            canControl={canControl}
            commandError={commandError}
            connectionMessage={firebaseMessage}
            firebaseUid={firebaseUid}
            firebaseConfigured={firebaseConfigured}
            authLoading={authLoading}
            authActionLoading={authActionLoading}
            authError={authError}
            onSignIn={handleSignIn}
            onSignOut={handleSignOut}
          />
        </div>
      )}

      {/* VIEW 3: 3-PHONE REFERENCE SHOWCASE (Recreates the exact photo) */}
      {viewMode === 'showcase' && (
        <div className="w-full pt-12">
          <ShowcaseView
            telemetry={telemetry}
            hardware={hardware}
            irrigationLogs={irrigationLogs}
            sensorHistory={sensorHistory}
            settings={settings}
            onOpenSearch={() => setIsSearchModalOpen(true)}
            onOpenNotifications={() => setIsNotifDrawerOpen(true)}
            onOpenSettings={() => setCurrentTab('settings')}
            onTogglePump={handleTogglePump}
            onToggleMode={handleToggleMode}
            onRefreshMetrics={handleRefreshMetrics}
            onNavigateToTab={(tab) => {
              setCurrentTab(tab);
              setViewMode('mobile');
            }}
            canControl={canControl}
          />
        </div>
      )}

      {/* Interactive Global Modals */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onNavigate={(tab) => setCurrentTab(tab)}
      />

      <NotificationDrawer
        isOpen={isNotifDrawerOpen}
        onClose={() => setIsNotifDrawerOpen(false)}
        onNavigate={(tab) => setCurrentTab(tab)}
        telemetry={telemetry}
        isDemoMode={settings.demoMode}
      />
    </div>
  );
}
