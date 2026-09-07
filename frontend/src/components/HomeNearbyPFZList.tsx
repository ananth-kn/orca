import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { ChevronRight } from 'lucide-react';

export const HomeNearbyPFZList: React.FC = () => {
  const { pfzs, setDisclosurePfzId } = useAppStore();

  return (
    <section className="py-1 select-none space-y-2">
      
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Nearby PFZ
        </h2>
        <span className="text-[11px] text-slate-500 font-medium">
          {pfzs.length} active zones
        </span>
      </div>

      {/* COMPACT LIST ROWS */}
      <div className="space-y-1.5">
        {pfzs.map((pfz) => {
          const isHigh = pfz.potential === 'High';
          return (
            <div
              key={pfz.id}
              onClick={() => setDisclosurePfzId(pfz.id)}
              className="p-3 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl cursor-pointer transition active:scale-[0.99] flex items-center justify-between shadow-2xs group"
            >
              <div className="flex items-center space-x-2.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  isHigh ? 'bg-emerald-600' : 'bg-amber-500'
                }`} />
                <div>
                  <div className="font-extrabold text-xs sm:text-sm text-slate-900">
                    {pfz.name.split('—')[0].trim()}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {pfz.targetSpecies.join(', ')} · Waves {pfz.waveHeightM}m
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-right">
                <div>
                  <span className="font-extrabold text-xs text-slate-900 block">
                    {pfz.distanceKm} km
                  </span>
                  <span className={`text-[10px] font-black uppercase ${
                    isHigh ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    {pfz.potential}
                  </span>
                </div>

                <ChevronRight size={15} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>

    </section>
  );
};
