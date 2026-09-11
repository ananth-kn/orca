/**
 * ORCA shared data types.
 *
 * These types describe the shape of live data the frontend expects from the
 * backend. As of the current iteration the app intentionally renders "no data"
 * states until the backend endpoints are implemented — there is NO mock data
 * anywhere in the frontend.
 */
export interface PFZData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  potential: 'High' | 'Moderate' | 'Low';
  score: number;
  distanceKm: number;
  travelTimeMin: number;
  waveHeightM: number;
  windSpeedKmh: number;
  sstCelsius: number;
  chlorophyllMgM3: number;
  seaCondition: string;
  recommendationReason: string;

  targetSpecies?: string[];
  depthM?: number;
  fuelLiters?: number;
}

export interface WeatherData {
  temp: number;
  windSpeed: number;
  waveHeight: number;
  rainProb: number;
  visibilityKm: number;
  sstCelsius: number;
  chlorophyll: number;
  status: 'FAVOURABLE' | 'CAUTION' | 'HIGH RISK';
}

export interface HourlyForecast {
  hourLabel: string;
  time: string;
  temp: number;
  waveHeight: number;
  windSpeed: number;
  rainProb: number;
  status: 'FAVOURABLE' | 'CAUTION' | 'HIGH RISK';
  statusLabel: string;
  icon: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text?: string;
  content?: string;
  time: string;
  /** Structured data from the backend planner pipeline (tool results, advisories) */
  data?: Record<string, unknown>;
}

export interface FaqEntry {
  id: number;
  question: string;
  answer: string;
  language: string;
  order: number;
  active: boolean;
}
