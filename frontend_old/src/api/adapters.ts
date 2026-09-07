import { calculateDistanceKm, calculateETA } from '../utils/geo';
import type { PFZData, WeatherData } from './mockData';
import type {
  Alert,
  ChatMessage,
  ChatResponse,
  Harbor,
  PFZResponse,
} from './client';

type Loc = { lat: number; lng: number };

export function scoreToPotential(score: number): PFZData['potential'] {
  if (score >= 85) return 'Very High';
  if (score >= 75) return 'High';
  if (score >= 50) return 'Moderate';
  return 'Low';
}

export function safetyToStatus(value?: string | null): WeatherData['status'] {
  const s = (value || '').toLowerCase();
  if (
    s.includes('danger') ||
    s.includes('rough') ||
    s.includes('no-go') ||
    s === 'red' ||
    s.includes('high risk')
  ) {
    return 'HIGH RISK';
  }
  if (
    s.includes('caution') ||
    s.includes('moderate') ||
    s === 'yellow' ||
    s === 'orange'
  ) {
    return 'CAUTION';
  }
  return 'FAVOURABLE';
}

export function mapHarbor(raw: Record<string, unknown>): Harbor {
  return {
    id: Number(raw.id),
    name: String(raw.name ?? ''),
    lat: Number(raw.lat ?? raw.latitude),
    lon: Number(raw.lon ?? raw.longitude),
    type: raw.type != null ? String(raw.type) : raw.district != null ? String(raw.district) : undefined,
    state: raw.state != null ? String(raw.state) : undefined,
  };
}

export function mapChatResponse(raw: Record<string, unknown>): ChatResponse {
  return {
    session_id: String(raw.session_id ?? ''),
    response: String(raw.response ?? raw.reply ?? ''),
    language: raw.language != null ? String(raw.language) : undefined,
  };
}

export function mapChatHistory(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = item as Record<string, unknown>;
    const role = row.role === 'assistant' ? 'assistant' : 'user';
    return {
      role,
      content: String(row.content ?? row.message ?? ''),
    };
  });
}

export function mapAlerts(raw: Record<string, unknown>): Alert[] {
  const list = raw.alerts;
  if (!Array.isArray(list) || list.length === 0) return [];
  return list.map((item) => {
    const a = item as Record<string, unknown>;
    return {
      type: String(a.type ?? a.severity ?? 'warning').toLowerCase(),
      title: String(a.title ?? a.event ?? 'Marine advisory'),
      severity: String(a.severity ?? a.alert_level ?? 'WARNING'),
      description: a.description != null
        ? String(a.description)
        : a.details != null
          ? String(a.details)
          : undefined,
    };
  });
}

export function mapPfzResponse(raw: Record<string, unknown>): PFZResponse {
  const params = (raw.parameters as Record<string, unknown> | undefined) ?? {};
  return {
    lat: Number(raw.lat ?? raw.latitude),
    lon: Number(raw.lon ?? raw.longitude),
    pfz_potential: raw.pfz_potential != null
      ? String(raw.pfz_potential)
      : raw.fishing_recommendation != null
        ? String(raw.fishing_recommendation)
        : undefined,
    composite_score: Number(
      raw.composite_score ?? raw.potential_fishing_score ?? 0
    ),
    safety_color: raw.safety_color != null
      ? String(raw.safety_color)
      : raw.marine_safety_index != null
        ? String(raw.marine_safety_index)
        : undefined,
    recommendation: raw.recommendation != null
      ? String(raw.recommendation)
      : raw.summary_advisory != null
        ? String(raw.summary_advisory)
        : undefined,
    layers: params,
    error: raw.error != null ? String(raw.error) : undefined,
  };
}

export function advisoryToWeather(
  advisory: Record<string, unknown>,
  fallback: WeatherData
): WeatherData {
  const params = (advisory.parameters as Record<string, unknown> | undefined) ?? {};
  const sst = (params.sst as Record<string, unknown> | undefined) ?? {};
  const waves = (params.waves as Record<string, unknown> | undefined) ?? {};
  const alerts = (params.disaster_alerts as Record<string, unknown> | undefined) ?? {};

  const waveHeight = Number(
    waves.wave_height_meters ?? waves.wave_height_m ?? fallback.waveHeight
  );
  const temp = Number(sst.sst_celsius ?? sst.sst ?? fallback.temp);
  const status = safetyToStatus(
    String(advisory.marine_safety_index ?? waves.sea_state ?? waves.safety_index ?? '')
  );
  const alertLevel = String(alerts.alert_level ?? '');

  return {
    temp,
    windSpeed: fallback.windSpeed,
    waveHeight,
    rainProb: fallback.rainProb,
    visibilityKm: fallback.visibilityKm,
    status: alertLevel.toLowerCase().includes('orange') ? 'CAUTION' : status,
  };
}

export function seedToLivePfz(
  seed: PFZData,
  pfz: PFZResponse,
  boat: Loc
): PFZData {
  const waves = (pfz.layers?.waves as Record<string, unknown> | undefined) ?? {};
  const dist = calculateDistanceKm(boat.lat, boat.lng, seed.lat, seed.lng);
  const score = pfz.composite_score ?? seed.score;
  const waveHeightM = Number(
    waves.wave_height_meters ?? waves.wave_height_m ?? seed.waveHeightM
  );

  return {
    ...seed,
    potential: scoreToPotential(score),
    score,
    waveHeightM,
    seaCondition: String(waves.sea_state ?? seed.seaCondition),
    recommendationReason: pfz.recommendation ?? seed.recommendationReason,
    distanceKm: dist,
    travelTimeMin: calculateETA(dist),
  };
}

export function languageToIso(language: string): string {
  const table: Record<string, string> = {
    English: 'en',
    Hindi: 'hi',
    Tamil: 'ta',
    Telugu: 'te',
    Malayalam: 'ml',
    Kannada: 'kn',
    Bengali: 'bn',
    Gujarati: 'gu',
    Marathi: 'mr',
    Odia: 'or',
  };
  if (language.length <= 3) return language.toLowerCase();
  return table[language] ?? 'en';
}
