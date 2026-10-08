'use client';

import React from 'react';

interface HealthGaugeProps {
  score: number; // 0 to 100
  label?: string;
}

export const HealthGauge: React.FC<HealthGaugeProps> = ({ score, label = 'Health Score' }) => {
  const radius = 68;
  const strokeWidth = 6.5;
  const cx = 95;
  const cy = 82;

  // Arc length for 180 degrees is PI * radius = ~213.6
  const arcLength = Math.PI * radius;
  const ratio = Math.min(Math.max(score / 100, 0), 1);

  // Position of needle dot
  const angleRad = Math.PI * (1 - ratio);
  const dotX = cx + radius * Math.cos(angleRad);
  const dotY = cy - radius * Math.sin(angleRad);

  return (
    <div className="relative w-[190px] h-[105px] flex items-center justify-center">
      <svg viewBox="0 0 190 105" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="healthGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#86EFAC" />
            <stop offset="100%" stopColor="#15803D" />
          </linearGradient>
        </defs>

        {/* Gray background track */}
        <path
          d="M 27 82 A 68 68 0 0 1 163 82"
          fill="none"
          stroke="#E9ECE9"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Active colored track */}
        <path
          d="M 27 82 A 68 68 0 0 1 163 82"
          fill="none"
          stroke="url(#healthGrad)"
          strokeWidth={strokeWidth}
          strokeDasharray={arcLength}
          strokeDashoffset={arcLength * (1 - ratio)}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />

        {/* Needle / indicator marker */}
        <line
          x1={cx}
          y1={cy}
          x2={dotX}
          y2={dotY}
          stroke="#1B4D3E"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.25"
        />
        <circle
          cx={dotX}
          cy={dotY}
          r="5"
          fill="#FFFFFF"
          stroke="#1B4D3E"
          strokeWidth="3"
          className="shadow-md transition-all duration-700 ease-out"
        />
      </svg>

      {/* Numerical score readout */}
      <div className="absolute bottom-1 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-bold tracking-tight text-neutral-900 leading-none">
          {score}%
        </span>
        <span className="text-[10px] font-medium text-neutral-400 mt-1 uppercase tracking-wider">
          {label}
        </span>
      </div>
    </div>
  );
};
