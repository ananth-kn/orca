import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { Mic, User, Search, RefreshCw } from 'lucide-react';

export const TopCommandBar: React.FC = () => {
  const { isOffline, setOffline, tripState, selectedPfz, setPlannerIntelligenceActive } = useAppStore();

  const getPlaceholder = () => {
    if (tripState === 'travelling' || tripState === 'returning') return "Ask ORCA about my route...";
    if (selectedPfz) return "Ask ORCA about this area...";
    return "Search or ask ORCA...";
  };

  return (
    <div className="absolute top-0 left-0 right-0 pt-safe px-4 z-20 pointer-events-none flex flex-col space-y-3">
      
      {/* ORCA Sync Status */}
      <div className="flex items-center space-x-2 mt-2 pointer-events-auto">
        <button className="flex items-center justify-center w-8 h-8 rounded-full bg-marine-900 text-white shadow-lg border border-marine-800 active:scale-95 transition-transform">
          <RefreshCw size={14} />
        </button>
        <div className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold tracking-widest text-marine-700 shadow-sm uppercase border border-white/50">
          {isOffline ? 'CACHED · 18m ago' : 'LIVE · 4m ago'}
        </div>
      </div>

      {/* Universal Command Bar */}
      <div className="flex w-full items-center space-x-3 pointer-events-auto">
        
        <div 
          onClick={() => {
            // In a real app this would open the keyboard and AI chat history overlay
            setPlannerIntelligenceActive(true); // Demo interaction: clicking search triggers AI analysis
          }}
          className="bg-white/95 backdrop-blur-lg rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-2 pl-5 flex-1 flex items-center space-x-3 cursor-text active:scale-[0.98] transition-transform border border-slate-200"
        >
          <Search size={18} className="text-marine-600" />
          <span className="flex-1 text-sm font-medium text-slate-500 truncate">{getPlaceholder()}</span>
          <div className="text-white bg-marine-900 p-2.5 rounded-full shadow-md">
            <Mic size={16} />
          </div>
        </div>
        
        {/* Profile Avatar (Toggles offline mode for demo) */}
        <button 
          onClick={() => setOffline(!isOffline)}
          className={`backdrop-blur-lg p-3 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] active:scale-[0.98] transition-transform border ${
            isOffline ? 'bg-slate-100 text-slate-400 border-slate-300' : 'bg-white/95 text-marine-900 border-slate-200'
          }`}
        >
          <User size={20} />
        </button>
      </div>

    </div>
  );
};
