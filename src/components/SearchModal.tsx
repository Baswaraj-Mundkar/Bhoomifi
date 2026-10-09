'use client';

import React, { useState } from 'react';
import { Search, X, Activity, Droplets, ChevronRight, Cpu, Sun, Thermometer } from 'lucide-react';
import { NavigationTab } from '@/types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavigationTab) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const quickLinks = [
    { label: 'Capacitive Soil Moisture Sensor v2.0', tab: 'field' as NavigationTab, type: 'Sensor Channel', icon: Droplets },
    { label: '1-Channel Relay & Water Pump Control', tab: 'irrigation' as NavigationTab, type: 'Actuator', icon: Cpu },
    { label: 'DHT11 Temperature & Humidity', tab: 'home' as NavigationTab, type: 'Microclimate', icon: Thermometer },
    { label: 'BH1750 Ambient Light', tab: 'history' as NavigationTab, type: 'Photometric', icon: Sun },
    { label: 'Irrigation Threshold Settings (35% / 45%)', tab: 'settings' as NavigationTab, type: 'Thresholds', icon: Activity }
  ];

  const filteredLinks = query.trim()
    ? quickLinks.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
    : quickLinks;

  const handleSelect = (tab: NavigationTab) => {
    onNavigate(tab);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-[32px] p-5 shadow-2xl border border-neutral-100 animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="relative flex items-center">
          <Search className="w-5 h-5 text-neutral-400 absolute left-4" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sensors, relay, thresholds, DHT11..."
            className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-neutral-100/80 border-none text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#227C4F]"
          />
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-neutral-200/80 hover:bg-neutral-300 text-neutral-600 flex items-center justify-center absolute right-3 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-4">
          <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider px-2 mb-2">
            Suggested Quick Actions
          </p>
          <div className="space-y-1">
            {filteredLinks.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(item.tab)}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-neutral-50 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#E7F3EC] text-[#227C4F] flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-800 group-hover:text-[#227C4F] transition-colors">
                        {item.label}
                      </h4>
                      <span className="text-[11px] text-neutral-400">{item.type}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
