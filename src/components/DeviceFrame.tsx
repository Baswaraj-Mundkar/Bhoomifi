'use client';

import React from 'react';
import { Wifi, Battery, Signal } from 'lucide-react';

interface DeviceFrameProps {
  children: React.ReactNode;
  time?: string;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({
  children,
  time = '9:41'
}) => {
  return (
    <div className="relative mx-auto my-3 w-full max-w-[400px] h-[844px] bg-[#F5F6F5] rounded-[52px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.18),0_0_0_12px_#272B28,0_0_0_14px_#3A403C] overflow-hidden flex flex-col border border-white/20 select-none">
      {/* Phone Speaker & Dynamic Island */}
      <div className="absolute top-0 left-0 right-0 z-40 px-7 pt-3.5 pb-2 flex items-center justify-between text-neutral-900 pointer-events-none">
        {/* Clock */}
        <span className="text-xs font-semibold tracking-tight">{time}</span>

        {/* Dynamic Island Pill */}
        <div className="w-24 h-4.5 bg-black rounded-full shadow-inner mx-auto -translate-x-1" />

        {/* Status icons */}
        <div className="flex items-center gap-1.5 text-neutral-800">
          <Signal className="w-3.5 h-3.5 fill-current" />
          <Wifi className="w-3.5 h-3.5 stroke-[2.5]" />
          <Battery className="w-4 h-4 stroke-[2.2] fill-current" />
        </div>
      </div>

      {/* Main Content Area (Scrollable within device) */}
      <div className="flex-1 overflow-y-auto pt-10 pb-4 scrollbar-none relative">
        {children}
      </div>

      {/* Home Indicator Bar */}
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-neutral-900/40 rounded-full z-40 pointer-events-none" />
    </div>
  );
};
