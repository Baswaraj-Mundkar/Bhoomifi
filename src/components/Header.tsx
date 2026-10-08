'use client';

import React from 'react';
import { Search, Sprout, Bell } from 'lucide-react';
import { DeviceStatus } from '@/types';

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onOpenNotifications: () => void;
  unreadCount?: number;
  isDemoMode?: boolean;
  deviceStatus?: DeviceStatus;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  onOpenSettings,
  onOpenNotifications,
  unreadCount = 0,
  isDemoMode = true,
  deviceStatus = 'OFFLINE'
}) => {
  return (
    <header className="w-full flex items-center justify-between px-6 pt-5 pb-3">
      {/* Brand logo & Demo indicator */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-2xl bg-[#E7F3EC] flex items-center justify-center text-[#227C4F] shadow-sm">
          <Sprout className="w-5 h-5 stroke-[2.2]" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-[20px] font-bold tracking-tight text-[#16201B]">
              Bhoomi<span className="text-[#227C4F]">Fi</span>
            </span>
          </div>
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase ${isDemoMode || deviceStatus === 'ONLINE' ? 'text-[#227C4F]' : 'text-amber-700'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isDemoMode || deviceStatus === 'ONLINE' ? 'bg-[#227C4F]' : 'bg-amber-600'}`}></span>
            {isDemoMode ? 'Demo Mode' : deviceStatus === 'ONLINE' ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2.5">
        {/* Search button */}
        <button
          onClick={onOpenSearch}
          aria-label="Search farm metrics"
          className="w-10 h-10 rounded-full bg-white border border-neutral-200/70 flex items-center justify-center text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 shadow-sm transition-all duration-200"
        >
          <Search className="w-4 h-4 stroke-[2]" />
        </button>

        {/* Notifications / Alerts button */}
        <button
          onClick={onOpenNotifications}
          aria-label="View notifications"
          className="relative w-10 h-10 rounded-full bg-white border border-neutral-200/70 flex items-center justify-center text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 shadow-sm transition-all duration-200"
        >
          <Bell className="w-4 h-4 stroke-[2]" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white"></span>
          )}
        </button>

        {/* Profile / Farm Settings */}
        <button
          onClick={onOpenSettings}
          aria-label="Farm settings"
          className="w-10 h-10 rounded-full border border-neutral-200/70 shadow-sm hover:ring-2 hover:ring-[#227C4F]/30 transition-all duration-200 flex items-center justify-center bg-gradient-to-br from-[#E7F3EC] to-[#D6E9D8] text-[#153B28] text-[10px] font-bold"
        >
          BM
        </button>
      </div>
    </header>
  );
};
