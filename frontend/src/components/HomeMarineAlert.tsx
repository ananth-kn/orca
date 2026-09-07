import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';

export const HomeMarineAlert: React.FC = () => {
  const { activeAlert, setActiveTab } = useAppStore();

  if (!activeAlert || !activeAlert.active) {
    return (
      <section className="py-1 text-xs select-none">
        <div className="flex items-center space-x-2 text-slate-700 bg-slate-50 border border-slate-200/80 px-3 py-2 rounded-xl">
          <CheckCircle size={15} className="text-emerald-700 shrink-0" />
          <span className="font-extrabold text-slate-900 uppercase tracking-wide text-[11px]">Nothing Urgent</span>
          <span className="text-slate-500 font-medium">— Normal coastal conditions.</span>
        </div>
      </section>
    );
  }

  const isHighRisk = activeAlert.type === 'HIGH RISK';

  return (
    <section
      onClick={() => setActiveTab('map')}
      className={`border rounded-xl p-3 select-none cursor-pointer transition active:scale-[0.99] ${
        isHighRisk
          ? 'bg-red-50 border-red-200 text-red-950'
          : 'bg-amber-50 border-amber-200 text-amber-950'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-2.5">
          <AlertTriangle
            size={18}
            className={`shrink-0 mt-0.5 ${isHighRisk ? 'text-red-700' : 'text-amber-700'}`}
          />
          <div>
            <div className="flex items-center space-x-2">
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                isHighRisk ? 'bg-red-700 text-white' : 'bg-amber-600 text-white'
              }`}>
                {activeAlert.type}
              </span>
              <span className="font-extrabold text-sm text-slate-900">
                {activeAlert.title}
              </span>
            </div>

            <div className="text-xs font-bold text-slate-900 mt-1">
              {activeAlert.subtitle || '14 → 24 km/h in ~2 hours'}
            </div>

            {activeAlert.recommendation && (
              <div className="text-xs font-semibold text-slate-800 mt-1">
                ORCA recommends: {activeAlert.recommendation}
              </div>
            )}
          </div>
        </div>

        <ChevronRight size={16} className="text-slate-400 shrink-0 ml-1 mt-1" />
      </div>
    </section>
  );
};
