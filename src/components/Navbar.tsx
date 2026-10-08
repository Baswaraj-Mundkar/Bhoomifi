'use client';

import React from 'react';
import { Home, Trees, Droplets, History, SlidersHorizontal } from 'lucide-react';
import { DeviceStatus, NavigationTab } from '@/types';

interface NavbarProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  isDesktop?: boolean;
  isDemoMode?: boolean;
  deviceStatus?: DeviceStatus;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  isDesktop = false,
  isDemoMode = true,
  deviceStatus = 'OFFLINE'
}) => {
  const navItems: Array<{
    id: NavigationTab;
    label: string;
    icon: React.ElementType;
  }> = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'field', label: 'Field', icon: Trees },
    { id: 'irrigation', label: 'Irrigation', icon: Droplets },
    { id: 'history', label: 'History', icon: History },
    { id: 'settings', label: 'Settings', icon: SlidersHorizontal }
  ];

  if (isDesktop) {
    return (
      <nav className="w-full bg-white/80 backdrop-blur-md border-b border-neutral-200/60 sticky top-0 z-30 px-8 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-neutral-900">
              Bhoomi<span className="text-[#227C4F]">Fi</span>
            </span>
            <span className="text-xs bg-[#E7F3EC] text-[#227C4F] px-2.5 py-0.5 rounded-full font-medium ml-2">
              {isDemoMode ? 'Demo Mode' : deviceStatus === 'ONLINE' ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#F1F3F2] p-1.5 rounded-full">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-900 hover:bg-white/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#227C4F]' : 'text-neutral-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    );
  }

  // Mobile Bottom Navigation Bar
  return (
    <div className="sticky bottom-0 left-0 right-0 z-30 px-5 pb-5 pt-2 bg-gradient-to-t from-[#F3F4F3] via-[#F3F4F3]/95 to-transparent pointer-events-none">
      <nav className="pointer-events-auto max-w-[390px] mx-auto bg-white/90 backdrop-blur-lg border border-neutral-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-full px-3 py-2 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-full transition-all duration-200 relative ${
                isActive ? 'text-[#227C4F]' : 'text-neutral-400 hover:text-neutral-700'
              }`}
            >
              <div
                className={`p-1.5 rounded-full transition-all duration-200 ${
                  isActive ? 'bg-[#E7F3EC]' : 'bg-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              </div>
              <span
                className={`text-[10px] mt-0.5 tracking-tight ${
                  isActive ? 'font-bold text-[#143525]' : 'font-medium text-neutral-400'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
