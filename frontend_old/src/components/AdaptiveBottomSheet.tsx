import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { ArrowUp, Navigation2, ShieldAlert, CloudLightning } from 'lucide-react';
import { calculateDistanceKm, calculateETA } from '../utils/geo';

export const AdaptiveBottomSheet: React.FC = () => {
  const { 
    bottomSheetState, 
    setBottomSheetState,
    tripState,
    setTripState,
    location,
    selectedPfz,
    timeOffset,
    pfzs,
    weather,
    advisorySummary,
  } = useAppStore();

  const isTravelling = tripState === 'travelling';
  const isExpanded = bottomSheetState === 'expanded' || bottomSheetState === 'reasoning';
  const isReasoning = bottomSheetState === 'reasoning';

  // Find the selected PFZ if any
  const targetData = selectedPfz ? pfzs.find(p => p.id === selectedPfz) : null;
  const dist = targetData ? calculateDistanceKm(location?.lat || 0, location?.lng || 0, targetData.lat, targetData.lng) : 4.8;
  const eta = calculateETA(dist);

  if (bottomSheetState === 'hidden') return null;

  return (
    <div className={`absolute left-0 right-0 z-20 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
      isExpanded ? 'bottom-0 h-[85dvh]' : 'bottom-0 pb-safe'
    }`}>
      
      {/* Drag Handle */}
      <div 
        className="w-full flex justify-center pt-3 pb-3 cursor-pointer"
        onClick={() => setBottomSheetState(isExpanded ? 'collapsed' : 'expanded')}
      >
        <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
      </div>

      {/* GLANCEABLE LEVEL 1 (Always visible at top of sheet) */}
      <div className="px-5 pb-6">
        
        {!isTravelling ? (
          // Harbour / Planning Glance
          <div className="flex justify-between items-center" onClick={() => !isExpanded && setBottomSheetState('expanded')}>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${timeOffset > 1 ? 'bg-caution animate-pulse' : 'bg-safe'}`}></div>
                <h2 className={`text-[10px] font-bold tracking-widest uppercase ${timeOffset > 1 ? 'text-caution' : 'text-safe'}`}>
                  {timeOffset > 1 ? 'CONDITIONS WORSENING' : 'CONDITIONS FAVOURABLE'}
                </h2>
              </div>
              <p className="font-bold text-marine-900">
                {targetData ? `${dist} km away · ${targetData.potential} potential` : `Waves ${weather.waveHeight}m · Wind ${weather.windSpeed} km/h`}
              </p>
            </div>
            
            {!isExpanded && (
              <div className="bg-slate-50 p-2 rounded-full text-marine-400">
                <ArrowUp size={16} />
              </div>
            )}
            
            {isExpanded && targetData && (
              <button 
                onClick={() => {
                  setTripState('travelling');
                  setBottomSheetState('collapsed');
                }}
                className="bg-marine-900 text-white font-bold text-sm px-4 py-2 rounded-full shadow-md"
              >
                Start
              </button>
            )}
          </div>
        ) : (
          // Travelling Glance
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-[10px] font-bold tracking-widest text-marine-400 uppercase mb-1">Navigating to Area</h2>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black tracking-tighter text-marine-900">{eta}<span className="text-sm">min</span></span>
                <span className="text-sm font-bold text-slate-400">· {dist} km</span>
              </div>
            </div>
            <button 
              onClick={() => {
                setTripState('harbour');
                setBottomSheetState('collapsed');
              }}
              className="bg-danger/10 text-danger font-bold text-xs px-4 py-2 rounded-full"
            >
              End Trip
            </button>
          </div>
        )}

      </div>

      {/* EXPANDED LEVEL 2 & 3 (Scrollable Content) */}
      {isExpanded && (
        <div className="px-5 h-[calc(85dvh-100px)] overflow-y-auto no-scrollbar pb-10 border-t border-slate-100 pt-5">
          
          {/* Detailed Marine Conditions */}
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Detailed Conditions</h3>
          
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Wind</span>
              <span className="font-bold text-marine-900 text-lg">{weather.windSpeed}<span className="text-xs">km/h</span></span>
              <span className="text-[10px] font-bold text-danger block mt-1">→ 24 km/h</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Waves</span>
              <span className="font-bold text-marine-900 text-lg">{weather.waveHeight}<span className="text-xs">m</span></span>
              <span className="text-[10px] font-bold text-danger block mt-1">→ 1.6m</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Rain</span>
              <span className="font-bold text-marine-900 text-lg">{weather.rainProb}<span className="text-xs">%</span></span>
              <span className="text-[10px] font-bold text-danger block mt-1">→ 70%</span>
            </div>
          </div>

          <div className="bg-caution/10 border border-caution/20 rounded-2xl p-4 mb-6">
            <h4 className="text-xs font-bold text-caution uppercase tracking-widest mb-1 flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-caution mr-2"></span>
              Conditions worsening
            </h4>
            <p className="text-sm font-medium text-marine-900">
              Heavy rain and rough seas expected to arrive in approximately 2 hours based on current trajectory.
            </p>
          </div>

          {/* Level 3 Transition Button */}
          {!isReasoning && (
            <button 
              onClick={() => setBottomSheetState('reasoning')}
              className="w-full bg-white border-2 border-marine-100 text-marine-900 font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 active:scale-[0.98] transition-transform"
            >
              <span>Why this recommendation?</span>
            </button>
          )}

          {/* REASONING LEVEL 3 */}
          {isReasoning && (
            <div className="mt-8 animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">ORCA Agent Analysis</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-start space-x-3 bg-marine-50 p-3 rounded-xl">
                  <CloudLightning size={16} className="text-marine-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-bold text-marine-900 text-sm">Weather Agent</h4>
                    <p className="text-xs text-slate-600 mt-0.5">Identified incoming squall cell moving NE at 22 km/h.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 bg-marine-50 p-3 rounded-xl">
                  <Navigation2 size={16} className="text-marine-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-bold text-marine-900 text-sm">Ocean & Route Agent</h4>
                    <p className="text-xs text-slate-600 mt-0.5">Current trip return time is {eta} min. Margin of safety requires departure before weather impacts harbour approach.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 bg-marine-50 p-3 rounded-xl">
                  <ShieldAlert size={16} className="text-marine-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-bold text-marine-900 text-sm">Geospatial Agent</h4>
                    <p className="text-xs text-slate-600 mt-0.5">Verified alternative routes; direct line intersects restricted naval boundary, adding 4 mins to return trip.</p>
                  </div>
                </div>
              </div>

              <div className="bg-marine-900 text-white p-5 rounded-2xl">
                <h4 className="text-[10px] font-bold text-marine-400 uppercase tracking-widest mb-2">ORCA Conclusion</h4>
                <p className="text-sm font-medium leading-relaxed">
                  {advisorySummary
                    ? `“${advisorySummary}”`
                    : '"Conditions are favourable now, but wind and waves are expected to increase sharply. Recommended: Begin return before 4:30 PM."'}
                </p>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
