export interface PFZData {
  id: string;
  lat: number;
  lng: number;
  potential: 'Low' | 'Moderate' | 'High' | 'Very High';
  distanceKm?: number;
  travelTimeMin?: number;
  seaCondition: string;
  waveHeightM: number;
  windSpeedKmh: number;
  score: number;
  recommendationReason: string;
}

export interface WeatherData {
  temp: number;
  windSpeed: number;
  waveHeight: number;
  rainProb: number;
  visibilityKm: number;
  status: 'FAVOURABLE' | 'CAUTION' | 'HIGH RISK';
}

export const mockCurrentWeather: WeatherData = {
  temp: 28,
  windSpeed: 14,
  waveHeight: 0.8,
  rainProb: 20,
  visibilityKm: 9,
  status: 'FAVOURABLE'
};

export const mockTimeline = [
  { time: 'NOW', temp: 28, wind: 14, waves: 0.8, rain: 20, status: 'FAVOURABLE', icon: '🌤' },
  { time: '+1 HR', temp: 29, wind: 16, waves: 0.9, rain: 25, status: 'FAVOURABLE', icon: '🌤' },
  { time: '+2 HR', temp: 28, wind: 20, waves: 1.2, rain: 40, status: 'CAUTION', icon: '🌦' },
  { time: '+3 HR', temp: 26, wind: 27, waves: 1.6, rain: 70, status: 'HIGH RISK', icon: '⛈' },
];

export const mockLiveAlerts = [
  {
    type: 'warning',
    title: 'WIND INCREASING',
    description: 'Wind near your location: 14 → 24 km/h expected in ~2 hours. Because you are currently offshore, ORCA recommends beginning your return before 4:30 PM.',
    impact: 'Moderate'
  }
];

export const mockChanges = [
  { label: 'Waves are building', old: '0.6m', new: '0.8m', type: 'worse' },
  { label: 'Wind is picking up', old: '10 km/h', new: '14 km/h', type: 'worse' }
];

export const mockBoundary = {
  status: 'SAFE',
  message: 'No restricted areas along current plan.',
  distanceKm: 4.2
};

export const mockPFZs: PFZData[] = [
  {
    id: 'pfz-1',
    lat: 12.8222,
    lng: 74.7825,
    potential: 'High',
    distanceKm: 4.8,
    travelTimeMin: 18,
    seaCondition: 'Moderate',
    waveHeightM: 0.7,
    windSpeedKmh: 12,
    score: 92,
    recommendationReason: 'Closest area with high potential and favourable conditions.'
  },
  {
    id: 'pfz-2',
    lat: 12.8522,
    lng: 74.7025,
    potential: 'Moderate',
    distanceKm: 6.2,
    travelTimeMin: 24,
    seaCondition: 'Moderate',
    waveHeightM: 0.8,
    windSpeedKmh: 14,
    score: 80,
    recommendationReason: 'Good alternative if sector 1 is crowded.'
  },
  {
    id: 'pfz-3',
    lat: 12.7522,
    lng: 74.8025,
    potential: 'Moderate',
    distanceKm: 8.7,
    travelTimeMin: 32,
    seaCondition: 'Rough',
    waveHeightM: 1.1,
    windSpeedKmh: 18,
    score: 72,
    recommendationReason: 'Rougher sea conditions expected here.'
  }
];

export interface AIChatMessage {
  role: 'assistant' | 'user';
  text: string;
  hasAction?: boolean;
}

export const mockAIChatHistory: AIChatMessage[] = [
  { role: 'assistant', text: 'Namaskara! I am ORCA. I am continuously monitoring conditions, boundaries, and your route. What do you need?' }
];
