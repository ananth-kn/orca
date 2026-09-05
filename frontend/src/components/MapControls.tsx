import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Layers, Compass, Zap, MapPin, X, Clock } from 'lucide-react';

export const MapControls: React.FC = () => {
  const { 
    isPlannerIntelligenceActive, 
    setPlannerIntelligenceActive,
    isFollowMode,
    setFollowMode,
    timeOffset,
    setTimeOffset,
    activeLayers,
    toggleLayer
  } = useAppStore();

  const [showLayersSheet, setShowLayersSheet] = useState(false);

  return (
    <>
      {/* Floating Buttons Right Side */}
      <div className="absolute right-4 bottom-48 md:bottom-56 flex flex-col space-y-3 z-10 pointer-events-auto">
        
        {/* ORCA Intelligence Mode */}
        <button 
          onClick={() => setPlannerIntelligenceActive(!isPlannerIntelligenceActive)}
          className={`p-3 rounded-full shadow-lg transition-colors border ${
            isPlannerIntelligenceActive 
              ? 'bg-marine-900 text-white border-marine-800' 
              : 'bg-white/90 text-marine-900 border-white backdrop-blur'
          }`}
        >
          <Zap size={22} className={isPlannerIntelligenceActive ? 'fill-current text-white' : ''} />
        </button>

        {/* Layers */}
        <button 
          onClick={() => setShowLayersSheet(true)}
          className="bg-white/90 backdrop-blur p-3 rounded-full shadow-lg text-marine-900 border border-white active:bg-slate-50"
        >
          <Layers size={22} />
        </button>

        {/* Nearby */}
        <button 
          className="bg-white/90 backdrop-blur p-3 rounded-full shadow-lg text-marine-900 border border-white active:bg-slate-50"
        >
          <MapPin size={22} />
        </button>

        {/* Follow Mode */}
        <button 
          onClick={() => setFollowMode(!isFollowMode)}
          className={`p-3 rounded-full shadow-lg border transition-colors ${
            isFollowMode 
              ? 'bg-marine-100 text-marine-900 border-marine-200' 
              : 'bg-white/90 text-marine-900 border-white backdrop-blur'
          }`}
        >
          <Compass size={22} />
        </button>

      </div>

      {/* Time Slider (Bottom Center) */}
      <div className="absolute bottom-32 left-4 right-16 z-10 pointer-events-auto max-w-sm mx-auto">
        <div className="bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl shadow-lg border border-slate-200">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center space-x-1 text-[11px] font-bold text-marine-900">
              <Clock size={12} />
              <span>{timeOffset === 0 ? 'NOW' : `+${timeOffset} HOURS`}</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {timeOffset > 1 ? 'Worsening' : 'Stable'}
            </span>
          </div>
          <input 
            type="range" 
            min="0" max="3" 
            value={timeOffset}
            onChange={(e) => setTimeOffset(parseInt(e.target.value))}
            className="w-full accent-marine-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[9px] font-bold text-slate-400 mt-2 px-1 tracking-widest">
            <span>NOW</span>
            <span>+1H</span>
            <span>+2H</span>
            <span>+3H</span>
          </div>
        </div>
      </div>

      {/* Layers Sheet */}
      {showLayersSheet && (
        <div className="absolute inset-0 bg-marine-900/40 backdrop-blur-sm z-30 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 pb-safe animate-in slide-in-from-bottom-full">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold text-marine-900 tracking-tight">ORCA Map Layers</h2>
              <button onClick={() => setShowLayersSheet(false)} className="bg-slate-100 p-2 rounded-full text-slate-500">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-6 h-64 overflow-y-auto no-scrollbar pb-10">
              
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Fishing & Safety</h3>
                <div className="space-y-2">
                  {[
                    { id: 'pfz', label: 'Potential Fishing Zones' },
                    { id: 'restricted', label: 'Restricted areas' },
                    { id: 'hazards', label: 'Marine hazards' }
                  ].map(layer => (
                    <label key={layer.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl cursor-pointer active:bg-slate-100 border border-slate-100">
                      <span className="font-bold text-marine-900 text-sm">{layer.label}</span>
                      <input 
                        type="checkbox" 
                        checked={(activeLayers as any)[layer.id]}
                        onChange={() => toggleLayer(layer.id as any)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-marine-600"></div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Weather & Ocean</h3>
                <div className="space-y-2">
                  {[
                    { id: 'rain', label: 'Precipitation' },
                    { id: 'wind', label: 'Wind field' },
                    { id: 'waves', label: 'Wave swell' }
                  ].map(layer => (
                    <label key={layer.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl cursor-pointer active:bg-slate-100 border border-slate-100">
                      <span className="font-bold text-marine-900 text-sm">{layer.label}</span>
                      <input 
                        type="checkbox" 
                        checked={(activeLayers as any)[layer.id]}
                        onChange={() => toggleLayer(layer.id as any)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-marine-600"></div>
                    </label>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
};
