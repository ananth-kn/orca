import { create } from 'zustand';

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
}

const defaultLayers: MapLayers = {
  pfz: true, fishingActivity: false,
  rain: false, stormCells: false, lightning: false, cloudCover: false,
  wind: false, waves: false, currents: false, tide: false, sst: false, chlorophyll: false,
  restricted: true, protected: true, hazards: true, shipping: false,
  harbours: true, ports: false, fuel: false, emergency: false
};

export const useAppStore = create<AppState>((set) => ({
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
  setFollowMode: (follow) => set({ isFollowMode: follow })
}));
