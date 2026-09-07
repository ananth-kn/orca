import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { ChevronRight, X, ShieldCheck, AlertTriangle } from 'lucide-react';

export const HomeCurrentConditions: React.FC = () => {
  const { weather, lastRefreshedLabel, isOffline } = useAppStore();
  const [showDetailSheet, setShowDetailSheet] = useState(false);

  const isFavourable = weather.status === 'FAVOURABLE';
  const isCaution = weather.status === 'CAUTION';

  return (
    <>
      {/* 1. HERO CURRENT CONDITIONS (CLEAN & BOLD GLANCE) */}
      <section
        onClick={() => setShowDetailSheet(true)}
        className="py-1 select-none cursor-pointer group active:opacity-80 transition"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span
              className={`inline-block px-2.5 py-1 rounded text-xs font-black tracking-wider uppercase ${
                isFavourable
                  ? 'bg-emerald-700 text-white'
                  : isCaution
                  ? 'bg-amber-600 text-white'
                  : 'bg-red-700 text-white'
              }`}
            >
              {weather.status}
            </span>
            <span className="text-xs font-bold text-slate-700">Mangaluru Coast</span>
          </div>

          <span className="text-[11px] text-slate-500 font-medium">
            {isOffline ? 'Offline' : lastRefreshedLabel}
          </span>
        </div>

        {/* PRIMARY 3 LARGE VALUES IN ONE CLEAN ROW */}
        <div className="grid grid-cols-3 gap-2 text-slate-900 my-2.5">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Waves</span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-0.5">
              {weather.waveHeight}<span className="text-xs font-bold text-slate-500 ml-0.5">m</span>
            </div>
            <span className="text-[10px] text-slate-500">Swell 7.5s</span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Wind</span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-0.5">
              {weather.windSpeed}<span className="text-xs font-bold text-slate-500 ml-0.5">km/h</span>
            </div>
            <span className="text-[10px] text-slate-500">WSW</span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Rain</span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-0.5">
              {weather.rainProb}<span className="text-xs font-bold text-slate-500 ml-0.5">%</span>
            </div>
            <span className="text-[10px] text-slate-500">Low risk</span>
          </div>
        </div>

        {/* SECONDARY GLANCE ROW */}
        <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-100">
          <div>
            <span className="text-slate-500 font-medium">Tide: </span>
            <span className="font-bold text-slate-800">High 1.2 m</span>
            <span className="text-slate-300 mx-1.5">|</span>
            <span className="text-slate-500 font-medium">Vis: </span>
            <span className="font-bold text-slate-800">{weather.visibilityKm} km</span>
          </div>

          <div className="flex items-center text-blue-600 font-bold text-xs group-hover:translate-x-0.5 transition-transform">
            <span>Details</span>
            <ChevronRight size={14} className="ml-0.5" />
          </div>
        </div>
      </section>

      {/* 2. TAP-TO-EXPAND DETAIL SHEET */}
      {showDetailSheet && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-200 select-none">
          <div className="fixed inset-0" onClick={() => setShowDetailSheet(false)} />

          <div className="relative z-10 w-full max-w-lg bg-white rounded-t-2xl shadow-2xl border-t border-slate-200 max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-full duration-300">
            
            {/* Header */}
            <div className="pt-3 pb-3 px-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Current Marine Telemetry</h2>
                <p className="text-xs text-slate-500">Mangaluru Coastal Ocean Buoys & Satellite</p>
              </div>

              <button
                onClick={() => setShowDetailSheet(false)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto custom-scrollbar space-y-4 text-xs text-slate-900">
              <div className={`p-3.5 rounded-xl border flex items-start space-x-2.5 ${
                isFavourable ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
              }`}>
                {isFavourable ? (
                  <ShieldCheck size={20} className="text-emerald-700 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle size={20} className="text-amber-700 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold text-sm text-slate-900">
                    {isFavourable ? 'Favourable Sea State' : 'Caution Advised'}
                  </div>
                  <p className="text-slate-700 mt-0.5 leading-relaxed">
                    Waves are 0.8m with smooth swell period. Sea surface temperature is 28.5°C with active thermal front in Sector 4A.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Wave Height & Period</span>
                  <div className="font-extrabold text-sm text-slate-900 mt-0.5">{weather.waveHeight} m (7.5s swell)</div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Wind & Direction</span>
                  <div className="font-extrabold text-sm text-slate-900 mt-0.5">{weather.windSpeed} km/h (WSW 245°)</div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Sea Temp (SST)</span>
                  <div className="font-extrabold text-sm text-slate-900 mt-0.5">{weather.sstCelsius}°C (Optimal)</div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Barometric Pressure</span>
                  <div className="font-extrabold text-sm text-slate-900 mt-0.5">1012 hPa (Stable)</div>
                </div>
              </div>

              <button
                onClick={() => setShowDetailSheet(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-2.5 rounded-xl transition"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
