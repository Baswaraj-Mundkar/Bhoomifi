'use client';

import React from 'react';
import { X, CheckCircle2, Clock, Cpu } from 'lucide-react';
import { BhoomiFiTelemetry, NavigationTab } from '@/types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavigationTab) => void;
  telemetry: BhoomiFiTelemetry;
  isDemoMode: boolean;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onNavigate,
  telemetry,
  isDemoMode
}) => {
  if (!isOpen) return null;

  const lastUpdated = telemetry.timestamp
    ? `${telemetry.timestamp.slice(0, 16).replace('T', ' ')} UTC`
    : 'No live readings';
  const notifications = isDemoMode ? [
    {
      id: 'notif-1',
      title: `Demo soil moisture: ${telemetry.soilMoisture ?? '—'}%`,
      description: 'This is a sample value from Demo Mode, not a live HW-080 sensor reading.',
      type: 'success',
      timestamp: lastUpdated,
      actionTab: 'irrigation' as NavigationTab,
      actionText: 'View Irrigation Hub'
    },
    {
      id: 'notif-2',
      title: 'ESP32 Demo Node Online',
      description: 'Demo device status only; no physical ESP32 connection is being reported.',
      type: 'info',
      timestamp: lastUpdated,
      actionTab: 'home' as NavigationTab,
      actionText: 'View Telemetry'
    },
    {
      id: 'notif-3',
      title: 'Demo sensor sample',
      description: `DHT11: ${telemetry.temperature ?? '—'}°C, ${telemetry.humidity ?? '—'}% RH • BH1750: ${telemetry.light ?? '—'} lux.`,
      type: 'info',
      timestamp: lastUpdated,
      actionTab: 'history' as NavigationTab,
      actionText: 'Inspect Trends'
    }
  ] : [
    {
      id: 'notif-live',
      title: telemetry.deviceStatus === 'ONLINE' ? 'ESP32 is LIVE' : 'ESP32 is OFFLINE',
      description: telemetry.deviceStatus === 'ONLINE'
        ? `Latest Firebase sensor update: ${lastUpdated}.`
        : `Last known readings are retained${telemetry.lastSeen ? `; last seen ${new Date(telemetry.lastSeen).toLocaleString()}` : ''}.`,
      type: telemetry.deviceStatus === 'ONLINE' ? 'success' : 'info',
      timestamp: telemetry.lastSeen ? new Date(telemetry.lastSeen).toLocaleString() : 'No heartbeat received',
      actionTab: telemetry.deviceStatus === 'ONLINE' ? 'home' as NavigationTab : 'settings' as NavigationTab,
      actionText: telemetry.deviceStatus === 'ONLINE' ? 'View telemetry' : 'View connection settings'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-[32px] p-6 shadow-2xl border border-neutral-100 animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-neutral-900 tracking-tight">Node Notifications</h3>
            <span className="bg-[#E7F3EC] text-[#227C4F] text-[11px] font-bold px-2 py-0.5 rounded-full">
              {isDemoMode ? 'Demo' : telemetry.deviceStatus === 'ONLINE' ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {notifications.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-neutral-50/80 border border-neutral-200/70 hover:border-neutral-300 transition-all space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {item.type === 'success' ? (
                    <span className="p-1 rounded-lg bg-emerald-100 text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                  ) : (
                    <span className="p-1 rounded-lg bg-neutral-200 text-neutral-700">
                      <Cpu className="w-4 h-4" />
                    </span>
                  )}
                  <h4 className="text-xs font-bold text-neutral-900">{item.title}</h4>
                </div>
                <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {item.timestamp}
                </span>
              </div>

              <p className="text-xs text-neutral-600 leading-relaxed pl-7">{item.description}</p>

              <div className="pl-7 pt-1">
                <button
                  onClick={() => {
                    onNavigate(item.actionTab);
                    onClose();
                  }}
                  className="text-xs font-semibold text-[#227C4F] hover:underline flex items-center gap-1"
                >
                  {item.actionText} →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
