export interface PFZData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  potential: 'High' | 'Moderate' | 'Low';
  targetSpecies: string[];
  depthM: number;
  sstCelsius: number;
  chlorophyllMgM3: number;
  distanceKm: number;
  travelTimeMin: number;
  fuelLiters: number;
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
  sstCelsius: number;
  chlorophyll: number;
  status: 'FAVOURABLE' | 'CAUTION' | 'HIGH RISK';
}

export const mockCurrentWeather: WeatherData = {
  temp: 29,
  windSpeed: 14,
  waveHeight: 0.8,
  rainProb: 15,
  visibilityKm: 10,
  sstCelsius: 28.5,
  chlorophyll: 1.8,
  status: 'FAVOURABLE',
};

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

export const mock2to3HrForecast: HourlyForecast[] = [
  {
    hourLabel: 'NOW',
    time: '06:00 AM',
    temp: 28.5,
    waveHeight: 0.8,
    windSpeed: 14,
    rainProb: 15,
    status: 'FAVOURABLE',
    statusLabel: 'Safe & Calm',
    icon: '☀️',
  },
  {
    hourLabel: '+1 HOUR',
    time: '07:00 AM',
    temp: 29.0,
    waveHeight: 0.9,
    windSpeed: 16,
    rainProb: 20,
    status: 'FAVOURABLE',
    statusLabel: 'Good Sailing',
    icon: '🌤️',
  },
  {
    hourLabel: '+2 HOURS',
    time: '08:00 AM',
    temp: 28.0,
    waveHeight: 1.2,
    windSpeed: 22,
    rainProb: 45,
    status: 'CAUTION',
    statusLabel: 'Wind Picking Up',
    icon: '🌦️',
  },
  {
    hourLabel: '+3 HOURS',
    time: '09:00 AM',
    temp: 26.5,
    waveHeight: 1.7,
    windSpeed: 28,
    rainProb: 75,
    status: 'HIGH RISK',
    statusLabel: 'Rough Sea / Rain Squall',
    icon: '⛈️',
  },
];

export const mockPFZs: PFZData[] = [
  {
    id: 'pfz-1',
    name: 'Sector 4A — Mangaluru Outer Bank',
    lat: 12.8222,
    lng: 74.7825,
    potential: 'High',
    targetSpecies: ['Tuna', 'Mackerel', 'Sardine'],
    depthM: 38,
    sstCelsius: 28.4,
    chlorophyllMgM3: 2.15,
    distanceKm: 4.8,
    travelTimeMin: 18,
    fuelLiters: 4.2,
    seaCondition: 'Calm & Favourable',
    waveHeightM: 0.7,
    windSpeedKmh: 12,
    score: 94,
    recommendationReason: 'Highest fish concentration detected by ISRO MOSDAC satellite. Favourable waves until 08:30 AM.',
  },
  {
    id: 'pfz-2',
    name: 'Sector 2B — Ullal Deep Trench',
    lat: 12.8522,
    lng: 74.7025,
    potential: 'High',
    targetSpecies: ['Pomfret', 'Seer Fish', 'Ribbonfish'],
    depthM: 52,
    sstCelsius: 28.1,
    chlorophyllMgM3: 1.85,
    distanceKm: 6.2,
    travelTimeMin: 24,
    fuelLiters: 5.5,
    seaCondition: 'Moderate Waves',
    waveHeightM: 0.8,
    windSpeedKmh: 14,
    score: 82,
    recommendationReason: 'Deep shelf with strong feeding schools. Good alternative zone.',
  },
  {
    id: 'pfz-3',
    name: 'Sector 7C — Someshwara Shelf',
    lat: 12.7522,
    lng: 74.8025,
    potential: 'Moderate',
    targetSpecies: ['Prawns', 'Squid', 'Cuttlefish'],
    depthM: 26,
    sstCelsius: 29.0,
    chlorophyllMgM3: 1.20,
    distanceKm: 8.7,
    travelTimeMin: 32,
    fuelLiters: 7.8,
    seaCondition: 'Building Waves',
    waveHeightM: 1.1,
    windSpeedKmh: 18,
    score: 71,
    recommendationReason: 'Bottom fishing area. Return before 09:00 AM as weather worsens.',
  },
];

export const mockHarbors = [
  { id: 1, name: 'Mangaluru Old Port', lat: 12.8722, lon: 74.8425, state: 'Karnataka', vhf: 'CH 16', phone: '+91 824 242 4116' },
  { id: 2, name: 'Malpe Fishing Harbour', lat: 13.3512, lon: 74.7015, state: 'Karnataka', vhf: 'CH 16', phone: '+91 820 253 8221' },
  { id: 3, name: 'Kochi Port (Cochin)', lat: 9.9656, lon: 76.2421, state: 'Kerala', vhf: 'CH 16', phone: '+91 484 266 6411' },
  { id: 4, name: 'Veraval Port', lat: 20.9077, lon: 70.3667, state: 'Gujarat', vhf: 'CH 16', phone: '+91 2876 220 110' },
  { id: 5, name: 'Rameswaram Jetty', lat: 9.2876, lon: 79.3129, state: 'Tamil Nadu', vhf: 'CH 16', phone: '+91 4573 221 210' },
  { id: 6, name: 'Visakhapatnam Port', lat: 17.6955, lon: 83.2988, state: 'Andhra Pradesh', vhf: 'CH 16', phone: '+91 891 256 4841' },
];

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text?: string;
  content?: string;
  time: string;
}

export const initialChatMessages: ChatMessage[] = [
  {
    id: 'm1',
    role: 'assistant',
    text: 'Namaskara! I am ORCA, your Marine AI Assistant.\n\nToday conditions are safe and calm near Mangaluru until 8:00 AM. Sector 4A has high Tuna and Mackerel potential.\n\nTap any question below or ask me anything!',
    time: '06:00 AM',
  },
];
