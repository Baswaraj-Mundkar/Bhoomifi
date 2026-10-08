'use client';

import React from 'react';
import { DeviceStatus } from '@/types';

interface ClimateGaugeProps {
  temperature: number | null;
  humidity: number | null;
  light: number | null;
  maxTemperature?: number;
  isDemoMode: boolean;
  deviceStatus: DeviceStatus;
}

export const ClimateGauge: React.FC<ClimateGaugeProps> = ({
  temperature,
  humidity,
  light,
  isDemoMode,
  deviceStatus,
  maxTemperature = 45
}) => {
  const radius = 64;
  const strokeWidth = 5;
  const cx = 90;
  const cy = 75;

  const minTemp = 10;
  const maxTempRange = maxTemperature;
  const clampedTemp = temperature === null ? minTemp : Math.min(Math.max(temperature, minTemp), maxTempRange);
  const ratio = (clampedTemp - minTemp) / (maxTempRange - minTemp);
  const angleRad = Math.PI * (1 - ratio);
  const dotX = cx + radius * Math.cos(angleRad);
  const dotY = cy - radius * Math.sin(angleRad);

  return (
    <div className="flex flex-col items-center justify-between w-full h-full">
      <div className="w-full text-left">
        <h4 className="text-[13px] font-semibold text-neutral-800">Microclimate (DHT11)</h4>
        <div className="text-[10px] text-neutral-400 space-y-0.5 leading-tight mt-0.5">
          <p>Sensor: DHT11 & BH1750</p>
          <p>Status: {isDemoMode ? 'Demo reading' : deviceStatus}</p>
          <p>Light: {light === null ? '—' : `${light} lux`}</p>
        </div>
      </div>

      <div className="relative w-[180px] h-[95px] flex items-center justify-center mt-1">
        <svg viewBox="0 0 180 95" className="w-full h-full overflow-visible">
          {/* Background arc */}
          <path
            d="M 26 75 A 64 64 0 0 1 154 75"
            fill="none"
            stroke="#E5EAE7"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Active green gradient arc */}
          <path
            d="M 26 75 A 64 64 0 0 1 154 75"
            fill="none"
            stroke="#227C4F"
            strokeWidth={strokeWidth}
            strokeDasharray="201"
            strokeDashoffset={201 * (1 - ratio)}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
          {/* Needle / indicator circle */}
          <circle
            cx={dotX}
            cy={dotY}
            r="4.5"
            fill="#FFFFFF"
            stroke="#227C4F"
            strokeWidth="2.5"
            className="shadow-sm transition-all duration-700 ease-out"
          />
        </svg>

        {/* Temperature in center */}
        <div className="absolute bottom-2 flex items-baseline justify-center">
          <span className="text-2xl font-bold tracking-tight text-neutral-900">{temperature === null ? '—' : `${temperature}°C`}</span>
        </div>
      </div>

      {/* Sub-metrics underneath */}
      <div className="w-full flex items-center justify-between text-[9px] text-neutral-500 pt-1 border-t border-neutral-100/80">
        <span className="truncate">{humidity === null ? '—' : `${humidity}%`} Humidity</span>
        <span className="truncate text-center">Scale 10–{maxTemperature}°C</span>
        <span className="truncate text-right">{light === null ? '—' : `${light} Lux`} Light</span>
      </div>
    </div>
  );
};
