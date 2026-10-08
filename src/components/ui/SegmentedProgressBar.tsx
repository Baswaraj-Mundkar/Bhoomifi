'use client';

import React from 'react';

interface SegmentedProgressBarProps {
  percentage: number; // 0 to 100
  totalBars?: number;
  heightClass?: string;
  leftLabel?: string;
  rightLabel?: string;
}

export const SegmentedProgressBar: React.FC<SegmentedProgressBarProps> = ({
  percentage,
  totalBars = 48,
  heightClass = 'h-5',
  leftLabel = 'Dry (0%)',
  rightLabel = 'Optimal Moisture (100%)'
}) => {
  const activeCount = Math.round((percentage / 100) * totalBars);

  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center justify-between text-[11px] font-medium text-neutral-400">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>

      <div className={`flex items-center justify-between gap-[2px] w-full ${heightClass}`}>
        {Array.from({ length: totalBars }).map((_, index) => {
          const isActive = index < activeCount;
          return (
            <div
              key={index}
              className={`flex-1 h-full rounded-full transition-all duration-300 ${
                isActive
                  ? 'bg-[#227C4F] opacity-90 hover:opacity-100'
                  : 'bg-neutral-200/70'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
};
