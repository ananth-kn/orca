import React, { useEffect } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useAppStore } from '../store/useAppStore';
import { Target } from 'lucide-react';
import { AdaptiveBottomSheet } from '../components/AdaptiveBottomSheet';
import { MapControls } from '../components/MapControls';
import { TopCommandBar } from '../components/TopCommandBar';
import { OrcaChat } from '../components/OrcaChat';

export const MainScreen: React.FC = () => {
  const { 
    location, 
    selectedPfz, 
    setSelectedPfz, 
    activeLayers,
    timeOffset,
    tripState,
    isFollowMode,
    isPlannerIntelligenceActive,
    setBottomSheetState,
    pfzs,
    harbors,
    refreshMarine,
    isOffline,
  } = useAppStore();

  useEffect(() => {
    void refreshMarine();
  }, [location?.lat, location?.lng, isOffline, refreshMarine]);

  const initialViewState = {
    longitude: location?.lng || 74.8425,
    latitude: location?.lat || 12.8722,
    zoom: 11,
    pitch: isFollowMode ? 45 : 0,
    bearing: isFollowMode ? 45 : 0 // Fake heading
  };

  const isTravelling = tripState === 'travelling' || tripState === 'returning';

  return (
    <div className="relative w-full h-dvh bg-marine-50 overflow-hidden">
      
      {/* 1. The Canvas: Live Marine Map */}
      <Map
        initialViewState={initialViewState}
        mapStyle="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
        style={{ width: '100%', height: '100%' }}
        interactiveLayerIds={['pfz-points']}
        onMoveStart={() => {
          // If user pans, they might want to collapse the sheet to glance mode
          setBottomSheetState('collapsed');
        }}
      >
        <NavigationControl position="bottom-right" showCompass={false} style={{ marginBottom: '160px' }} />

        {/* User Boat */}
        {location && (
          <Marker longitude={location.lng} latitude={location.lat} anchor="center">
            <div className="relative flex items-center justify-center pointer-events-none">
              {/* Contextual Risk Ring */}
              <div className={`absolute w-40 h-40 rounded-full opacity-20 transition-colors duration-1000 ${
                isPlannerIntelligenceActive ? "bg-marine-600 animate-pulse" : 
                (timeOffset > 1 ? "bg-caution" : "bg-safe")
              }`}></div>
              
              <div className="absolute w-8 h-8 bg-marine-500/30 rounded-full animate-ping"></div>
              
              {isTravelling ? (
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-20 border-b-marine-900 rotate-45 z-10 drop-shadow-lg"></div>
              ) : (
                <div className="w-5 h-5 bg-marine-900 border-[3px] border-white rounded-full shadow-lg z-10"></div>
              )}
            </div>
          </Marker>
        )}

        {/* Harbours */}
        {activeLayers.harbours && harbors.map((harbor) => (
          <Marker
            key={`harbor-${harbor.id}`}
            longitude={harbor.lon}
            latitude={harbor.lat}
            anchor="bottom"
          >
            <div className="flex flex-col items-center">
              <div className="bg-marine-900 text-white text-[9px] font-bold px-2 py-1 rounded-full shadow border border-white">
                {harbor.name}
              </div>
            </div>
          </Marker>
        ))}

        {/* PFZs */}
        {activeLayers.pfz && pfzs.map((pfz) => (
          <Marker 
            key={pfz.id} 
            longitude={pfz.lng} 
            latitude={pfz.lat} 
            anchor="bottom"
            onClick={(e: any) => {
              e.originalEvent.stopPropagation();
              setSelectedPfz(pfz.id);
              setBottomSheetState('expanded');
            }}
          >
            <div className={`flex flex-col items-center justify-center cursor-pointer transition-transform duration-300 ${
              selectedPfz === pfz.id ? "scale-110 z-10" : "scale-90 hover:scale-100"
            }`}>
              <div className={`text-white p-2.5 rounded-full shadow-xl border-2 border-white ${
                pfz.potential === 'High' ? 'bg-safe' : 'bg-caution'
              }`}>
                <span className="text-sm">🎣</span>
              </div>
              
              {/* Only show label if Planner Mode is on or it's selected */}
              {(isPlannerIntelligenceActive || selectedPfz === pfz.id) && (
                <div className="mt-1 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded shadow-sm text-[10px] font-bold text-marine-900 border border-slate-200">
                  {pfz.potential}
                </div>
              )}
            </div>
          </Marker>
        ))}

        {/* Restricted Boundaries */}
        {activeLayers.restricted && (
           <Marker longitude={74.72} latitude={12.80} anchor="center">
             <div className={`w-48 h-48 bg-danger/10 border-2 border-danger/40 border-dashed rounded-full flex items-center justify-center transition-all ${
               isPlannerIntelligenceActive ? 'bg-danger/20 border-danger/80 animate-pulse' : ''
             }`}>
               <span className="text-danger font-bold text-[10px] bg-white/95 backdrop-blur px-2.5 py-1 rounded-full shadow-sm uppercase tracking-widest flex items-center space-x-1">
                 <Target size={12} className="mr-1" /> Naval Zone
               </span>
             </div>
           </Marker>
        )}

        {/* Weather approaching (mock cell) */}
        {activeLayers.rain && timeOffset > 0 && (
           <Marker longitude={74.65} latitude={12.95} anchor="center">
             <div className="w-64 h-32 bg-marine-800/20 blur-xl rounded-full translate-x-10 translate-y-10"></div>
             <div className="absolute inset-0 flex items-center justify-center">
               <span className="text-marine-900 font-bold text-xs bg-white/50 backdrop-blur px-2 py-1 rounded-full">Rain Cell</span>
             </div>
           </Marker>
        )}
      </Map>

      {/* 2. Top UI: Universal Command Bar */}
      <TopCommandBar />

      {/* 3. Floating Map Controls */}
      <MapControls />

      {/* 4. Progressive Bottom Sheet */}
      <AdaptiveBottomSheet />

      <OrcaChat />

    </div>
  );
};
