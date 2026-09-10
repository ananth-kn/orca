import React from 'react';
import {
  Waves,
  Wind,
  Droplets,
  CloudRain,
  Gauge,
  Thermometer,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Anchor,
} from 'lucide-react';

/**
 * Renders structured data the backend sends alongside the AI text summary.
 *
 * The backend `data` payload looks like:
 * {
 *   type: "data",
 *   latitude, longitude,
 *   detected_language,
 *   data: {
 *     sst:           { sst_celsius, data_time, ... },
 *     chlorophyll:   { chlorophyll_mg_m3, category, data_time, ... },
 *     waves:         { wave_height_m, wave_direction_deg, swell_period_s, safety_index, ... },
 *     weather_forecast: { temperature_c, wind_speed_kmh, condition, ... }
 *   },
 *   pfz_advisory:    { is_potential_zone, chlorophyll_rating, chlorophyll_value, wave_height_m, confidence },
 *   safety_advisory: { verdict, reason, wave_height_m },
 * }
 */

interface AiDataCardProps {
  data: Record<string, unknown>;
}

// ─── Small metric tile ──────────────────────────────────────────────────
function Metric({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 py-2 border-b border-white/[0.04] last:border-0">
      <span className="text-white/40 shrink-0">{icon}</span>
      <span className="flex-1 text-[13px] text-white/70 font-medium">{label}</span>
      <span className="text-right">
        <span className="text-[14px] font-semibold text-white">{value}</span>
        {sub && <span className="block text-[10px] text-white/35">{sub}</span>}
      </span>
    </div>
  );
}

