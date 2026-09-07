/**
 * ORCA API Client
 *
 * Uses VITE_API_BASE_URL env var (e.g. https://orca-api.railway.app).
 * Falls back to empty string so Vite proxy at /api handles it in dev.
 */

import {
  languageToIso,
  mapAlerts,
  mapChatHistory,
  mapChatResponse,
  mapHarbor,
  mapPfzResponse,
} from './adapters';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

console.log("ORCA BASE_URL =", BASE_URL);
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`ORCA API Error [${res.status}]: ${text}`);
  }
  return res.json() as Promise<T>;
}

async function requestRaw(path: string, options?: RequestInit): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>(path, options);
}

// ─── Marine Data Types ─────────────────────────────────────────────────────────

export interface SSTResponse {
  lat: number;
  lon: number;
  sst_celsius?: number;
  sst_fahrenheit?: number;
  source?: string;
  timestamp?: string;
  error?: string;
}

export interface ChlorophyllResponse {
  lat: number;
  lon: number;
  chlorophyll_mg_m3?: number;
  category?: string;
  source?: string;
  timestamp?: string;
  error?: string;
}

export interface WavesResponse {
  lat: number;
  lon: number;
  wave_height_m?: number;
  wave_direction_deg?: number;
  swell_period_s?: number;
  safety_index?: string;
  safety_color?: string;
  source?: string;
  timestamp?: string;
  error?: string;
}

export interface CurrentsResponse {
  lat: number;
  lon: number;
  current_speed_m_s?: number;
  current_direction_deg?: number;
  source?: string;
  timestamp?: string;
  error?: string;
}

export interface AlertsResponse {
  lat: number;
  lon: number;
  alerts?: Alert[];
  source?: string;
  timestamp?: string;
  error?: string;
}

export interface Alert {
  type: string;
  title: string;
  severity: string;
  description?: string;
}

export interface PFZResponse {
  lat: number;
  lon: number;
  pfz_potential?: string;
  composite_score?: number;
  safety_color?: string;
  recommendation?: string;
  layers?: Record<string, unknown>;
  error?: string;
}

export interface Harbor {
  id: number;
  name: string;
  lat: number;
  lon: number;
  type?: string;
  state?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  session_id: string;
  response: string;
  language?: string;
}

function mapSst(raw: Record<string, unknown>): SSTResponse {
  const celsius = Number(raw.sst_celsius ?? raw.sst);
  return {
    lat: Number(raw.lat ?? raw.latitude),
    lon: Number(raw.lon ?? raw.longitude),
    sst_celsius: Number.isFinite(celsius) ? celsius : undefined,
    sst_fahrenheit: Number.isFinite(celsius) ? Number(((celsius * 9) / 5 + 32).toFixed(1)) : undefined,
    source: raw.source != null ? String(raw.source) : undefined,
    timestamp: raw.timestamp != null ? String(raw.timestamp) : raw.data_time != null ? String(raw.data_time) : undefined,
    error: raw.error != null ? String(raw.error) : undefined,
  };
}

function mapChlorophyll(raw: Record<string, unknown>): ChlorophyllResponse {
  const value = Number(raw.chlorophyll_mg_m3 ?? raw.chlorophyll);
  return {
    lat: Number(raw.lat ?? raw.latitude),
    lon: Number(raw.lon ?? raw.longitude),
    chlorophyll_mg_m3: Number.isFinite(value) ? value : undefined,
    category: raw.category != null ? String(raw.category) : raw.productivity_grade != null ? String(raw.productivity_grade) : undefined,
    source: raw.source != null ? String(raw.source) : undefined,
    timestamp: raw.timestamp != null ? String(raw.timestamp) : raw.data_time != null ? String(raw.data_time) : undefined,
    error: raw.error != null ? String(raw.error) : undefined,
  };
}

