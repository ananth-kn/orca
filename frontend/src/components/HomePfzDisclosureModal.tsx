import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { X, Navigation, Clock, ShieldCheck } from 'lucide-react';

export const HomePfzDisclosureModal: React.FC = () => {
  const { disclosurePfzId, setDisclosurePfzId, pfzs, navigateToMapWithPfz } = useAppStore();

  if (!disclosurePfzId) return null;

  const pfz = pfzs.find((p) => p.id === disclosurePfzId) || pfzs[0];

  const handleStartRoute = () => {
    setDisclosurePfzId(null);
    navigateToMapWithPfz(pfz.id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-200 select-none">
      
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={() => setDisclosurePfzId(null)} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-xl bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-full duration-300">
        
        {/* Header */}
        <div className="pt-3 pb-3 px-5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-extrabold text-slate-900">{pfz.name}</h2>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${
                pfz.potential === 'High' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {pfz.potential} Potential
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {pfz.distanceKm} km · {pfz.travelTimeMin} min ETA · MOSDAC Verified
            </p>
          </div>

          <button
            onClick={() => setDisclosurePfzId(null)}
            className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content (Levels 2 and 3) */}
        <div className="overflow-y-auto custom-scrollbar p-5 space-y-5 flex-1 text-slate-900">
          
          {/* LEVEL 2: DETAILED MARINE PARAMETERS */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Sector Marine Conditions (Level 2)
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-medium block">WAVES</span>
                <span className="font-extrabold text-sm text-slate-900">{pfz.waveHeightM} m</span>
                <span className="text-[10px] text-slate-500 block">{pfz.seaCondition}</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-medium block">WIND SPEED</span>
                <span className="font-extrabold text-sm text-slate-900">{pfz.windSpeedKmh} km/h</span>
                <span className="text-[10px] text-slate-500 block">WSW</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-medium block">SEA TEMP (SST)</span>
                <span className="font-extrabold text-sm text-slate-900">{pfz.sstCelsius}°C</span>
                <span className="text-[10px] text-emerald-600 font-bold">Thermal bloom</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-medium block">CHLOROPHYLL</span>
                <span className="font-extrabold text-sm text-slate-900">{pfz.chlorophyllMgM3} mg/m³</span>
                <span className="text-[10px] text-slate-500 block">High density</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 pt-2 px-1">
              <span>Target Fish: <strong className="text-slate-900">{pfz.targetSpecies.join(', ')}</strong></span>
              <span>Water Depth: <strong className="text-slate-900">{pfz.depthM}m</strong></span>
            </div>
          </div>

          {/* LEVEL 3: WHY ORCA RECOMMENDS THIS AREA */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2.5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Why ORCA Recommends This Sector (Level 3)
            </h3>

            <p className="text-xs text-slate-700 leading-relaxed">
              {pfz.recommendationReason}
            </p>

            <div className="space-y-1.5 pt-1 text-[11px] text-slate-600">
              <div className="flex items-center space-x-1.5">
                <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                <span>Geospatial Safety: 4.2 km clear buffer from restricted naval zone.</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Clock size={14} className="text-blue-600 shrink-0" />
                <span>Forecast Window: Favourable until 08:30 AM before wave heights increase.</span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleStartRoute}
            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-extrabold text-sm py-3.5 px-4 rounded-xl flex items-center justify-center space-x-2 transition shadow-xs"
          >
            <Navigation size={18} className="fill-current" />
            <span>OPEN IN MAP & START NAVIGATION</span>
          </button>

        </div>

      </div>
    </div>
  );
};