// ─── Safety verdict chip ─────────────────────────────────────────────────
function verdictBadge(verdict?: string): { label: string; cls: string; Icon: typeof CheckCircle2 } {
  switch (verdict) {
    case 'safe':
      return { label: 'Safe', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/25', Icon: CheckCircle2 };
    case 'caution':
      return { label: 'Caution', cls: 'bg-amber-500/15 text-amber-300 border-amber-400/25', Icon: AlertTriangle };
    case 'risky':
    case 'dangerous':
      return { label: 'Unsafe', cls: 'bg-red-500/15 text-red-300 border-red-400/25', Icon: XCircle };
    default:
      return { label: 'Unknown', cls: 'bg-white/[0.06] text-white/50 border-white/[0.1]', Icon: HelpCircle };
  }
}

// ─── Section card wrapper ────────────────────────────────────────────────
function Card({ title, Icon, children }: { title: string; Icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 mb-2">
      {(title || Icon) && (
        <div className="flex items-center gap-2 mb-1.5">
          {Icon}
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/45">{title}</span>
        </div>
      )}
      {children}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────
export const AiDataCard: React.FC<AiDataCardProps> = ({ data }) => {
  if (!data || typeof data !== 'object') return null;

  const payload = data as Record<string, unknown>;
  const toolData = (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data))
    ? (payload.data as Record<string, Record<string, unknown>>)
    : {};

  const sst = toolData.sst ?? {};
  const chlorophyll = toolData.chlorophyll ?? {};
  const waves = toolData.waves ?? {};
  const weatherForecast = toolData.weather_forecast ?? toolData.weather ?? {};

  const safety = (payload.safety_advisory && typeof payload.safety_advisory === 'object')
    ? (payload.safety_advisory as Record<string, unknown>)
    : null;

  const pfz = (payload.pfz_advisory && typeof payload.pfz_advisory === 'object')
    ? (payload.pfz_advisory as Record<string, unknown>)
    : null;

  const hasAny =
    Object.keys(sst).length || Object.keys(chlorophyll).length ||
    Object.keys(waves).length || Object.keys(weatherForecast).length ||
    safety || pfz;

  if (!hasAny) return null;

  return (
    <div className="mt-3 space-y-2">
      {/* Safety advisory */}
      {safety && (
        <Card
          title="Sea Safety"
          Icon={<ShieldAlert size={13} className="text-white/45" />}
        >
          {(() => {
            const v = verdictBadge(String(safety.verdict ?? ''));
            const BadgeIcon = v.Icon;
            return (
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${v.cls}`}>
                  <BadgeIcon size={13} />
                  {v.label}
                </span>
                {safety.wave_height_m != null && (
                  <span className="text-[12px] text-white/50">Wave {Number(safety.wave_height_m)}m</span>
                )}
              </div>
            );
          })()}
          {safety.reason != null && (
            <p className="text-[12px] text-white/65 leading-relaxed">{String(safety.reason)}</p>
          )}
        </Card>
      )}

      {/* PFZ advisory */}
      {pfz && (
        <Card
          title="Fishing Zone"
          Icon={<Anchor size={13} className="text-white/45" />}
        >
          {pfz.is_potential_zone != null && (
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${
                pfz.is_potential_zone
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/25'
                  : 'bg-white/[0.06] text-white/50 border-white/[0.1]'
              }`}>
                {pfz.is_potential_zone ? 'Potential zone' : 'Low potential'}
              </span>
              {pfz.chlorophyll_rating != null && (
                <span className="text-[11px] text-white/45 uppercase tracking-wide">
                  Chl: {String(pfz.chlorophyll_rating)}
                </span>
              )}
            </div>
          )}
          {pfz.chlorophyll_value != null && (
            <Metric
              icon={<Droplets size={14} />}
              label="Chlorophyll"
              value={`${Number(pfz.chlorophyll_value)} mg/m³`}
            />
          )}
        </Card>
      )}

      {/* Weather forecast */}
      {Object.keys(weatherForecast).length > 0 && (
        <Card
          title="Weather"
          Icon={<CloudRain size={13} className="text-white/45" />}
        >
          <Metric
            icon={<Thermometer size={14} />}
            label="Temperature"
            value={`${weatherForecast.temperature_c ?? weatherForecast.temp ?? '—'}°C`}
          />
          <Metric
            icon={<Wind size={14} />}
            label="Wind"
            value={`${weatherForecast.wind_speed_kmh ?? weatherForecast.wind_speed ?? '—'} km/h`}
          />
          {weatherForecast.condition != null && (
            <Metric
              icon={<CloudRain size={14} />}
              label="Condition"
              value={String(weatherForecast.condition)}
            />
          )}
        </Card>
      )}

      {/* Waves */}
      {Object.keys(waves).length > 0 && (
        <Card
          title="Waves"
          Icon={<Waves size={13} className="text-white/45" />}
        >
          <Metric
            icon={<Waves size={14} />}
            label="Wave height"
            value={`${waves.wave_height_m ?? waves.wave_height_meters ?? '—'} m`}
          />
          {waves.wave_direction_deg != null && (
            <Metric
              icon={<Gauge size={14} />}
              label="Direction"
              value={`${Number(waves.wave_direction_deg)}°`}
            />
          )}
          {waves.swell_period_s != null && (
            <Metric
              icon={<Gauge size={14} />}
              label="Swell period"
              value={`${Number(waves.swell_period_s)} s`}
            />
          )}
          {waves.safety_index != null && (
            <Metric
              icon={<ShieldAlert size={14} />}
              label="Safety"
              value={String(waves.safety_index)}
            />
          )}
        </Card>
      )}

      {/* SST */}
      {Object.keys(sst).length > 0 && (
        <Card
          title="Sea Surface Temp"
          Icon={<Thermometer size={13} className="text-white/45" />}
        >
          <Metric
            icon={<Thermometer size={14} />}
            label="SST"
            value={`${sst.sst_celsius ?? sst.sst ?? '—'}°C`}
          />
        </Card>
      )}

      {/* Chlorophyll */}
      {!pfz && Object.keys(chlorophyll).length > 0 && (
        <Card
          title="Chlorophyll"
          Icon={<Droplets size={13} className="text-white/45" />}
        >
          <Metric
            icon={<Droplets size={14} />}
            label="Concentration"
            value={`${chlorophyll.chlorophyll_mg_m3 ?? chlorophyll.chlorophyll ?? '—'} mg/m³`}
          />
        </Card>
      )}

      {/* Lat/lon footer */}
      {payload.latitude != null && payload.longitude != null && (
        <p className="text-[10px] text-white/30 px-1">
          {Number(payload.latitude).toFixed(3)}°N, {Number(payload.longitude).toFixed(3)}°E
        </p>
      )}
    </div>
  );
};

export default AiDataCard;
