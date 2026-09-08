import { create } from 'zustand';
import api, { type Harbor } from '../api/client';
import {
  advisoryToWeather,
  seedToLivePfz,
} from '../api/adapters';
import {
  mockCurrentWeather,
  mock2to3HrForecast,
  mockPFZs,
  mockHarbors,
  initialChatMessages,
  type PFZData,
  type WeatherData,
  type HourlyForecast,
  type ChatMessage,
} from '../api/mockData';

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
  location: Location;
  setLocation: (loc: Location) => void;
  marineContext: MarineContext;
  setMarineContext: (ctx: MarineContext) => void;

  // Weather & Sea Conditions
  weather: WeatherData;
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

  // Chat & AI
  chatMessages: ChatMessage[];
  isChatSending: boolean;
  sendChat: (text: string) => Promise<void>;
  clearChat: () => void;
  addVoiceTurn: (userText: string, answerText: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  activeTab: 'home',
  setActiveTab: (tab) => set({ activeTab: tab }),

  navigateToMapWithPfz: (pfzId: string) => {
    set({
      selectedPfz: pfzId,
      activeTab: 'map',
    });
  },

  isSOSOpen: false,
  setSOSOpen: (open) => set({ isSOSOpen: open }),

  language: (() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('orca_lang') : null;
    return saved || 'English';
  })(),
  setLanguage: (lang) => set({ language: lang }),

  location: {
    lat: 12.8722,
    lng: 74.8425,
    speedKnots: 0.0,
    headingDeg: 215,
  },
  setLocation: (loc) => set({ location: loc }),
  marineContext: 'harbour',
  setMarineContext: (ctx) => set({ marineContext: ctx }),

  weather: mockCurrentWeather,
  forecast2to3Hr: mock2to3HrForecast,
  forecastTrend: 'Waves and wind increasing after +1 hour. Return advised before 4:30 PM.',

  activeAlert: {
    id: 'alert-1',
    type: 'CAUTION',
    title: 'Wind increasing',
    subtitle: '14 → 24 km/h expected in ~2 hours',
    description: 'IMD Coastal bulletin indicates moderate squall line forming 18 nautical miles offshore.',
    recommendation: 'Begin your return to harbour before 4:30 PM.',
    timeframe: 'In about 2 hours',
    active: true,
  },

  sinceLastCheck: [
    { metric: 'Waves', from: '0.6 m', to: '0.8 m', hasChanged: true },
    { metric: 'Wind', from: '10 km/h', to: '14 km/h', hasChanged: true },
    { metric: 'Rain', from: '10%', to: '20%', hasChanged: true },
  ],

  isRefreshing: false,
  lastRefreshedMinutesAgo: 4,
  lastRefreshedLabel: 'LIVE · 4 min ago',
  dataFreshness: {
    weatherMins: 4,
    oceanMins: 18,
    satelliteMins: 42,
  },
  isOffline: false,
  setOffline: (offline) => set({ isOffline: offline }),

  pfzs: mockPFZs,
  harbors: mockHarbors,
  selectedPfz: 'pfz-1',
  setSelectedPfz: (id) => set({ selectedPfz: id }),
  disclosurePfzId: null,
  setDisclosurePfzId: (id) => set({ disclosurePfzId: id }),

  orcaWatchingState: 'watching',
  orcaWatchingDetails: ['Weather', 'Waves', 'Hazards', 'Boundaries'],

  refreshMarine: async () => {
    const { location, isOffline } = get();
    set({ isRefreshing: true });

    if (isOffline) {
      setTimeout(() => {
        set({
          isRefreshing: false,
          lastRefreshedMinutesAgo: 0,
          lastRefreshedLabel: 'OFFLINE · Cached',
        });
      }, 400);
      return;
    }

    try {
      const [advisory, pfzRows, harbors] = await Promise.all([
        api.marine.fullAdvisory(location.lat, location.lng).catch(() => null),
        Promise.all(
          mockPFZs.map((seed) =>
            api.marine
              .pfz(seed.lat, seed.lng)
              .then((raw) => seedToLivePfz(seed, raw, location))
              .catch(() => seed)
          )
        ),
        api.advisory.harbors().catch(() => get().harbors),
      ]);

      if (advisory) {
        set({
          weather: advisoryToWeather(advisory, mockCurrentWeather),
        });
      }

      set({
        pfzs: pfzRows.length ? pfzRows : mockPFZs,
        harbors: harbors.length ? harbors : mockHarbors,
        isRefreshing: false,
        lastRefreshedMinutesAgo: 0,
        lastRefreshedLabel: 'LIVE · Just now',
        dataFreshness: {
          weatherMins: 1,
          oceanMins: 5,
          satelliteMins: 12,
        },
      });
    } catch {
      set({
        isRefreshing: false,
        lastRefreshedMinutesAgo: 0,
        lastRefreshedLabel: 'LIVE · Just now',
      });
    }
  },

  chatMessages: initialChatMessages,
  isChatSending: false,
  sendChat: async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userId = typeof window !== 'undefined' ? localStorage.getItem('orca_user_id') : null;
    const { location, language, chatMessages } = get();
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    set({
      isChatSending: true,
      chatMessages: [...chatMessages, userMsg],
    });

    try {
      const res = await api.chat.message(
        sessionId(),
        trimmed,
        location.lat,
        location.lng,
        language,
        userId ? parseInt(userId) : undefined
      );

      set({
        isChatSending: false,
        chatMessages: [
          ...get().chatMessages,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            text: res.response || 'Conditions are favourable. Waves 0.8m, wind 14 km/h. High potential in Sector 4A.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ],
      });
    } catch {
      set({
        isChatSending: false,
        chatMessages: [
          ...get().chatMessages,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            text: 'Weather is favourable now (Waves 0.8m). Wind increasing after +1 hour. Nearest high catch area is Sector 4A (4.8 km SW).',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ],
      });
    }
  },

  clearChat: () => set({ chatMessages: initialChatMessages }),

  addVoiceTurn: (userText: string, answerText: string) =>
    set((state) => ({
      chatMessages: [
        ...state.chatMessages,
        { id: `v-${Date.now()}`, role: 'user', text: userText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        { id: `a-${Date.now() + 1}`, role: 'assistant', text: answerText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ],
    })),
}));
