import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Profile } from "../lib/types";
import type {
  ConflictActionKey,
  ExperienceMode,
  PlanetSimulation,
  QuotaSnapshot,
  ReplayHistoryItem,
} from "../features/planet/types";

const GUEST_LIMIT = 3;
const FREE_LIMIT = 3;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

interface PlanetState {
  experienceMode: ExperienceMode;
  selectedCountryCode3: string | null;
  hoveredCountryCode3: string | null;
  selectedActionKey: ConflictActionKey;
  activeSimulation: PlanetSimulation | null;
  history: ReplayHistoryItem[];
  guestRunsUsed: number;
  userRunsByDay: Record<string, number>;
  setExperienceMode: (experienceMode: ExperienceMode) => void;
  setSelectedCountry: (countryCode3: string | null) => void;
  setHoveredCountry: (countryCode3: string | null) => void;
  setSelectedAction: (actionKey: ConflictActionKey) => void;
  setActiveSimulation: (simulation: PlanetSimulation | null) => void;
  pushHistory: (item: ReplayHistoryItem) => void;
  quotaSnapshot: (profile: Profile | null) => QuotaSnapshot;
  consumeQuota: (profile: Profile | null) => QuotaSnapshot;
}

export const usePlanetStore = create<PlanetState>()(
  persist(
    (set, get) => ({
      experienceMode: "observed",
      selectedCountryCode3: null,
      hoveredCountryCode3: null,
      selectedActionKey: "war",
      activeSimulation: null,
      history: [],
      guestRunsUsed: 0,
      userRunsByDay: {},
      setExperienceMode: (experienceMode) => set({ experienceMode }),
      setSelectedCountry: (selectedCountryCode3) => set({ selectedCountryCode3 }),
      setHoveredCountry: (hoveredCountryCode3) => set({ hoveredCountryCode3 }),
      setSelectedAction: (selectedActionKey) => set({ selectedActionKey }),
      setActiveSimulation: (activeSimulation) => set({ activeSimulation }),
      pushHistory: (item) =>
        set((state) => ({
          history: [item, ...state.history.filter((existing) => existing.id !== item.id)].slice(
            0,
            24,
          ),
        })),
      quotaSnapshot: (profile) => {
        if (profile?.unlimited || profile?.planTier === "PRO") {
          return {
            simulationsRemaining: null,
            unlimited: true,
          };
        }

        if (!profile || profile.subjectType === "GUEST") {
          return {
            simulationsRemaining: Math.max(0, GUEST_LIMIT - get().guestRunsUsed),
            unlimited: false,
          };
        }

        const usedToday = get().userRunsByDay[todayKey()] ?? 0;
        return {
          simulationsRemaining: Math.max(0, FREE_LIMIT - usedToday),
          unlimited: false,
        };
      },
      consumeQuota: (profile) => {
        const snapshot = get().quotaSnapshot(profile);

        if (snapshot.unlimited) {
          return snapshot;
        }

        if ((snapshot.simulationsRemaining ?? 0) <= 0) {
          throw new Error("Simulation quota exhausted");
        }

        if (!profile || profile.subjectType === "GUEST") {
          const nextUsed = get().guestRunsUsed + 1;
          set({ guestRunsUsed: nextUsed });
          return {
            simulationsRemaining: GUEST_LIMIT - nextUsed,
            unlimited: false,
          };
        }

        const dateKey = todayKey();
        const nextCount = (get().userRunsByDay[dateKey] ?? 0) + 1;
        set((state) => ({
          userRunsByDay: {
            ...state.userRunsByDay,
            [dateKey]: nextCount,
          },
        }));

        return {
          simulationsRemaining: FREE_LIMIT - nextCount,
          unlimited: false,
        };
      },
    }),
    {
      name: "geoecon-wars-planet",
      partialize: (state) => ({
        selectedActionKey: state.selectedActionKey,
        experienceMode: state.experienceMode,
        activeSimulation: state.activeSimulation,
        history: state.history,
        guestRunsUsed: state.guestRunsUsed,
        userRunsByDay: state.userRunsByDay,
      }),
    },
  ),
);
