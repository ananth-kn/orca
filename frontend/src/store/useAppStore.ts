import { create } from 'zustand';

import api, {
  type Harbor,
  type PFZResponse,
} from '../api/client';

import { advisoryToWeather } from '../api/adapters';

import {
  calculateDistanceKm,
  calculateETA,
} from '../utils/geo';

import type {
  PFZData,
  WeatherData,
  HourlyForecast,
  ChatMessage,
} from '../api/types';

export type ActiveTab = 'home' | 'map' | 'ai' | 'trip' | 'chat' | 'profile' | 'weather';

export type MarineContext = 'harbour' | 'offshore';

interface Location {
  lat: number;
  lng: number;
  speedKnots: number;
  headingDeg: number;
}

export interface MarineAlertItem {
  id: string;
  type: 'CAUTION' | 'HIGH RISK' | 'INFO' | 'RESTRICTED';
  title: string;
  subtitle?: string;
  description: string;
  recommendation?: string;
  timeframe?: string;
  active: boolean;
}

export interface ConditionDelta {
  metric: string;
  from: string;
  to: string;
  hasChanged: boolean;
}

function sessionId(): string {
  if (typeof window === 'undefined') return 'orca-session';
  const key = 'orca_chat_session';
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  window.localStorage.setItem(key, id);
  return id;
}

const ISO_TO_FULL: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  ml: 'Malayalam',
  kn: 'Kannada',
  bn: 'Bengali',
  gu: 'Gujarati',
  mr: 'Marathi',
  or: 'Odia',
};

export function normalizeLanguage(lang: string | null | undefined): string {
  const trimmed = (lang || '').trim();
  if (!trimmed) return 'English';
  const lower = trimmed.toLowerCase();
  if (ISO_TO_FULL[lower]) return ISO_TO_FULL[lower];
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  if (Object.values(ISO_TO_FULL).includes(capitalized)) return capitalized;
  return capitalized;
}

function storageGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(key);
}

function storageSet(key: string, value: string): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
}

export interface LoraMessage {
  id: string;
  sender: string;
  text: string;
  isMe: boolean;
  distance?: string;
  isSos?: boolean;
  timestamp: string;
}

export interface FaqItem {
  id: string;
  question: string;
  active: boolean;
}

interface AppState {
  // Navigation & Screen Tabs
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  navigateToMapWithPfz: (pfzId: string) => void;

  // Emergency SOS
  isSOSOpen: boolean;
  setSOSOpen: (open: boolean) => void;

  // Language & Vessel
  language: string;
  setLanguage: (lang: string) => void;
  location: Location | null;
  setLocation: (loc: Location) => void;
  marineContext: MarineContext;
  setMarineContext: (ctx: MarineContext) => void;

  // Logged-in fisherman profile
  name: string;
  phone: string;
  emergencyPhone: string;
  setUserProfile: (profile: { name?: string; phone?: string; emergencyPhone?: string }) => void;

  // Weather & Sea Conditions
  weather: WeatherData | null;
  forecast2to3Hr: HourlyForecast[];
  forecastTrend: string;
  activeAlert: MarineAlertItem | null;
  sinceLastCheck: ConditionDelta[];

  // Data Freshness & Sync
  isRefreshing: boolean;
  lastRefreshedMinutesAgo: number;
  lastRefreshedLabel: string;
  dataFreshness: {
    weatherMins: number;
    oceanMins: number;
    satelliteMins: number;
  };
  isOffline: boolean;
  setOffline: (offline: boolean) => void;
  refreshMarine: () => Promise<void>;
  fetchPfz: () => Promise<void>;

  // PFZ & Progressive Disclosure
  pfzs: PFZData[];
  harbors: Harbor[];
  selectedPfz: string | null;
  setSelectedPfz: (id: string | null) => void;
  disclosurePfzId: string | null;
  setDisclosurePfzId: (id: string | null) => void;

  // ORCA System Watching
  orcaWatchingState: 'watching' | 'found_something';
  orcaWatchingDetails: string[];

  // Fleet LoRa Chat
  loraMessages: LoraMessage[];
  addLoraMessage: (msg: Omit<LoraMessage, 'id' | 'timestamp'>) => void;
  loraConnected: boolean;

  // FAQs (backend-powered suggestion chips)
  faqs: FaqItem[];
  loadFaqs: () => Promise<void>;

