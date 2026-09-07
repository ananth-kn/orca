import React from 'react';
import { useAppStore } from '../store/useAppStore';

export const HomeOrcaWatching: React.FC = () => {
  const { orcaWatchingState, orcaWatchingDetails } = useAppStore();

  const isFound = orcaWatchingState === 'found_something';

  return (
    <div className="bg-slate-100/90 border border-slate-200/80 rounded-2xl px-3.5 py-2.5 flex items-center justify-between text-xs select-none shadow-2xs">
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${isFound ? 'bg-amber-500 animate-pulse' : 'bg-emerald-600'}`} />
        <span className="font-extrabold text-slate-800 tracking-wide text-[11px] uppercase">
          {isFound ? 'ORCA FOUND SOMETHING' : 'ORCA WATCHING'}
        </span>
      </div>

      <div className="text-[11px] text-slate-600 font-medium">
        Monitoring: {orcaWatchingDetails.join(' · ')}
      </div>
    </div>
  );
};
