import { useState, useMemo } from 'react';
import Map, { Marker, NavigationControl, Source, Layer } from 'react-map-gl/maplibre';
import type { LayerProps } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useAppStore } from '../store/useAppStore';
import {
  Anchor,
  Navigation,
  Map as MapIcon,
  X,
  Target,
  Clock,
  Fuel,
  Droplets,
  Wind,
  Waves,
  Info
} from 'lucide-react';

export default function MapScreen() {
  const { location, pfzs, harbors, selectedPfz, setSelectedPfz } = useAppStore();
  const [mapStyle, setMapStyle] = useState<'dark' | 'satellite'>('dark');
  const [viewState, setViewState] = useState({
    longitude: location?.lng ?? 78.0,
    latitude: location?.lat ?? 20.0,
    zoom: 5.5,
    pitch: 0,
    bearing: 0
  });

  const MAP_STYLES = {
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    satellite: 'https://api.maptiler.com/maps/satellite/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL'
  };

  const selectedData = selectedPfz ? pfzs.find(p => p.id === selectedPfz) : null;

  const restrictedZoneGeojson = useMemo(() => {
    if (!location) return null;
    const center = [location.lng + 0.1, location.lat + 0.1];
    const points = 64;
    const radiusInKm = 5;
    const coords = [];
    for (let i = 0; i <= points; i++) {
      const angle = (i * 360) / points;
      const angleRad = (angle * Math.PI) / 180;
      const dx = (radiusInKm / 111.32) * Math.cos(angleRad);
      const dy = (radiusInKm / 111.32) * Math.sin(angleRad);
      coords.push([center[0] + dx, center[1] + dy]);
    }

    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [coords]
        },
        properties: {}
      }]
    };
  }, [location?.lat, location?.lng]);

  const restrictedZoneLineLayer: LayerProps = {
    id: 'restricted-zone-line',
    type: 'line',
    source: 'restricted-zone',
    paint: {
      'line-color': '#ef4444',
      'line-width': 2,
      'line-dasharray': [2, 2]
    }
  };

  const restrictedZoneFillLayer: LayerProps = {
    id: 'restricted-zone-fill',
    type: 'fill',
    source: 'restricted-zone',
    paint: {
      'fill-color': '#ef4444',
      'fill-opacity': 0.1
    }
  };

  const getPotentialColor = (potential: string) => {
    switch (potential.toLowerCase()) {
      case 'high': return '#22c55e'; // green
      case 'moderate': return '#f59e0b'; // amber
      case 'low': return '#ef4444'; // red
      default: return '#3b82f6';
    }
  };

  const getPotentialBgColor = (potential: string) => {
    switch (potential.toLowerCase()) {
      case 'high': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'moderate': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'low': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  return (
    <div className="relative w-full h-screen bg-[#0f1535] text-white flex flex-col pb-20">
      {/* Map Container */}
      <div className="flex-1 relative">
        <Map
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          mapStyle={mapStyle === 'dark' ? MAP_STYLES.dark : MAP_STYLES.satellite}
          style={{ width: '100%', height: '100%' }}
        >
          <NavigationControl position="top-left" showCompass showZoom />

          {restrictedZoneGeojson && (
            <Source id="restricted-zone" type="geojson" data={restrictedZoneGeojson as any}>
              <Layer {...restrictedZoneFillLayer} />
              <Layer {...restrictedZoneLineLayer} />
            </Source>
          )}

          {/* User Location Marker (only if live GPS is available) */}
          {location && (
            <Marker longitude={location.lng} latitude={location.lat} anchor="center">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse">
                <div className="w-8 h-8 rounded-full bg-blue-500/40 flex items-center justify-center">
                  <Navigation className="text-blue-400 w-5 h-5" style={{ transform: `rotate(${location.headingDeg}deg)` }} />
                </div>
              </div>
            </Marker>
          )}

          {/* Harbor Markers */}
          {harbors.map((harbor) => (
            <Marker key={harbor.id} longitude={harbor.lon} latitude={harbor.lat} anchor="bottom">
              <div className="flex flex-col items-center cursor-pointer">
                <div className="w-6 h-6 bg-white/[0.05] rounded-full border border-white/[0.10] flex items-center justify-center backdrop-blur-sm shadow-lg">
                  <Anchor className="w-3 h-3 text-white/70" />
                </div>
                <div className="mt-1 px-2 py-0.5 bg-black/60 rounded text-[10px] text-white/80 whitespace-nowrap">
                  {harbor.name}
                </div>
              </div>
            </Marker>
          ))}

          {/* PFZ Markers */}
          {pfzs.map((pfz) => {
            const color = getPotentialColor(pfz.potential);
            const isSelected = selectedPfz === pfz.id;
            return (
              <Marker
                key={pfz.id}
                longitude={pfz.lng}
                latitude={pfz.lat}
                anchor="center"
                onClick={e => {
                  e.originalEvent.stopPropagation();
                  setSelectedPfz(pfz.id);
                }}
              >
                <div className="relative group cursor-pointer">
                  {/* Heatmap-style glow */}
                  <div
                    className="absolute inset-0 rounded-full blur-md opacity-40 group-hover:opacity-60 transition-opacity"
                    style={{ backgroundColor: color, transform: 'scale(1.5)' }}
                  />
                  {/* Marker core */}
                  <div
                    className={`relative w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'scale-125 z-10' : 'scale-100'}`}
                    style={{ backgroundColor: `${color}33`, borderColor: color }}
                  >
                    <Anchor className="w-4 h-4" style={{ color }} />
                  </div>
                </div>
              </Marker>
            );
          })}
        </Map>

        {/* Layer Toggle Button */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={() => setMapStyle(s => s === 'dark' ? 'satellite' : 'dark')}
            className="w-10 h-10 bg-[#141937] border border-white/[0.08] rounded-xl flex items-center justify-center text-white/80 hover:text-white hover:bg-white/[0.05] transition-colors shadow-lg"
          >
            <MapIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Selected PFZ Bottom Sheet */}
        {selectedData && (
          <div className="absolute bottom-4 left-4 right-4 z-20">
            <div className="bg-[#141937] border border-white/[0.08] rounded-2xl p-5 shadow-2xl backdrop-blur-xl">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    {selectedData.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getPotentialBgColor(selectedData.potential)}`}>
                      {selectedData.potential} Potential
                    </span>
                    <span className="text-white/60 text-sm flex items-center gap-1">
                      <Target className="w-3.5 h-3.5" />
                      {selectedData.targetSpecies}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPfz(null)}
                  className="p-2 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] rounded-full transition-colors text-white/60 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-[#0f1535] rounded-xl p-3 border border-white/[0.05]">
                  <div className="flex items-center gap-1.5 text-white/50 text-xs mb-1">
                    <Navigation className="w-3 h-3" /> Distance
                  </div>
                  <div className="font-semibold text-sm">{selectedData.distanceKm} km</div>
                </div>
                <div className="bg-[#0f1535] rounded-xl p-3 border border-white/[0.05]">
                  <div className="flex items-center gap-1.5 text-white/50 text-xs mb-1">
                    <Clock className="w-3 h-3" /> ETA
                  </div>
                  <div className="font-semibold text-sm">{selectedData.travelTimeMin} min</div>
                </div>
                <div className="bg-[#0f1535] rounded-xl p-3 border border-white/[0.05]">
                  <div className="flex items-center gap-1.5 text-white/50 text-xs mb-1">
                    <Fuel className="w-3 h-3" /> Fuel
                  </div>
                  <div className="font-semibold text-sm">{selectedData.fuelLiters} L</div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="bg-[#0f1535] rounded-xl p-2 flex flex-col items-center justify-center border border-white/[0.05]">
                  <Waves className="w-4 h-4 text-blue-400 mb-1" />
                  <span className="text-xs text-white/80">{selectedData.waveHeightM}m</span>
                </div>
                <div className="bg-[#0f1535] rounded-xl p-2 flex flex-col items-center justify-center border border-white/[0.05]">
                  <Wind className="w-4 h-4 text-teal-400 mb-1" />
                  <span className="text-xs text-white/80">{selectedData.windSpeedKmh}km/h</span>
                </div>
                <div className="bg-[#0f1535] rounded-xl p-2 flex flex-col items-center justify-center border border-white/[0.05]">
                  <Droplets className="w-4 h-4 text-cyan-400 mb-1" />
                  <span className="text-xs text-white/80">{selectedData.sstCelsius}°C</span>
                </div>
                <div className="bg-[#0f1535] rounded-xl p-2 flex flex-col items-center justify-center border border-white/[0.05] text-center">
                  <div className="text-[10px] text-green-400 font-bold mb-0.5">CHL</div>
                  <span className="text-xs text-white/80">{selectedData.chlorophyllMgM3}</span>
                </div>
              </div>

              {selectedData.recommendationReason && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-4 flex gap-3 items-start">
                  <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-200/90 leading-relaxed">
                    {selectedData.recommendationReason}
                  </p>
                </div>
              )}

              <button className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-colors active:scale-[0.98]">
                Start Navigation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