  // Chat & AI
  chatMessages: ChatMessage[];
  isChatSending: boolean;
  sendChat: (text: string, context?: string) => Promise<void>;
  clearChat: () => void;
  addVoiceTurn: (userText: string, answerText: string) => void;

  // Auth
  userId: string | null;
  setUserId: (id: string | null) => void;
  logout: () => void;
}
function pfzZoneToData(zone: any, index: number, boat: Location): PFZData {
  const potentialNum = Number(zone.potential ?? 0);
  const potential: PFZData['potential'] =
    potentialNum >= 70 ? 'High' : potentialNum >= 40 ? 'Moderate' : 'Low';

  const chl = zone.layers?.chlorophyll ?? {};
  const waves = zone.layers?.waves ?? {};
  const distanceKm = Number(zone.distance_km ?? calculateDistanceKm(boat.lat, boat.lng, zone.lat, zone.lon));

  return {
    id: `pfz-${index}-${zone.lat}-${zone.lon}`,
    name: `PFZ ${index + 1}`,
    lat: zone.lat,
    lng: zone.lon,
    potential,
    score: potentialNum, // drives the confidence color
    distanceKm,
    travelTimeMin: calculateETA(distanceKm),
    waveHeightM: Number(waves.wave_height_m ?? 0),
    windSpeedKmh: Number(waves.wind_speed_kmh ?? 0),
    sstCelsius: 0, // not returned by /api/marine/pfz today
    chlorophyllMgM3: Number(chl.chlorophyll_mg_m3 ?? 0),
    seaCondition: String(waves.safety_index ?? 'Unknown'),
    recommendationReason: '',
  };
}

