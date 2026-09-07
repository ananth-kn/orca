import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  ChevronLeft, ChevronDown, ChevronUp,
  Waves, Wind, CloudRain, Eye, Compass, Timer,
  CloudLightning, Zap, Gauge, Thermometer, Layers, Play,
  ShieldAlert, MapPin, Droplets, Cloud,
} from 'lucide-react';
import Map from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

export const WeatherScreen: React.FC = () => {
  const {
    setActiveTab,
    weather,
    forecast2to3Hr,
    forecastTrend,
    activeAlert,
    lastRefreshedLabel,
    location,
  } = useAppStore();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [mapLayer, setMapLayer] = useState<'rain' | 'wind' | 'waves' | 'cloud'>('rain');

  const layerOptions = [
    { id: 'rain' as const, label: 'Rain', icon: Droplets },
    { id: 'wind' as const, label: 'Wind', icon: Wind },
    { id: 'waves' as const, label: 'Waves', icon: Waves },
    { id: 'cloud' as const, label: 'Cloud', icon: Cloud },
  ];

  return (
    <div className="min-h-full pb-6 select-none bg-[#0f1535] text-white">

      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-4 sticky top-0 z-20 bg-[#0f1535]/95 backdrop-blur-sm border-b border-white/[0.06]">
        <div className="flex items-center">
          <button
            onClick={() => setActiveTab('home')}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-white/10 active:scale-95 transition-all"
          >
            <ChevronLeft size={24} />
          </button>
          <span className="ml-1.5 font-bold text-[16px] tracking-wide">Marine Weather</span>
        </div>
        <span className="text-[11px] text-white/40 font-medium">{lastRefreshedLabel}</span>
      </div>

      <div className="px-4 max-w-lg mx-auto">

        {/* ── CURRENT CONDITIONS ─────────────────────── */}
        <div className="pt-5 pb-5">
          {/* Primary metrics — large and clear */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <div className="flex items-center gap-1.5 text-white/40 mb-1.5">
                <Waves size={13} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Waves</span>
              </div>
              <div className="text-[28px] font-extrabold text-white leading-none tracking-tight">{weather.waveHeight} <span className="text-[15px] font-semibold text-white/40">m</span></div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-white/40 mb-1.5">
                <Wind size={13} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Wind</span>
              </div>
              <div className="text-[28px] font-extrabold text-white leading-none tracking-tight">{weather.windSpeed} <span className="text-[15px] font-semibold text-white/40">km/h</span></div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-white/40 mb-1.5">
                <CloudRain size={13} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Rain</span>
              </div>
              <div className="text-[28px] font-extrabold text-white leading-none tracking-tight">{weather.rainProb}<span className="text-[15px] font-semibold text-white/40">%</span></div>
            </div>
          </div>

          {/* Secondary row */}
          <div className="flex items-center gap-5 text-[12px] text-white/40 font-medium">
            <span className="flex items-center gap-1"><Eye size={12} /> Visibility {weather.visibilityKm} km</span>
            <span className="flex items-center gap-1"><Thermometer size={12} /> {weather.temp}°C</span>
            <span>SST {weather.sstCelsius}°C</span>
          </div>
        </div>

        {/* ── ALERT (if active) ─────────────────────── */}
        {activeAlert && activeAlert.active && (
          <div className={`border-l-[3px] ${activeAlert.type === 'HIGH RISK' ? 'border-l-red-500 bg-red-500/8' : 'border-l-amber-500 bg-amber-500/8'} rounded-r-xl px-4 py-3 mb-5`}>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert size={14} className={activeAlert.type === 'HIGH RISK' ? 'text-red-400' : 'text-amber-400'} />
              <span className={`text-[11px] font-bold uppercase tracking-wider ${activeAlert.type === 'HIGH RISK' ? 'text-red-400' : 'text-amber-400'}`}>
                {activeAlert.type}
              </span>
              <span className="text-[12px] font-bold text-white/80">· {activeAlert.title}</span>
            </div>
            <p className="text-[12px] text-white/50">{activeAlert.subtitle}</p>
            {activeAlert.recommendation && (
              <p className="text-[11px] text-white/35 mt-1">{activeAlert.recommendation}</p>
            )}
          </div>
        )}

        {/* ── 3-HOUR FORECAST ──────────────────────── */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 mb-5">
          <div className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-3">Next 3 hours</div>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {forecast2to3Hr.map((hr) => (
              <div key={hr.hourLabel} className="text-center">
                <div className="text-[10px] font-bold text-white/45 mb-1.5 uppercase">{hr.hourLabel}</div>
                <div className="text-[16px] font-extrabold text-white leading-none">{hr.waveHeight} m</div>
                <div className="text-[11px] text-white/50 mt-1 font-semibold">{hr.windSpeed} km/h</div>
                <div className="text-[10px] text-white/40 mt-0.5">{hr.rainProb}%</div>
                <div className={`w-1.5 h-1.5 rounded-full mx-auto mt-2 ${
                  hr.status === 'FAVOURABLE' ? 'bg-emerald-400' :
                  hr.status === 'CAUTION' ? 'bg-amber-400' : 'bg-red-400'
                }`}></div>
              </div>
            ))}
          </div>
          {forecastTrend && (
            <p className="text-[11px] text-white/40 border-t border-white/[0.05] pt-3 font-medium">{forecastTrend}</p>
          )}
        </div>

        {/* ── HOURLY DETAIL ────────────────────────── */}
        <div className="mb-5">
          <div className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-3">Hourly forecast</div>
          <div className="space-y-0">
            {forecast2to3Hr.map((hr) => (
              <div key={hr.hourLabel} className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
                <div className="w-16 text-[12px] font-semibold text-white/50">{hr.time}</div>
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  hr.status === 'FAVOURABLE' ? 'bg-emerald-400' :
                  hr.status === 'CAUTION' ? 'bg-amber-400' : 'bg-red-400'
                }`}></div>
                <div className="flex-1 flex items-center gap-4 text-[13px]">
                  <span className="text-white font-semibold">{hr.waveHeight} m</span>
                  <span className="text-white/60">{hr.windSpeed} km/h</span>
                  <span className="text-white/40">{hr.rainProb}% rain</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── WEATHER RADAR MAP WITH LAYER TOGGLES ── */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Weather radar</div>
            <button
              onClick={() => setActiveTab('map')}
              className="text-[11px] text-blue-400 font-semibold flex items-center gap-1"
            >
              <MapPin size={11} />
              Full Map
            </button>
          </div>

          {/* Layer toggle pills */}
          <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
            {layerOptions.map((opt) => {
              const Icon = opt.icon;
              const isActive = mapLayer === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setMapLayer(opt.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors shrink-0 border ${
                    isActive
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-white/[0.05] border-white/[0.08] text-white/50'
                  }`}
                >
                  <Icon size={12} />
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full h-[35vh] rounded-2xl overflow-hidden border border-white/[0.08]">
            <Map
              initialViewState={{ longitude: location.lng, latitude: location.lat, zoom: 6 }}
              mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
              style={{ width: '100%', height: '100%' }}
            />

            {/* Active layer label */}
            <div className="absolute top-3 left-3 bg-[#0f1535]/80 backdrop-blur-sm rounded-full px-3 py-1.5 text-[10px] font-bold text-white/70 border border-white/[0.08]">
              Showing: {layerOptions.find(l => l.id === mapLayer)?.label} Layer
            </div>

            {/* Timeline slider */}
            <div className="absolute bottom-3 left-3 right-14 bg-[#0f1535]/85 backdrop-blur-sm rounded-full shadow-lg px-3 py-2 flex items-center gap-2 border border-white/[0.08]">
              <button className="bg-white/10 rounded-full p-1.5 text-white/60">
                <Play size={12} fill="currentColor" />
              </button>
              <div className="text-[10px] text-white/45 font-medium">3:45 PM</div>
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-white/25 w-1/3 rounded-full"></div>
              </div>
              <div className="text-[10px] text-white/45 font-medium">5:15 PM</div>
            </div>

            <button className="absolute bottom-3 right-3 bg-[#0f1535]/85 backdrop-blur-sm rounded-full p-2 border border-white/[0.08] text-white/50">
              <Layers size={16} />
            </button>
          </div>
        </div>

        {/* ── DETAILED MARINE CONDITIONS (collapsible) ── */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between py-3 mb-2 active:opacity-70 transition-opacity"
        >
          <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Detailed conditions</span>
          {showAdvanced ? <ChevronUp size={16} className="text-white/30" /> : <ChevronDown size={16} className="text-white/30" />}
        </button>

        {showAdvanced && (
          <div className="space-y-5 pb-6">

            {/* Wind & Waves */}
            <div>
              <div className="text-[10px] font-bold text-white/25 uppercase tracking-wider mb-2">Wind & Waves</div>
              <MetricRow icon={<Wind size={14} />} label="Wind Speed" value={`${weather.windSpeed} km/h`} />
              <MetricRow icon={<Compass size={14} />} label="Wind Direction" value="SW 210°" />
              <MetricRow icon={<Waves size={14} />} label="Wave Height" value={`${weather.waveHeight} m`} />
              <MetricRow icon={<Compass size={14} />} label="Wave Direction" value="S 190°" />
              <MetricRow icon={<Timer size={14} />} label="Swell Period" value="12 s" />
            </div>

            {/* Hazards */}
            <div>
              <div className="text-[10px] font-bold text-white/25 uppercase tracking-wider mb-2">Hazards & Visibility</div>
              <MetricRow icon={<CloudRain size={14} />} label="Rain" value={`${weather.rainProb}%`} sub="~2 mm/hr" />
              <MetricRow icon={<CloudLightning size={14} />} label="Thunderstorm" value="5%" />
              <MetricRow icon={<Zap size={14} />} label="Lightning Risk" value="Low" valueColor="text-emerald-400" />
              <MetricRow icon={<Eye size={14} />} label="Visibility" value={`${weather.visibilityKm} km`} />
            </div>

            {/* Atmospheric */}
            <div>
              <div className="text-[10px] font-bold text-white/25 uppercase tracking-wider mb-2">Atmospheric & Ocean</div>
              <MetricRow icon={<Gauge size={14} />} label="Air Pressure" value="1012 hPa" sub="Falling" />
              <MetricRow icon={<Thermometer size={14} />} label="Sea Temp" value={`${weather.sstCelsius}°C`} />
              <MetricRow icon={<Thermometer size={14} />} label="Air Temp" value={`${weather.temp}°C`} />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

/* ── MetricRow ─────────────────────────────────────── */

interface MetricRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}

const MetricRow: React.FC<MetricRowProps> = ({ icon, label, value, sub, valueColor = 'text-white' }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
    <div className="flex items-center gap-2.5 text-white/40">
      {icon}
      <span className="text-[13px] font-medium">{label}</span>
    </div>
    <div className="text-right">
      <span className={`text-[14px] font-semibold ${valueColor}`}>{value}</span>
      {sub && <span className="text-[11px] text-white/30 ml-1.5">{sub}</span>}
    </div>
  </div>
);
