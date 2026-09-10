import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Anchor, Radio, Waves, Wind, CloudRain, AlertTriangle, MapPin, Navigation } from 'lucide-react';
import { t } from '../utils/translations';
import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

export const HomeScreen: React.FC = () => {
  const {
    setActiveTab,
    navigateToMapWithPfz,
    weather,
    forecast2to3Hr,
    forecastTrend,
    activeAlert,
    lastRefreshedLabel,
    refreshMarine,
    pfzs,
    setSOSOpen,
    language,
    location,
  } = useAppStore();

  const [mapExpanded, setMapExpanded] = useState(false);

  const nearestPfz = pfzs.length > 0
    ? pfzs.reduce((a, b) => (a.distanceKm < b.distanceKm ? a : b))
    : null;

  const mapHeight = mapExpanded ? 'h-[45vh]' : 'h-[22vh]';

  return (
    <div className="min-h-full pb-24 px-4 pt-4 max-w-md mx-auto space-y-4 select-none bg-[#0f1535] text-white">

      {/* TOP BAR */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => refreshMarine()}
          className="font-black text-2xl tracking-widest text-white active:scale-95 transition-transform"
        >
          ORCA
        </button>
        <div className="bg-white/[0.06] px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/[0.08] text-[10px] font-bold tracking-wide">
          <div className="bg-emerald-400 rounded-full w-2 h-2 animate-pulse"></div>
          {lastRefreshedLabel}
        </div>
      </div>

      {/* NOTIFICATION PANEL — darker, expanded */}
      <div className="bg-[#0b1020] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">{t('home_notifications', language)}</span>
          <div className="flex items-center gap-1.5 text-[10px] text-white/40 font-medium">
            <Radio size={10} />
            {t('home_lora_active', language)}
          </div>
        </div>

        {/* LoRa message */}
        <div className="px-4 py-3 border-b border-white/[0.04] flex items-start gap-3 cursor-pointer active:bg-white/[0.03]" onClick={() => setActiveTab('chat')}>
          <Radio size={16} className="text-blue-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-bold text-white/80">Raju <span className="text-white/40 font-medium">· 2.1 km {t('common_away', language)}</span></div>
            <div className="text-[12px] text-white/50 truncate">{t('chat_notif_catch', language)}</div>
          </div>
          <span className="text-[10px] text-white/30 shrink-0">3m</span>
        </div>

        {/* Second LoRa message */}
        <div className="px-4 py-3 border-b border-white/[0.04] flex items-start gap-3 cursor-pointer active:bg-white/[0.03]" onClick={() => setActiveTab('chat')}>
          <Radio size={16} className="text-blue-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-bold text-white/80">Mohan <span className="text-white/40 font-medium">· 4.5 km {t('common_away', language)}</span></div>
            <div className="text-[12px] text-white/50 truncate">{t('chat_notif_waves', language)}</div>
          </div>
          <span className="text-[10px] text-white/30 shrink-0">12m</span>
        </div>

        {/* Alert notification */}
        {activeAlert && activeAlert.active && (
          <div className="px-4 py-3 flex items-start gap-3">
            <AlertTriangle size={16} className={activeAlert.type === 'HIGH RISK' ? 'text-red-400 mt-0.5 shrink-0' : 'text-amber-400 mt-0.5 shrink-0'} />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-bold text-white/80">
                <span className={activeAlert.type === 'HIGH RISK' ? 'text-red-400' : 'text-amber-400'}>{activeAlert.type}</span>
                <span className="text-white/60"> · {activeAlert.title}</span>
              </div>
              <div className="text-[12px] text-white/50">{activeAlert.subtitle}</div>
              {activeAlert.recommendation && (
                <div className="text-[11px] text-white/35 mt-0.5">{activeAlert.recommendation}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* TRIGGER SOS BUTTON */}
      <button
        onClick={() => setSOSOpen(true)}
        className="w-full bg-red-600 hover:bg-red-700 active:scale-95 transition-all text-white font-extrabold text-2xl py-5 rounded-2xl shadow-lg border border-red-500/30"
      >
        {t('home_sos', language)}
      </button>

      {/* UNIFIED WEATHER CARD */}
      <div
        onClick={() => setActiveTab('weather')}
        className="bg-[#1565C0] rounded-2xl shadow-lg border border-blue-400/15 cursor-pointer active:scale-[0.98] transition-transform overflow-hidden"
      >
        {weather ? (
          <>
            <div className="p-4 flex items-center justify-between">
              <div>
                <div className="font-extrabold text-xl leading-none tracking-tight">{t('marine_weather', language)}</div>
                <div className="flex items-center gap-3 mt-2 text-[13px] font-bold text-white/85">
                  <span className="flex items-center gap-1"><Waves size={12} /> {weather.waveHeight} m</span>
                  <span className="flex items-center gap-1"><Wind size={12} /> {weather.windSpeed} km/h</span>
                  <span className="flex items-center gap-1"><CloudRain size={12} /> {weather.rainProb}%</span>
                </div>
              </div>
              <div className={`px-3 py-1.5 rounded-xl border font-bold text-[12px] ${
                weather.status === 'FAVOURABLE' ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300' :
                weather.status === 'CAUTION' ? 'bg-amber-500/20 border-amber-400/30 text-amber-300' :
                'bg-red-500/20 border-red-400/30 text-red-300'
              }`}>
                {weather.status}
              </div>
            </div>

            <div className="bg-black/15 px-4 py-3 border-t border-white/10">
              {forecast2to3Hr.length > 0 ? (
                <>
                  <div className="grid grid-cols-4 gap-2">
                    {forecast2to3Hr.map((hr) => (
                      <div key={hr.hourLabel} className="text-center">
                        <div className="text-[9px] font-bold text-white/50 mb-1 uppercase">{hr.hourLabel}</div>
                        <div className="text-[14px] font-extrabold leading-none">{hr.waveHeight} m</div>
                        <div className="text-[10px] text-white/60 mt-0.5 font-semibold">{hr.windSpeed} km/h</div>
                        <div className={`w-1.5 h-1.5 rounded-full mx-auto mt-1.5 ${
                          hr.status === 'FAVOURABLE' ? 'bg-emerald-400' :
                          hr.status === 'CAUTION' ? 'bg-amber-400' : 'bg-red-400'
                        }`}></div>
                      </div>
                    ))}
                  </div>
                  {forecastTrend && (
                    <p className="text-[10px] text-white/40 mt-2 font-medium">{forecastTrend}</p>
                  )}
                </>
              ) : (
                <p className="text-[11px] text-white/40 py-2 text-center">Awaiting forecast...</p>
              )}
            </div>
          </>
        ) : (
          <div className="p-4 text-center">
            <div className="font-extrabold text-xl leading-none tracking-tight mb-1">{t('marine_weather', language)}</div>
            <p className="text-[12px] text-white/60">Awaiting live weather data...</p>
          </div>
        )}
      </div>

      {/* QUICK ACTIONS: FISHING SPOTS & FLEET CHAT */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => nearestPfz ? navigateToMapWithPfz(nearestPfz.id) : setActiveTab('map')}
          className="bg-[#1976D2] aspect-square rounded-2xl p-4 flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform shadow-lg border border-blue-400/15"
        >
          <Anchor size={44} className="text-white drop-shadow-md" strokeWidth={2.5} />
          <span className="font-bold text-[15px] tracking-tight">{t('fishing_spots', language)}</span>
          {nearestPfz && (
            <span className="text-[10px] font-bold bg-white/15 px-2 py-0.5 rounded-md">{nearestPfz.distanceKm} km · {nearestPfz.potential}</span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className="bg-[#D47735] aspect-square rounded-2xl p-4 flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg border border-orange-400/15"
        >
          <Radio size={44} className="text-white drop-shadow-md" />
          <span className="font-bold text-[15px] tracking-tight">{t('fleet_chat', language)}</span>
          <span className="text-[9px] font-bold bg-white/15 px-2 py-0.5 rounded-md tracking-wider uppercase">{t('home_lora_ready', language)}</span>
        </button>
      </div>

      {/* CURRENT LOCATION MAP — shows vessel GPS position; expandable */}
      <div className={`relative rounded-2xl overflow-hidden border border-white/[0.08] transition-all duration-300 ${mapHeight}`}>
        <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-[#141937]/90 border border-white/[0.08] text-[10px] font-bold text-white/70 backdrop-blur-sm flex items-center gap-1.5">
            <MapPin size={11} />
            {location ? 'Your Position' : 'Awaiting GPS'}
          </span>
        </div>
        {location && (
          <Map
            initialViewState={{ longitude: location.lng, latitude: location.lat, zoom: mapExpanded ? 8 : 6 }}
            mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
            style={{ width: '100%', height: '100%' }}
            interactive={true}
          >
            <NavigationControl position="top-right" showCompass={false} />
            <Marker longitude={location.lng} latitude={location.lat} anchor="center">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse">
                <div className="w-8 h-8 rounded-full bg-blue-500/40 flex items-center justify-center">
                  <Navigation className="text-blue-400 w-5 h-5" style={{ transform: `rotate(${location.headingDeg}deg)` }} />
                </div>
              </div>
            </Marker>
          </Map>
        )}
        {!location && (
          <div className="w-full h-full flex items-center justify-center bg-white/[0.03] text-[12px] text-white/40">
            <span className="flex items-center gap-2">
              <MapPin size={14} />
              GPS signal not available — waiting for vessel position
            </span>
          </div>
        )}
        {/* Expand / collapse toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); setMapExpanded((v) => !v); }}
          className="absolute bottom-2 right-2 z-10 px-3 py-1.5 rounded-lg bg-[#141937]/90 border border-white/[0.08] text-[10px] font-bold text-white/70 backdrop-blur-sm active:scale-95 transition-transform"
        >
          {mapExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

    </div>
  );
};