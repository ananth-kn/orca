import React from 'react';
import Map, { Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useAppStore } from '../store/useAppStore';
import { Navigation2, Anchor, ChevronRight } from 'lucide-react';

export const HomeMapPreview: React.FC = () => {
  const { location, pfzs, harbors, setActiveTab, setSelectedPfz } = useAppStore();

  const handleOpenMap = (pfzId?: string) => {
    if (pfzId) {
      setSelectedPfz(pfzId);
    }
    setActiveTab('map');
  };

  return (
    <section className="py-1 select-none space-y-2">
      
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Near You
        </h2>
        <button
          onClick={() => handleOpenMap()}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-0.5 active:scale-95 transition"
        >
          <span>OPEN MAP</span>
          <ChevronRight size={13} />
        </button>
      </div>

      {/* REAL MAP VIEWPORT */}
      <div
        onClick={() => handleOpenMap()}
        className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-200 cursor-pointer group shadow-2xs"
      >
        <Map
          initialViewState={{
            longitude: location.lng,
            latitude: location.lat,
            zoom: 10.8,
          }}
          mapStyle="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
          style={{ width: '100%', height: '100%' }}
          interactive={false}
        >
          {/* BOAT PIN */}
          <Marker longitude={location.lng} latitude={location.lat} anchor="center">
            <div className="w-6 h-6 rounded-full bg-blue-600 border-2 border-white shadow flex items-center justify-center text-white">
              <Navigation2 size={12} className="fill-current -rotate-45" />
            </div>
          </Marker>

          {/* PFZ PINS */}
          {pfzs.map((pfz) => (
            <Marker
              key={pfz.id}
              longitude={pfz.lng}
              latitude={pfz.lat}
              anchor="bottom"
            >
              <div className={`px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow-xs ${
                pfz.potential === 'High' ? 'bg-emerald-700' : 'bg-amber-600'
              }`}>
                {pfz.name.split('—')[0].trim()}
              </div>
            </Marker>
          ))}

          {/* HARBOR PIN */}
          {harbors.slice(0, 1).map((harbor) => (
            <Marker
              key={harbor.id}
              longitude={harbor.lon}
              latitude={harbor.lat}
              anchor="bottom"
            >
              <div className="bg-slate-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center space-x-1">
                <Anchor size={9} className="text-sky-300" />
                <span>{harbor.name}</span>
              </div>
            </Marker>
          ))}

          {/* RESTRICTED ZONE */}
          <Marker longitude={74.72} latitude={12.8} anchor="center">
            <div className="w-20 h-20 bg-red-500/15 border border-red-500 border-dashed rounded-full flex items-center justify-center pointer-events-none">
              <span className="text-[8px] font-bold text-red-700 bg-white/90 px-1 py-0.5 rounded">
                Restricted
              </span>
            </div>
          </Marker>
        </Map>

        {/* OVERLAY ACTION BAR */}
        <div className="absolute inset-0 flex items-end justify-center p-2 bg-gradient-to-t from-slate-900/30 to-transparent group-hover:from-slate-900/40 transition">
          <div className="bg-white/95 text-slate-900 font-bold text-xs px-3 py-1 rounded-md shadow-xs border border-slate-200 flex items-center space-x-1">
            <span>Tap to open live marine map</span>
            <ChevronRight size={13} />
          </div>
        </div>
      </div>

    </section>
  );
};