function mapWaves(raw: Record<string, unknown>): WavesResponse {
  const height = Number(raw.wave_height_m ?? raw.wave_height_meters);
  return {
    lat: Number(raw.lat ?? raw.latitude),
    lon: Number(raw.lon ?? raw.longitude),
    wave_height_m: Number.isFinite(height) ? height : undefined,
    wave_direction_deg: raw.wave_direction_deg != null ? Number(raw.wave_direction_deg) : undefined,
    swell_period_s: Number(raw.swell_period_s ?? raw.peak_period_s ?? raw.wave_period_seconds) || undefined,
    safety_index: raw.safety_index != null ? String(raw.safety_index) : raw.sea_state != null ? String(raw.sea_state) : undefined,
    safety_color: raw.safety_color != null ? String(raw.safety_color) : undefined,
    source: raw.source != null ? String(raw.source) : undefined,
    timestamp: raw.timestamp != null ? String(raw.timestamp) : undefined,
    error: raw.error != null ? String(raw.error) : undefined,
  };
}

function mapCurrents(raw: Record<string, unknown>): CurrentsResponse {
  const kmh = Number(raw.current_speed_m_s ?? raw.velocity_kmh);
  return {
    lat: Number(raw.lat ?? raw.latitude),
    lon: Number(raw.lon ?? raw.longitude),
    current_speed_m_s: Number.isFinite(kmh) ? kmh : undefined,
    current_direction_deg: Number(raw.current_direction_deg ?? raw.direction_deg) || undefined,
    source: raw.source != null ? String(raw.source) : undefined,
    timestamp: raw.timestamp != null ? String(raw.timestamp) : undefined,
    error: raw.error != null ? String(raw.error) : undefined,
  };
}

function mapAlertsResponse(raw: Record<string, unknown>, lat: number, lon: number): AlertsResponse {
  return {
    lat: Number(raw.lat ?? raw.latitude ?? lat),
    lon: Number(raw.lon ?? raw.longitude ?? lon),
    alerts: mapAlerts(raw),
    source: raw.source != null ? String(raw.source) : undefined,
    timestamp: raw.timestamp != null ? String(raw.timestamp) : undefined,
    error: raw.error != null ? String(raw.error) : undefined,
  };
}

// ─── API Methods ───────────────────────────────────────────────────────────────

export const api = {
  marine: {
    sst: async (lat: number, lon: number) =>
      mapSst(await requestRaw(`/api/marine/sst?lat=${lat}&lon=${lon}`)),

    chlorophyll: async (lat: number, lon: number) =>
      mapChlorophyll(await requestRaw(`/api/marine/chlorophyll?lat=${lat}&lon=${lon}`)),

    waves: async (lat: number, lon: number) =>
      mapWaves(await requestRaw(`/api/marine/waves?lat=${lat}&lon=${lon}`)),

    currents: async (lat: number, lon: number) =>
      mapCurrents(await requestRaw(`/api/marine/currents?lat=${lat}&lon=${lon}`)),

    alerts: async (lat: number, lon: number) =>
      mapAlertsResponse(await requestRaw(`/api/marine/alerts?lat=${lat}&lon=${lon}`), lat, lon),

    pfz: async (lat: number, lon: number) =>
      mapPfzResponse(await requestRaw(`/api/marine/pfz?lat=${lat}&lon=${lon}`)),

    fullAdvisory: async (lat: number, lon: number, radius_km = 50) =>
      requestRaw('/api/marine/full-advisory', {
        method: 'POST',
        body: JSON.stringify({ latitude: lat, longitude: lon, radius_km }),
      }),
  },

  advisory: {
    harbors: async () => {
      const rows = await request<Record<string, unknown>[]>('/api/advisory/harbors');
      return rows.map(mapHarbor);
    },
  },

  chat: {
    message: async (
      session_id: string,
      message: string,
      lat?: number,
      lon?: number,
      language = 'en'
    ) => {
      const raw = await requestRaw('/api/chat/message', {
        method: 'POST',
        body: JSON.stringify({
          session_id,
          message,
          lat,
          lon,
          language: languageToIso(language),
        }),
      });
      return mapChatResponse(raw);
    },

    history: async (session_id: string) =>
      mapChatHistory(await request<unknown>(`/api/chat/history/${session_id}`)),
  },
};

export default api;
