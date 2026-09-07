import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  Globe,
  Ship,
  Phone,
  Radio,
  HardDrive,
  Check,
  WifiOff,
  Wifi,
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../utils/translations';

export const ProfileScreen: React.FC = () => {
  const { language, setLanguage, isOffline, setOffline, refreshMarine } = useAppStore();
  const [cachePreloaded, setCachePreloaded] = useState(false);
  const [boatName, setBoatName] = useState('Matsya Sagar IND-KA-04');
  const [regNo, setRegNo] = useState('IND-KA-04-MM-8921');

  const handlePrecache = () => {
    setCachePreloaded(true);
    void refreshMarine();
  };

  return (
    <div className="min-h-full pb-24 pt-18 px-4 sm:px-6 max-w-xl mx-auto space-y-4 text-slate-900 select-none bg-[#F8FAFC]">
      
      {/* 1. LANGUAGE SELECTOR (SOLID LIGHT BUTTONS) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5 shadow-xs">
        <div className="flex items-center space-x-2">
          <Globe size={18} className="text-blue-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Select Language / भाषा चुनें</h2>
            <p className="text-[11px] text-slate-500">App interface and voice responses adapt instantly</p>
          </div>
        </div>

        {/* Language Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
          {SUPPORTED_LANGUAGES.map((l) => {
            const isSelected = language === l.code;
            return (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code)}
                className={`p-2.5 rounded-xl border flex items-center justify-between text-left transition active:scale-95 ${
                  isSelected
                    ? 'bg-blue-600 border-blue-700 text-white font-bold shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div>
                  <div className="text-xs font-bold">{l.nativeLabel}</div>
                  <div className="text-[10px] opacity-80">{l.label}</div>
                </div>
                {isSelected && <Check size={14} strokeWidth={3} className="text-white" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. VESSEL REGISTRATION DETAILS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5 shadow-xs">
        <div className="flex items-center space-x-2">
          <Ship size={18} className="text-blue-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Boat & Vessel Profile</h2>
            <p className="text-[11px] text-slate-500">Registered details used for Coast Guard emergency identification</p>
          </div>
        </div>

        <div className="space-y-2.5 pt-1">
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Boat Name</label>
            <input
              type="text"
              value={boatName}
              onChange={(e) => setBoatName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs px-3 py-2 rounded-xl font-bold outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Registration No.</label>
              <input
                type="text"
                value={regNo}
                onChange={(e) => setRegNo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs px-3 py-2 rounded-xl font-mono outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Home Port</label>
              <div className="w-full bg-slate-100 border border-slate-200 text-slate-800 text-xs px-3 py-2 rounded-xl font-bold">
                Mangaluru Old Port
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. EMERGENCY CONTACTS & HELPLINES */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5 shadow-xs">
        <div className="flex items-center space-x-2">
          <Phone size={18} className="text-red-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Emergency Helplines & Coast Guard</h2>
            <p className="text-[11px] text-slate-500">National Search & Rescue (MRCC)</p>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <a
            href="tel:1554"
            className="w-full bg-red-600 hover:bg-red-700 text-white p-3 rounded-xl flex items-center justify-between transition active:scale-95 shadow-xs"
          >
            <div className="flex items-center space-x-2.5">
              <Phone size={18} />
              <div>
                <div className="font-extrabold text-xs">Indian Coast Guard Helpline</div>
                <div className="text-[10px] text-red-100">National Toll-Free SAR</div>
              </div>
            </div>
            <span className="font-mono text-lg font-black">1554</span>
          </a>

          <a
            href="tel:1093"
            className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2.5 rounded-xl flex items-center justify-between transition active:scale-95"
          >
            <div className="flex items-center space-x-2.5">
              <Phone size={16} className="text-blue-600" />
              <div>
                <div className="font-bold text-xs text-slate-900">Coastal Marine Police</div>
                <div className="text-[10px] text-slate-500">Local Control Room</div>
              </div>
            </div>
            <span className="font-mono text-sm font-bold text-slate-900">1093</span>
          </a>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-bold flex items-center">
              <Radio size={14} className="mr-1.5 text-blue-600" /> Emergency VHF Frequency
            </span>
            <span className="font-mono font-bold text-slate-900">Channel 16 (156.8 MHz)</span>
          </div>
        </div>
      </div>

      {/* 4. OFFLINE STORAGE & PRE-CACHE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <HardDrive size={18} className="text-blue-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Offshore Offline Mode</h2>
              <p className="text-[11px] text-slate-500">Save maps & PFZ data for offshore use beyond cellular towers</p>
            </div>
          </div>

          <button
            onClick={() => setOffline(!isOffline)}
            className={`px-3 py-1 rounded-xl font-bold text-xs transition flex items-center space-x-1 ${
              isOffline
                ? 'bg-amber-600 text-white'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {isOffline ? <WifiOff size={13} /> : <Wifi size={13} />}
            <span>{isOffline ? 'Offline' : 'Online'}</span>
          </button>
        </div>

        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {cachePreloaded ? 'All 12 Harbors & Maps Cached locally' : 'Status: Ready'}
          </div>
          <button
            onClick={handlePrecache}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition shadow-xs"
          >
            {cachePreloaded ? 'Refreshed' : 'Pre-cache Coastal Maps'}
          </button>
        </div>
      </div>

      {/* FOOTER */}
      <div className="text-center text-xs text-slate-400 pt-1 pb-4">
        ORCA Marine • Smart India Hackathon ISRO 26176
      </div>

    </div>
  );
};
