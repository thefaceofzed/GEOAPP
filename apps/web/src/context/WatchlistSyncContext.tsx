import { useMutation, useQuery, useQueryClient, type QueryStatus } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import type { WatchlistEntry } from "../lib/types";
import { usePlanetStore } from "../store/planetStore";
import { useSessionStore } from "../store/sessionStore";
import {
  deleteWatchlistItem as deleteRemoteWatchlistItem,
  fetchWatchlist,
  upsertWatchlistItem as upsertRemoteWatchlistItem,
} from "../services/watchlistService";
import type { WatchlistItem } from "../features/planet/types";

function toLocalWatchlistItem(entry: WatchlistEntry): WatchlistItem {
  return {
    id: `${entry.countryCode3}:${entry.actionKey}`,
    remoteId: entry.id,
    countryCode: entry.countryCode,
    countryCode3: entry.countryCode3,
    countryName: entry.countryName,
    actionKey: entry.actionKey as WatchlistItem["actionKey"],
    actionLabel: entry.actionLabel,
    mode: entry.preferredMode,
    createdAt: entry.createdAt,
  };
}

function upsertEntryInCache(prev: WatchlistEntry[] | undefined, entry: WatchlistEntry): WatchlistEntry[] {
  if (!prev?.length) return [entry];
  const idx = prev.findIndex(
    (e) => e.countryCode === entry.countryCode && e.actionKey === entry.actionKey,
  );
  if (idx >= 0) {
    const next = [...prev];
    next[idx] = entry;
    return next;
  }
  return [...prev, entry];
}

interface WatchlistSyncValue {
  watchlistState: QueryStatus;
  saveWatchlistItem: (item: Omit<WatchlistItem, "id" | "createdAt">) => Promise<void>;
  removeWatchlistItem: (item: WatchlistItem) => Promise<void>;
}

const WatchlistSyncContext = createContext<WatchlistSyncValue | null>(null);

export function WatchlistSyncProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const accessToken = useSessionStore((state) => state.accessToken);
  const localWatchlist = usePlanetStore((state) => state.watchlist);
  const mergeWatchlistItems = usePlanetStore((state) => state.mergeWatchlistItems);
  const upsertLocalWatchlistItem = usePlanetStore((state) => state.upsertWatchlistItem);
  const removeLocalWatchlistItem = usePlanetStore((state) => state.removeWatchlistItem);

  const watchlistQuery = useQuery({
    queryKey: ["watchlist"],
    queryFn: fetchWatchlist,
    enabled: Boolean(accessToken),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  useEffect(() => {
    if (!watchlistQuery.data) {
      return;
    }
    mergeWatchlistItems(watchlistQuery.data.map(toLocalWatchlistItem));
  }, [mergeWatchlistItems, watchlistQuery.data]);

  const upsertMutation = useMutation({
    mutationFn: upsertRemoteWatchlistItem,
    onSuccess: (entry) => {
      mergeWatchlistItems([toLocalWatchlistItem(entry)]);
      queryClient.setQueryData<WatchlistEntry[]>(["watchlist"], (old) => upsertEntryInCache(old, entry));
    },
  });

  useEffect(() => {
    if (!accessToken || !watchlistQuery.data) {
      return;
    }

    const remoteKeys = new Set(
      watchlistQuery.data.map((entry) => `${entry.countryCode3}:${entry.actionKey}`),
    );

    localWatchlist
      .filter((item) => !remoteKeys.has(item.id))
      .forEach((item) => {
        upsertMutation.mutate({
          countryCode: item.countryCode,
          actionKey: item.actionKey,
          preferredMode: item.mode,
        });
      });
  }, [accessToken, localWatchlist, upsertMutation.mutate, watchlistQuery.data]);

  const deleteMutation = useMutation({
    mutationFn: ({ countryCode, actionKey }: { countryCode: string; actionKey: string }) =>
      deleteRemoteWatchlistItem(countryCode, actionKey),
    onSuccess: (_, variables) => {
      queryClient.setQueryData<WatchlistEntry[]>(["watchlist"], (old) =>
        (old ?? []).filter(
          (e) => !(e.countryCode === variables.countryCode && e.actionKey === variables.actionKey),
        ),
      );
    },
  });

  const saveWatchlistItem = useCallback(
    async (item: Omit<WatchlistItem, "id" | "createdAt">) => {
      upsertLocalWatchlistItem(item);
      if (!accessToken) {
        return;
      }
      await upsertMutation.mutateAsync({
        countryCode: item.countryCode,
        actionKey: item.actionKey,
        preferredMode: item.mode,
      });
    },
    [accessToken, upsertLocalWatchlistItem, upsertMutation],
  );

  const removeWatchlistItem = useCallback(
    async (item: WatchlistItem) => {
      removeLocalWatchlistItem(item.id);
      if (!accessToken) {
        return;
      }
      await deleteMutation.mutateAsync({
        countryCode: item.countryCode,
        actionKey: item.actionKey,
      });
    },
    [accessToken, removeLocalWatchlistItem, deleteMutation],
  );

  const value = useMemo<WatchlistSyncValue>(
    () => ({
      watchlistState: watchlistQuery.status,
      saveWatchlistItem,
      removeWatchlistItem,
    }),
    [watchlistQuery.status, saveWatchlistItem, removeWatchlistItem],
  );

  return <WatchlistSyncContext.Provider value={value}>{children}</WatchlistSyncContext.Provider>;
}

export function useWatchlistSync(): WatchlistSyncValue {
  const ctx = useContext(WatchlistSyncContext);
  if (!ctx) {
    throw new Error("useWatchlistSync must be used inside DashboardLayout (WatchlistSyncProvider).");
  }
  return ctx;
}
