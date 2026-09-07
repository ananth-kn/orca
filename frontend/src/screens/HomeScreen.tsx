import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { Anchor, Cloud, Radio, Mic, Search, Waves, Wind, CloudRain, AlertTriangle, Settings } from 'lucide-react';

export const HomeScreen: React.FC = () => {
  const {
    setActiveTab,
    navigateToMapWithPfz,
    weather,
    forecast2to3Hr,
    forecastTrend,
    activeAlert,
    lastRefreshedLabel,
    refreshMarine,
    pfzs,
    setSOSOpen,
  } = useAppStore();

  const nearestPfz = pfzs.length > 0
    ? pfzs.reduce((a, b) => (a.distanceKm < b.distanceKm ? a : b))
    : null;

  return (
    <div className="min-h-full pb-24 px-4 pt-4 max-w-md mx-auto space-y-4 select-none bg-[#0f1535] text-white">

      {/* TOP BAR */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => refreshMarine()}
          className="font-black text-2xl tracking-widest text-white active:scale-95 transition-transform"
        >
          ORCA
        </button>
        <div className="bg-white/[0.06] px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/[0.08] text-[10px] font-bold tracking-wide">
          <div className="bg-emerald-400 rounded-full w-2 h-2 animate-pulse"></div>
          {lastRefreshedLabel}
        </div>
      </div>

      {/* AI SEARCH BAR */}
      <div
        onClick={() => setActiveTab('ai')}
        className="w-full bg-white/[0.05] border border-white/[0.10] rounded-2xl p-1 flex items-center shadow-lg active:scale-[0.98] transition-transform cursor-pointer"
      >
        <div className="pl-4 pr-2 text-white/40"><Search size={20} /></div>
        <div className="flex-1 text-white/50 text-sm font-medium py-3">Ask ORCA anything...</div>
        <button className="bg-blue-600 w-10 h-10 rounded-xl flex items-center justify-center mr-1 shadow-md">
          <Mic size={20} className="text-white" />
        </button>
      </div>

      {/* TRIGGER SOS BUTTON */}
      <button
        onClick={() => setSOSOpen(true)}
        className="w-full bg-red-600 hover:bg-red-700 active:scale-95 transition-all text-white font-extrabold text-2xl py-5 rounded-2xl shadow-lg border border-red-500/30"
      >
        TRIGGER SOS
      </button>

      {/* NOTIFICATION PANEL — LoRa messages + alerts */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center justify-between">
          <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Notifications</span>
          <div className="flex items-center gap-1 text-[10px] text-white/40 font-medium">
            <Radio size={10} />
            LoRa Active
          </div>
        </div>

        {/* LoRa messages from fishermen */}
        <div className="px-4 py-2.5 border-b border-white/[0.04] flex items-start gap-3 cursor-pointer active:bg-white/[0.03]" onClick={() => setActiveTab('chat')}>
          <Radio size={16} className="text-blue-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-bold text-white/80">Raju <span className="text-white/40 font-medium">· 2.1 km away</span></div>
            <div className="text-[12px] text-white/50 truncate">Good catch near Sector 4A. Tuna schools spotted.</div>
          </div>
          <span className="text-[10px] text-white/30 shrink-0">3m ago</span>
        </div>

        {/* Alert notification */}
        {activeAlert && activeAlert.active && (
          <div className="px-4 py-2.5 flex items-start gap-3">
            <AlertTriangle size={16} className={activeAlert.type === 'HIGH RISK' ? 'text-red-400 mt-0.5 shrink-0' : 'text-amber-400 mt-0.5 shrink-0'} />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-bold text-white/80">
                <span className={activeAlert.type === 'HIGH RISK' ? 'text-red-400' : 'text-amber-400'}>{activeAlert.type}</span>
                <span className="text-white/60"> · {activeAlert.title}</span>
              </div>
              <div className="text-[12px] text-white/50">{activeAlert.subtitle}</div>
              {activeAlert.recommendation && (
                <div className="text-[11px] text-white/35 mt-0.5">{activeAlert.recommendation}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* UNIFIED WEATHER CARD */}
      <div
        onClick={() => setActiveTab('weather')}
        className="bg-[#1565C0] rounded-2xl shadow-lg border border-blue-400/15 cursor-pointer active:scale-[0.98] transition-transform overflow-hidden"
      >
        {/* Top section: current conditions */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cloud size={36} className="text-white/90 drop-shadow-md" fill="currentColor" />
            <div>
              <div className="font-extrabold text-xl leading-none tracking-tight">Marine Weather</div>
              <div className="flex items-center gap-3 mt-2 text-[13px] font-bold text-white/85">
                <span className="flex items-center gap-1"><Waves size={12} /> {weather.waveHeight} m</span>
                <span className="flex items-center gap-1"><Wind size={12} /> {weather.windSpeed} km/h</span>
                <span className="flex items-center gap-1"><CloudRain size={12} /> {weather.rainProb}%</span>
              </div>
            </div>
          </div>
          <div className={`px-3 py-1.5 rounded-xl border font-bold text-[12px] ${
            weather.status === 'FAVOURABLE' ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300' :
            weather.status === 'CAUTION' ? 'bg-amber-500/20 border-amber-400/30 text-amber-300' :
            'bg-red-500/20 border-red-400/30 text-red-300'
          }`}>
            {weather.status}
          </div>
        </div>

        {/* Bottom section: 3-hour forecast */}
        <div className="bg-black/15 px-4 py-3 border-t border-white/10">
          <div className="grid grid-cols-4 gap-2">
            {forecast2to3Hr.map((hr) => (
              <div key={hr.hourLabel} className="text-center">
                <div className="text-[9px] font-bold text-white/50 mb-1 uppercase">{hr.hourLabel}</div>
                <div className="text-[14px] font-extrabold leading-none">{hr.waveHeight} m</div>
                <div className="text-[10px] text-white/60 mt-0.5 font-semibold">{hr.windSpeed} km/h</div>
                <div className={`w-1.5 h-1.5 rounded-full mx-auto mt-1.5 ${
                  hr.status === 'FAVOURABLE' ? 'bg-emerald-400' :
                  hr.status === 'CAUTION' ? 'bg-amber-400' : 'bg-red-400'
                }`}></div>
              </div>
            ))}
          </div>
          {forecastTrend && (
            <p className="text-[10px] text-white/40 mt-2 font-medium">{forecastTrend}</p>
          )}
        </div>
      </div>

      {/* QUICK ACTIONS: FISHING SPOTS & FLEET CHAT */}
      <div className="grid grid-cols-2 gap-3 pb-4">
        <button
          onClick={() => nearestPfz ? navigateToMapWithPfz(nearestPfz.id) : setActiveTab('map')}
          className="bg-[#1976D2] aspect-square rounded-2xl p-4 flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform shadow-lg border border-blue-400/15"
        >
          <Anchor size={44} className="text-white drop-shadow-md" strokeWidth={2.5} />
          <span className="font-bold text-[15px] tracking-tight">Fishing Spots</span>
          {nearestPfz && (
            <span className="text-[10px] font-bold bg-white/15 px-2 py-0.5 rounded-md">{nearestPfz.distanceKm} km · {nearestPfz.potential}</span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className="bg-[#D47735] aspect-square rounded-2xl p-4 flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg border border-orange-400/15"
        >
          <Radio size={44} className="text-white drop-shadow-md" />
          <span className="font-bold text-[15px] tracking-tight">Fleet Chat</span>
          <span className="text-[9px] font-bold bg-white/15 px-2 py-0.5 rounded-md tracking-wider uppercase">LoRa Ready</span>
        </button>
      </div>

      {/* SETTINGS PLACEHOLDER BUTTON */}
      <button
        onClick={() => setActiveTab('profile')}
        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl py-3.5 flex items-center justify-center gap-2 text-white/50 font-semibold text-sm active:bg-white/[0.07] transition-colors"
      >
        <Settings size={18} />
        Settings & Profile
      </button>

    </div>
  );
};
