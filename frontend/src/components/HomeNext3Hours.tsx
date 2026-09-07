import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { ChevronRight, X } from 'lucide-react';

export const HomeNext3Hours: React.FC = () => {
  const { forecast2to3Hr, forecastTrend } = useAppStore();
  const [showSheet, setShowSheet] = useState(false);

  return (
    <>
      <section
        onClick={() => setShowSheet(true)}
        className="py-1 select-none cursor-pointer group active:opacity-80 transition"
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Next 3 Hours
          </h2>
          <div className="flex items-center text-blue-600 font-bold text-xs group-hover:translate-x-0.5 transition-transform">
            <span>Forecast</span>
            <ChevronRight size={14} className="ml-0.5" />
          </div>
        </div>

        {/* 4 HORIZONTAL COLUMNS (CLEAN & DIRECT) */}
        <div className="grid grid-cols-4 gap-2 text-center my-2">
          {forecast2to3Hr.map((item, idx) => {
            const isHighRisk = item.status === 'HIGH RISK';
            const isCaution = item.status === 'CAUTION';

            const statusLabel = isHighRisk ? 'Risk' : isCaution ? 'Caution' : 'Good';
            const statusColor = isHighRisk
              ? 'bg-red-100 text-red-800'
              : isCaution
              ? 'bg-amber-100 text-amber-800'
              : 'bg-emerald-100 text-emerald-800';

            return (
              <div
                key={idx}
                className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between space-y-1"
              >
                <div className="text-[11px] font-bold text-slate-800">
                  {item.hourLabel}
                </div>

                <div className="py-0.5">
                  <div className="text-base font-black text-slate-900 leading-tight">
                    {item.waveHeight}<span className="text-[10px] font-bold text-slate-500 ml-0.5">m</span>
                  </div>
                  <div className="text-[10px] font-bold text-slate-600">
                    {item.windSpeed} km/h
                  </div>
                </div>

                <span className={`text-[10px] font-black px-1 py-0.5 rounded uppercase tracking-tight block ${statusColor}`}>
                  {statusLabel}
                </span>
              </div>
            );
          })}
        </div>

        {/* TREND STATEMENT */}
        <div className="text-xs font-bold text-slate-800 pt-0.5">
          {forecastTrend}
        </div>
      </section>

      {/* FULL FORECAST MODAL */}
      {showSheet && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-200 select-none">
          <div className="fixed inset-0" onClick={() => setShowSheet(false)} />

          <div className="relative z-10 w-full max-w-lg bg-white rounded-t-2xl shadow-2xl border-t border-slate-200 max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-full duration-300">
            <div className="pt-3 pb-3 px-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">3-Hour Wave & Wind Forecast</h2>
                <p className="text-xs text-slate-500">INCOIS ERDDAP Swell Model</p>
              </div>

              <button
                onClick={() => setShowSheet(false)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto custom-scrollbar space-y-3 text-xs text-slate-900">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-slate-800 leading-relaxed font-medium">
                Morning conditions remain smooth with 0.8m wave height. Beginning at +2 hours (08:00 AM), offshore wind builds to 22 km/h, generating 1.2m to 1.7m building swell. Return before 4:30 PM recommended.
              </div>

              <div className="space-y-2">
                {forecast2to3Hr.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="font-extrabold text-sm text-slate-900">{item.hourLabel} · {item.time}</div>
                      <div className="text-slate-600">{item.statusLabel}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-blue-700 font-extrabold text-sm">{item.waveHeight}m waves</div>
                      <div className="text-slate-500 text-[10px]">{item.windSpeed} km/h wind · {item.rainProb}% rain</div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowSheet(false)}
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
