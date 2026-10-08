'use client';

import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { Download, CheckCircle2 } from 'lucide-react';
import { DeviceStatus, IrrigationLog, SensorHistoryPoint } from '@/types';

interface HistoryScreenProps {
  irrigationLogs: IrrigationLog[];
  sensorHistory: SensorHistoryPoint[];
  minMoistureThreshold?: number;
  isDemoMode: boolean;
  deviceStatus: DeviceStatus;
}

type FilterCategory = 'all' | 'auto' | 'manual' | 'active' | 'completed';

const FILTER_LABELS: Record<FilterCategory, string> = {
  all: 'All',
  auto: 'AUTO',
  manual: 'Manual',
  active: 'Active',
  completed: 'Completed'
};

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  irrigationLogs,
  sensorHistory,
  minMoistureThreshold = 35,
  isDemoMode,
  deviceStatus
}) => {
  const [activeMetric, setActiveMetric] = useState<'moisture' | 'climate' | 'light' | 'pump'>('moisture');
  const [filterType, setFilterType] = useState<FilterCategory>('all');
  const [downloadToast, setDownloadToast] = useState(false);
  const sourceLabel = isDemoMode ? 'Demo' : deviceStatus === 'ONLINE' ? 'LIVE' : 'OFFLINE';

  const handleExport = () => {
    const rows = [
      'timestamp,time,soilMoisture,temperature,humidity,light,pumpStatus',
      ...sensorHistory.map((point) => `${point.timestamp},${point.time},${point.soilMoisture},${point.temperature},${point.humidity},${point.light},${point.pumpStatus}`)
    ];
    const downloadUrl = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `bhoomifi_${isDemoMode ? 'demo' : deviceStatus.toLowerCase()}_sensor_history.csv`;
    link.click();
    URL.revokeObjectURL(downloadUrl);
    setDownloadToast(true);
    setTimeout(() => setDownloadToast(false), 3000);
  };

  const filteredLogs = irrigationLogs.filter((log) => {
    switch (filterType) {
      case 'auto': return log.mode === 'AUTO';
      case 'manual': return log.mode === 'MANUAL';
      case 'active': return log.status === 'Active';
      case 'completed': return log.status === 'Completed';
      default: return true;
    }
  });
  const chartData = sensorHistory.map((point) => ({
    ...point,
    pumpStateValue: point.pumpStatus === 'ON' ? 1 : point.pumpStatus === 'OFF' ? 0 : null
  }));

  return (
    <div className="space-y-4 px-5 pb-8">
      {/* Toast Alert */}
      {downloadToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#143525] text-white px-4 py-2.5 rounded-full text-xs font-semibold shadow-xl border border-white/20 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{sourceLabel} sensor history downloaded as CSV</span>
        </div>
      )}

      {/* Screen Title */}
      <div className="pt-2 flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-[#141B18] tracking-tight leading-tight">
            History
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">Sensor Telemetry &amp; Irrigation Records</p>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white border border-neutral-200/80 text-xs font-semibold text-neutral-800 shadow-2xs hover:bg-neutral-50 transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-neutral-500" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Sensor History Chart Card */}
      <div className="bg-white rounded-[32px] p-5 border border-black/[0.04] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] space-y-4">
        <div className="flex items-center justify-between">
          <div>
              <h3 className="text-sm font-bold text-neutral-900">{isDemoMode ? 'Demo' : `${sourceLabel} ESP32`} Sensor History</h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              {isDemoMode ? 'Sample readings • not live hardware data' : `${sourceLabel} • timestamped hardware readings`}
            </p>
          </div>

          {/* Metric Selector Pills */}
          <div className="flex items-center gap-1 bg-[#F1F3F2] p-1 rounded-xl">
            <button
              onClick={() => setActiveMetric('moisture')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                activeMetric === 'moisture'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-500'
              }`}
            >
              Moisture
            </button>
            <button
              onClick={() => setActiveMetric('climate')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                activeMetric === 'climate'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-500'
              }`}
            >
              DHT11
            </button>
            <button
              onClick={() => setActiveMetric('light')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                activeMetric === 'light'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-500'
              }`}
            >
              Light
            </button>
            <button
              onClick={() => setActiveMetric('pump')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                activeMetric === 'pump'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-500'
              }`}
            >
              Pump
            </button>
          </div>
        </div>

        {/* Recharts Area Chart */}
        {sensorHistory.length === 0 ? (
          <p className="py-12 text-center text-sm text-neutral-400">
            {isDemoMode
              ? 'No demo sensor history is available yet.'
              : 'No live sensor history is available. Connect the ESP32/Firebase data source to populate readings.'}
          </p>
        ) : <div className="w-full h-44 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#227C4F" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#227C4F" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E58514" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#E58514" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorLight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F1" vertical={false} />
              <XAxis dataKey="time" stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis
                domain={activeMetric === 'pump' ? [0, 1] : ['auto', 'auto']}
                ticks={activeMetric === 'pump' ? [0, 1] : undefined}
                tickFormatter={activeMetric === 'pump' ? (value: number) => value === 1 ? 'ON' : 'OFF' : undefined}
                stroke="#9CA3AF"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 4px 20px -2px rgba(0,0,0,0.08)',
                  fontSize: '11px',
                  padding: '8px 12px'
                }}
              />

              {activeMetric === 'moisture' && (
                <>
                  <ReferenceLine y={minMoistureThreshold} stroke="#EF4444" strokeDasharray="3 3" label={{ value: `Min ${minMoistureThreshold}%`, fill: '#EF4444', fontSize: 9 }} />
                  <Area
                    type="monotone"
                    dataKey="soilMoisture"
                    stroke="#227C4F"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorMoisture)"
                    name="Soil Moisture (%)"
                  />
                </>
              )}

              {activeMetric === 'climate' && (
                <>
                  <Area
                    type="monotone"
                    dataKey="temperature"
                    stroke="#E58514"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorTemp)"
                    name="Temperature (°C)"
                  />
                  <Area
                    type="monotone"
                    dataKey="humidity"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fillOpacity={0.2}
                    fill="#3B82F6"
                    name="Humidity (%)"
                  />
                </>
              )}

              {activeMetric === 'light' && (
                <Area
                  type="monotone"
                  dataKey="light"
                  stroke="#F59E0B"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorLight)"
                  name="Light (lux)"
                />
              )}

              {activeMetric === 'pump' && (
                <Area
                  type="stepAfter"
                  dataKey="pumpStateValue"
                  stroke="#227C4F"
                  strokeWidth={2.5}
                  fillOpacity={0.2}
                  fill="#227C4F"
                  name="Pump state (OFF = 0, ON = 1)"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>}
      </div>

      {/* Filter Pills — now functionally filter the logs list below */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {(Object.keys(FILTER_LABELS) as FilterCategory[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterType(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              filterType === cat
                ? 'bg-[#143525] text-white shadow-sm'
                : 'bg-white border border-neutral-200/80 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            {FILTER_LABELS[cat]}
          </button>
        ))}
        {/* Live count for context */}
        <span className="text-[11px] text-neutral-400 ml-1 shrink-0">
          {filteredLogs.length} record{filteredLogs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Irrigation History & Sensor Events List */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="bg-white rounded-[28px] p-6 border border-black/[0.04] text-center">
            <p className="text-sm text-neutral-400">
              No records match &ldquo;{FILTER_LABELS[filterType]}&rdquo;.
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="bg-white rounded-[28px] p-4 border border-black/[0.04] shadow-sm flex items-start justify-between gap-3"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-neutral-900 leading-snug">{log.triggerReason}</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E7F3EC] text-[#227C4F] font-bold shrink-0">
                    {log.mode} Mode
                  </span>
                </div>
                <p className="text-xs text-neutral-500">
                  Moisture: {log.startMoisture}% → {log.endMoisture}% • Duration: {log.durationSeconds}s
                </p>
                <div className="flex items-center gap-3 text-[11px] text-neutral-400 pt-0.5">
                  <span>Relay GPIO25</span>
                  <span>•</span>
                  <span>Water Pump</span>
                  {log.status === 'Active' && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-600 font-semibold animate-pulse">● Active</span>
                    </>
                  )}
                </div>
              </div>

              <span className="text-[11px] font-medium text-neutral-400 shrink-0">
                {log.timestamp}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
