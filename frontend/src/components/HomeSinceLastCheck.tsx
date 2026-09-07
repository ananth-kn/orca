import React from 'react';
import { useAppStore } from '../store/useAppStore';

export const HomeSinceLastCheck: React.FC = () => {
  const { sinceLastCheck } = useAppStore();

  if (!sinceLastCheck || sinceLastCheck.length === 0) return null;

  return (
    <section className="py-1 select-none space-y-1.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Since Last Check
        </h2>
        <span className="text-[10px] text-slate-400 font-medium">Over 1 hour</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        {sinceLastCheck.map((item, idx) => (
          <div key={idx} className="bg-slate-50 border border-slate-200/80 p-2 rounded-lg">
            <span className="text-[10px] font-bold text-slate-500 block uppercase">{item.metric}</span>
            <div className="font-extrabold text-xs text-slate-900 mt-0.5">
              <span className="text-slate-400 font-normal">{item.from}</span> → <span>{item.to}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
