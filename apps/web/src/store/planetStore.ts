import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Profile } from "../lib/types";
import type {
  ComparisonItem,
  ConflictActionKey,
  ExperienceMode,
  PlanetSimulation,
  QuotaSnapshot,
  ReplayHistoryItem,
  WatchlistItem,
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
  comparisonItems: ComparisonItem[];
  watchlist: WatchlistItem[];
  guestRunsUsed: number;
  userRunsByDay: Record<string, number>;
  setExperienceMode: (experienceMode: ExperienceMode) => void;
  setSelectedCountry: (countryCode3: string | null) => void;
  setHoveredCountry: (countryCode3: string | null) => void;
  setSelectedAction: (actionKey: ConflictActionKey) => void;
  setActiveSimulation: (simulation: PlanetSimulation | null) => void;
  pushHistory: (item: ReplayHistoryItem) => void;
  upsertComparisonItem: (item: ComparisonItem) => void;
  removeComparisonItem: (id: string) => void;
  clearComparisonItems: () => void;
  hasComparisonItem: (id: string | null) => boolean;
  upsertWatchlistItem: (item: Omit<WatchlistItem, "id" | "createdAt">) => void;
  mergeWatchlistItems: (items: WatchlistItem[]) => void;
  removeWatchlistItem: (id: string) => void;
  isWatched: (countryCode3: string | null, actionKey: ConflictActionKey) => boolean;
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
      comparisonItems: [],
      watchlist: [],
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
      upsertComparisonItem: (item) =>
        set((state) => ({
          comparisonItems: [
            item,
            ...state.comparisonItems.filter((existing) => existing.id !== item.id),
          ].slice(0, 6),
        })),
      removeComparisonItem: (id) =>
        set((state) => ({
          comparisonItems: state.comparisonItems.filter((item) => item.id !== id),
        })),
      clearComparisonItems: () => set({ comparisonItems: [] }),
      hasComparisonItem: (id) => {
        if (!id) {
          return false;
        }
        return get().comparisonItems.some((item) => item.id === id);
      },
      upsertWatchlistItem: (item) =>
        set((state) => {
          const id = `${item.countryCode3}:${item.actionKey}`;
          const existing = state.watchlist.find((entry) => entry.id === id);
          const nextItem: WatchlistItem = existing
            ? {
                ...existing,
                mode: item.mode,
                remoteId: item.remoteId ?? existing.remoteId,
              }
            : {
                ...item,
                id,
                createdAt: new Date().toISOString(),
              };

          return {
            watchlist: [
              nextItem,
              ...state.watchlist.filter((entry) => entry.id !== id),
            ].slice(0, 18),
          };
        }),
      mergeWatchlistItems: (items) =>
        set((state) => {
          const merged = new Map(state.watchlist.map((item) => [item.id, item]));
          items.forEach((item) => {
            merged.set(item.id, {
              ...merged.get(item.id),
              ...item,
            });
          });
          return {
            watchlist: Array.from(merged.values())
              .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
              .slice(0, 18),
          };
        }),
      removeWatchlistItem: (id) =>
        set((state) => ({
          watchlist: state.watchlist.filter((item) => item.id !== id),
        })),
      isWatched: (countryCode3, actionKey) => {
        if (!countryCode3) {
          return false;
        }
        return get().watchlist.some(
          (item) => item.countryCode3 === countryCode3 && item.actionKey === actionKey,
        );
      },
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
        comparisonItems: state.comparisonItems,
        watchlist: state.watchlist,
        guestRunsUsed: state.guestRunsUsed,
        userRunsByDay: state.userRunsByDay,
      }),
    },
  ),
);
