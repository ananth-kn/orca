import { create } from 'zustand';
import api, { type Alert, type Harbor } from '../api/client';
import {
  advisoryToWeather,
  mapAlerts,
  seedToLivePfz,
} from '../api/adapters';
import {
  mockAIChatHistory,
  mockCurrentWeather,
  mockLiveAlerts,
  mockPFZs,
  type AIChatMessage,
  type PFZData,
  type WeatherData,
} from '../api/mockData';

export type TripState = 'harbour' | 'travelling' | 'fishing' | 'returning';

interface Location {
  lat: number;
  lng: number;
}

export interface MapLayers {
  pfz: boolean;
  fishingActivity: boolean;
  rain: boolean;
  stormCells: boolean;
  lightning: boolean;
  cloudCover: boolean;
  wind: boolean;
  waves: boolean;
  currents: boolean;
  tide: boolean;
  sst: boolean;
  chlorophyll: boolean;
  restricted: boolean;
  protected: boolean;
  hazards: boolean;
  shipping: boolean;
  harbours: boolean;
  ports: boolean;
  fuel: boolean;
  emergency: boolean;
}

export type BottomSheetState = 'collapsed' | 'expanded' | 'reasoning' | 'hidden';

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
  isOffline: boolean;
  setOffline: (status: boolean) => void;
  
  language: string;
  setLanguage: (lang: string) => void;
  
  location: Location | null;
  setLocation: (loc: Location) => void;
  
  tripState: TripState;
  setTripState: (state: TripState) => void;

  selectedPfz: string | null;
  setSelectedPfz: (id: string | null) => void;

  // New Map-First States
  bottomSheetState: BottomSheetState;
  setBottomSheetState: (state: BottomSheetState) => void;

  activeLayers: MapLayers;
  toggleLayer: (layer: keyof MapLayers) => void;
  setMultipleLayers: (layers: Partial<MapLayers>) => void;

  isPlannerIntelligenceActive: boolean;
  setPlannerIntelligenceActive: (active: boolean) => void;

  timeOffset: number; // 0 to 3 (hours)
  setTimeOffset: (offset: number) => void;

  isFollowMode: boolean;
  setFollowMode: (follow: boolean) => void;

  pfzs: PFZData[];
  weather: WeatherData;
  liveAlerts: typeof mockLiveAlerts;
  harbors: Harbor[];
  advisorySummary: string | null;
  lastSyncedAt: string | null;
  isSyncing: boolean;
  syncError: string | null;
  refreshMarine: () => Promise<void>;

  isChatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  chatMessages: AIChatMessage[];
  isChatSending: boolean;
  sendChat: (text: string) => Promise<void>;
}

const defaultLayers: MapLayers = {
  pfz: true, fishingActivity: false,
  rain: false, stormCells: false, lightning: false, cloudCover: false,
  wind: false, waves: false, currents: false, tide: false, sst: false, chlorophyll: false,
  restricted: true, protected: true, hazards: true, shipping: false,
  harbours: true, ports: false, fuel: false, emergency: false
};

export const useAppStore = create<AppState>((set, get) => ({
  isOffline: false,
  setOffline: (status) => set({ isOffline: status }),
  
  language: 'English',
  setLanguage: (lang) => set({ language: lang }),
  
  location: { lat: 12.8722, lng: 74.8425 }, 
  setLocation: (loc) => set({ location: loc }),
  
  tripState: 'harbour',
  setTripState: (state) => set({ tripState: state }),
  
  selectedPfz: null,
  setSelectedPfz: (id) => set({ selectedPfz: id }),

  bottomSheetState: 'collapsed',
  setBottomSheetState: (state) => set({ bottomSheetState: state }),

  activeLayers: defaultLayers,
  toggleLayer: (layer) => set((state) => ({ 
    activeLayers: { ...state.activeLayers, [layer]: !state.activeLayers[layer] } 
  })),
  setMultipleLayers: (layers) => set((state) => ({
    activeLayers: { ...state.activeLayers, ...layers }
  })),

  isPlannerIntelligenceActive: false,
  setPlannerIntelligenceActive: (active) => set({ isPlannerIntelligenceActive: active }),

  timeOffset: 0,
  setTimeOffset: (offset) => set({ timeOffset: offset }),

  isFollowMode: false,
  setFollowMode: (follow) => set({ isFollowMode: follow }),

  pfzs: mockPFZs,
  weather: mockCurrentWeather,
  liveAlerts: mockLiveAlerts,
  harbors: [],
  advisorySummary: null,
  lastSyncedAt: null,
  isSyncing: false,
  syncError: null,

  refreshMarine: async () => {
    const { location, isOffline } = get();
    if (!location || isOffline) return;

    set({ isSyncing: true, syncError: null });
    try {
      const [advisory, pfzRows, harbors] = await Promise.all([
        api.marine.fullAdvisory(location.lat, location.lng),
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

      const alerts = mapAlerts(
        (advisory.parameters as Record<string, unknown> | undefined)?.disaster_alerts as Record<string, unknown> ?? advisory
      );

      set({
        weather: advisoryToWeather(advisory, mockCurrentWeather),
        pfzs: pfzRows,
        harbors,
        liveAlerts: alerts.length
          ? alerts.map((a: Alert) => ({
              type: a.type === 'warning' ? 'warning' : 'warning',
              title: a.title,
              description: a.description ?? a.severity,
              impact: a.severity,
            }))
          : mockLiveAlerts,
        advisorySummary: advisory.summary_advisory != null ? String(advisory.summary_advisory) : null,
        lastSyncedAt: new Date().toISOString(),
        isSyncing: false,
      });
    } catch (err) {
      set({
        isSyncing: false,
        syncError: err instanceof Error ? err.message : 'Sync failed',
        pfzs: get().pfzs.length ? get().pfzs : mockPFZs,
        weather: get().weather ?? mockCurrentWeather,
      });
    }
  },

  isChatOpen: false,
  setChatOpen: (open) => set({ isChatOpen: open }),
  chatMessages: mockAIChatHistory,
  isChatSending: false,
  sendChat: async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const { location, language, chatMessages } = get();
    set({
      isChatSending: true,
      chatMessages: [...chatMessages, { role: 'user', text: trimmed }],
    });
    try {
      const res = await api.chat.message(
        sessionId(),
        trimmed,
        location?.lat,
        location?.lng,
        language
      );
      set({
        isChatSending: false,
        chatMessages: [
          ...get().chatMessages,
          { role: 'assistant', text: res.response },
        ],
      });
    } catch (err) {
      set({
        isChatSending: false,
        chatMessages: [
          ...get().chatMessages,
          {
            role: 'assistant',
            text: err instanceof Error ? err.message : 'ORCA could not reach the advisory service.',
          },
        ],
      });
    }
  },
}));