export const useAppStore = create<AppState>((set, get) => ({
  activeTab: 'home',
  setActiveTab: (tab) => set({ activeTab: tab }),

  navigateToMapWithPfz: (pfzId: string) => {
    set({ selectedPfz: pfzId, activeTab: 'map' });
  },

  isSOSOpen: false,
  setSOSOpen: (open) => set({ isSOSOpen: open }),

  language: normalizeLanguage(storageGet('orca_lang')),
  setLanguage: (lang) => {
    const normalized = normalizeLanguage(lang);
    storageSet('orca_lang', normalized);
    set({ language: normalized });
  },

  name: storageGet('orca_user_name') || '',
  phone: storageGet('orca_user_phone') || '',
  emergencyPhone: storageGet('orca_user_emergency') || '',
  setUserProfile: (profile) => {
    const updates: Partial<AppState> = {};
    if (profile.name !== undefined) {
      storageSet('orca_user_name', profile.name);
      updates.name = profile.name;
    }
    if (profile.phone !== undefined) {
      storageSet('orca_user_phone', profile.phone);
      updates.phone = profile.phone;
    }
    if (profile.emergencyPhone !== undefined) {
      storageSet('orca_user_emergency', profile.emergencyPhone);
      updates.emergencyPhone = profile.emergencyPhone;
    }
    set(updates);
  },

  location: null,
  setLocation: (loc) => set({ location: loc }),
  
  marineContext: 'harbour',
  setMarineContext: (ctx) => set({ marineContext: ctx }),

  weather: null,
  forecast2to3Hr: [],
  forecastTrend: '',
  activeAlert: null,
  sinceLastCheck: [],

  isRefreshing: false,
  lastRefreshedMinutesAgo: 0,
  lastRefreshedLabel: '',
  dataFreshness: { weatherMins: 0, oceanMins: 0, satelliteMins: 0 },

  isOffline: false,
  setOffline: (offline) => set({ isOffline: offline }),

  pfzs: [],
  harbors: [],
  selectedPfz: null,
  setSelectedPfz: (id) => set({ selectedPfz: id }),
  disclosurePfzId: null,
  setDisclosurePfzId: (id) => set({ disclosurePfzId: id }),

  orcaWatchingState: 'watching',
  orcaWatchingDetails: [],

  // LoRa fleet chat
  loraMessages: [],
  addLoraMessage: (msg) => {
    const newMsg: LoraMessage = {
      ...msg,
      id: `lora-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    set((state) => ({ loraMessages: [...state.loraMessages, newMsg] }));
  },
  loraConnected: false,

  // FAQs
  faqs: [],
  loadFaqs: async () => {
    try {
      const BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
      const res = await fetch(`${BASE}/api/chat/faqs`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        set({ faqs: data.map((f: any) => ({ id: String(f.id), question: f.question || f.text || '', active: f.active ?? true })) });
      }
    } catch { /* silent */ }
  },

 refreshMarine: async () => {
  const { location, isOffline } = get();

  set({ isRefreshing: true });

  if (isOffline) {
    setTimeout(() => {
      set({
        isRefreshing: false,
        lastRefreshedMinutesAgo: 0,
        lastRefreshedLabel: 'OFFLINE · No cached data',
      });
    }, 400);

    return;
  }

  if (!location) {
    set({
      isRefreshing: false,
      lastRefreshedLabel: '',
    });

    return;
  }

  try {
const [advisory, harbors, pfzRaw] = await Promise.all([
  api.marine.fullAdvisory(location.lat, location.lng).catch(() => null),
  api.advisory.harbors().catch(() => []),
  fetch(`${(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')}/api/marine/pfz?lat=${location.lat}&lon=${location.lng}`)
    .then(r => r.ok ? r.json() : null)
    .catch(() => null),
]);

const zones: any[] = pfzRaw?.zones ?? [];
const pfzData: PFZData[] = zones.map((z, i) => pfzZoneToData(z, i, location));

    if (advisory) {
      set({
        weather: advisoryToWeather(advisory),
      });
    }

    set({
      harbors,
      pfzs: pfzData,
      isRefreshing: false,
      lastRefreshedLabel: 'LIVE · Just now',
      dataFreshness: {
        weatherMins: 1,
        oceanMins: 1,
        satelliteMins: 1,
      },
    });

    console.log('PFZs loaded:', pfzData);
  } catch (error) {
    console.error('Marine refresh failed:', error);

    set({
      isRefreshing: false,
      lastRefreshedLabel: '',
    });
  }
},
 fetchPfz: async () => {
  const { location } = get();

  if (!location) {
    console.error('PFZ fetch skipped: no GPS location');
    return;
  }

  try {
    const BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

    const res = await fetch(
      `${BASE}/api/marine/pfz?lat=${location.lat}&lon=${location.lng}`
    );

    if (!res.ok) {
      throw new Error(`PFZ request failed: ${res.status}`);
    }

    const data = await res.json();

    console.log('PFZ response:', data);

    // Store ALL returned PFZ zones
    set({
      pfzs: data.zones || [],
    });

  } catch (err) {
    console.error('PFZ fetch failed:', err);
  }
},

  chatMessages: [],
  isChatSending: false,
  sendChat: async (text: string, context?: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userId = typeof window !== 'undefined' ? localStorage.getItem('orca_user_id') : null;
    const { language, chatMessages } = get();
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    set({ isChatSending: true, chatMessages: [...chatMessages, userMsg] });

try {
  const res = await api.chat.message(
    sessionId(),
    trimmed,
    undefined,
    undefined,
    userId ? parseInt(userId) : undefined,
  );
      const reply = res.response?.trim() || '';
      set({
        isChatSending: false,
        chatMessages: [
          ...get().chatMessages,
          { id: `a-${Date.now()}`, role: 'assistant', text: reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        ],
      });
    } catch {
      set({
        isChatSending: false,
        chatMessages: [
          ...get().chatMessages,
          { id: `a-${Date.now()}`, role: 'assistant', text: '', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        ],
      });
    }
  },

  clearChat: () => set({ chatMessages: [] }),

  addVoiceTurn: (userText: string, answerText: string) =>
    set((state) => ({
      chatMessages: [
        ...state.chatMessages,
        { id: `v-${Date.now()}`, role: 'user', text: userText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        { id: `a-${Date.now() + 1}`, role: 'assistant', text: answerText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ],
    })),

  userId: storageGet('orca_user_id'),
  setUserId: (id) => {
    if (id) storageSet('orca_user_id', id);
    else window.localStorage.removeItem('orca_user_id');
    set({ userId: id });
  },
  logout: () => {
    ['orca_user_id', 'orca_lang', 'orca_user_name', 'orca_user_phone', 'orca_user_emergency',
     'orca_emer_name', 'orca_emer_relation'].forEach((k) => window.localStorage.removeItem(k));
    set({ userId: null, activeTab: 'home' as ActiveTab });
    window.dispatchEvent(new CustomEvent('orca:login-ok'));
  },
}));
