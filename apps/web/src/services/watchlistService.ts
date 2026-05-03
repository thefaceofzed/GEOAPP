import { api } from "../lib/api";
import type { WatchlistDigestView, WatchlistEntry } from "../lib/types";

export async function fetchWatchlist() {
  const { data } = await api.get<WatchlistEntry[]>("/watchlist");
  return data;
}

export async function upsertWatchlistItem(payload: {
  countryCode: string;
  actionKey: string;
  preferredMode: "observed" | "simulate" | "forecast";
}) {
  const { data } = await api.post<WatchlistEntry>("/watchlist", payload);
  return data;
}

export async function deleteWatchlistItem(countryCode: string, actionKey: string) {
  await api.delete(`/watchlist/${countryCode}/${actionKey}`);
}

export async function fetchWatchlistDigest(limit = 6) {
  const { data } = await api.get<WatchlistDigestView>("/watchlist/digest", {
    params: {
      limit,
      signalLimit: 4,
      horizonDays: 14,
    },
  });
  return data;
}
