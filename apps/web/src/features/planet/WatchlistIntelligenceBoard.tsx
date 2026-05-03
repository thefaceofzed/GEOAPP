import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchForecast, fetchObservedSignals } from "../../services/simulationService";
import { fetchWatchlistDigest } from "../../services/watchlistService";
import { useSessionStore } from "../../store/sessionStore";
import type { WatchlistItem } from "./types";
import {
  buildWatchlistBrief,
  buildWatchlistIntelligenceCard,
  sortWatchlistIntelligenceCards,
  summarizeWatchlistIntelligence,
} from "./watchlistIntelligence";

interface WatchlistIntelligenceBoardProps {
  items: WatchlistItem[];
  onActivate: (item: WatchlistItem) => void;
  limit?: number;
}

export function WatchlistIntelligenceBoard({
  items,
  onActivate,
  limit = 6,
}: WatchlistIntelligenceBoardProps) {
  const accessToken = useSessionStore((state) => state.accessToken);
  const watchItems = useMemo(() => items.slice(0, limit), [items, limit]);
  const itemsSignature = useMemo(
    () =>
      [...watchItems]
        .map((item) => `${item.id}:${item.countryCode}:${item.actionKey}`)
        .sort()
        .join("|"),
    [watchItems],
  );
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const boardQuery = useQuery({
    queryKey: ["watchlist-intelligence-board", itemsSignature, Boolean(accessToken)],
    enabled: watchItems.length > 0,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (accessToken) {
        try {
          return { source: "backend" as const, digest: await fetchWatchlistDigest(limit) };
        } catch { /* fallback */ }
      }
      const items = await Promise.all(
        watchItems.map(async (item) => {
          const [observed, forecast] = await Promise.all([
            fetchObservedSignals(item.countryCode, item.actionKey, 4).catch(() => null),
            fetchForecast(item.countryCode, item.actionKey, 14).catch(() => null),
          ]);
          return { item, observed, forecast };
        }),
      );
      return { source: "fallback" as const, items };
    },
  });

  const cards = useMemo(() => {
    if (!boardQuery.data) return [];
    if (boardQuery.data.source === "backend") {
      return boardQuery.data.digest.items.map((item) => ({
        id: item.id, countryCode: item.countryCode, countryCode3: item.countryCode3,
        countryName: item.countryName, actionKey: item.actionKey, actionLabel: item.actionLabel,
        preferredMode: item.preferredMode, createdAt: item.createdAt, alertState: item.alertState,
        riskLabel: item.riskLabel, riskScore: item.riskScore != null ? Math.round(item.riskScore) : null,
        signalCount: item.signalCount, freshnessLabel: item.freshnessLabel,
        confidenceScore: item.confidenceScore != null ? Math.round(item.confidenceScore) : null,
        summary: item.summary, driverLabel: item.leadDriverLabel,
      }));
    }
    return sortWatchlistIntelligenceCards(
      boardQuery.data.items.map(({ item, observed, forecast }) =>
        buildWatchlistIntelligenceCard(item, observed, forecast)),
    );
  }, [boardQuery.data]);

  const boardSummary = useMemo(() => {
    if (boardQuery.data?.source === "backend") return boardQuery.data.digest.summary;
    return summarizeWatchlistIntelligence(cards);
  }, [boardQuery.data, cards]);

  const boardBrief = useMemo(() => {
    if (boardQuery.data?.source === "backend") return boardQuery.data.digest.brief;
    return buildWatchlistBrief(cards);
  }, [boardQuery.data, cards]);

  async function handleCopyBrief() {
    await navigator.clipboard.writeText(boardBrief);
    setCopyMessage("Watchlist briefing copied.");
    window.setTimeout(() => setCopyMessage(null), 1800);
  }

  if (watchItems.length === 0) return null;

  return (
    <section className="rounded-panel border border-b-default bg-gradient-to-br from-surface-alt to-surface p-5 backdrop-blur-panel transition-colors">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono font-medium">Watchlist intelligence</p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-t-primary italic">Live monitoring board</h2>
          <p className="mt-3 max-w-3xl text-sm text-t-secondary">
            GEOAPP is checking your saved hotspots against observed signals and short-horizon forecast risk.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-full border border-b-subtle px-3 py-1 text-[10px] uppercase tracking-widest text-t-secondary font-mono transition hover:border-b-default hover:text-t-primary"
            onClick={handleCopyBrief}
            type="button"
          >
            Copy watchlist brief
          </button>
          <div className="rounded-full border border-b-subtle px-3 py-1 text-[10px] uppercase tracking-widest text-t-tertiary font-mono">
            {watchItems.length} tracked
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 grid-cols-2 md:grid-cols-4">
        {[
          ["Attention", boardSummary.attentionCount],
          ["Watch", boardSummary.watchCount],
          ["Quiet", boardSummary.quietCount],
          ["Coverage gaps", boardSummary.coverageGapCount],
        ].map(([label, count]) => (
          <div key={label as string} className="rounded-card border border-b-subtle bg-surface-raised p-3 shadow-raised">
            <p className="text-[10px] uppercase tracking-widest text-t-tertiary font-mono">{label}</p>
            <p className="mt-2 text-xl font-mono text-t-primary">{count}</p>
          </div>
        ))}
      </div>
      {copyMessage && <p className="mt-4 text-sm text-accent">{copyMessage}</p>}

      {boardQuery.isLoading ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {watchItems.map((item) => (
            <div className="rounded-card border border-b-subtle bg-surface-raised p-4 shadow-raised" key={item.id}>
              <div className="h-5 w-40 animate-pulse rounded bg-surface-alt" />
              <div className="mt-3 h-4 w-28 animate-pulse rounded bg-surface-alt" />
              <div className="mt-4 h-16 animate-pulse rounded-card bg-surface-alt" />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {cards.map((card) => {
            const item = watchItems.find((entry) => entry.id === card.id);
            return (
              <article className="rounded-card border border-b-subtle bg-surface-raised p-4 transition-colors shadow-raised hover:shadow-card" key={card.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-2xl font-semibold text-t-primary italic">{card.countryName}</p>
                    <p className="mt-1 text-sm text-t-secondary">{card.actionLabel} | {card.preferredMode}</p>
                  </div>
                  <div className="rounded-full border border-b-subtle px-3 py-1 text-[10px] uppercase tracking-widest text-t-tertiary font-mono">
                    {card.alertState} | {card.riskLabel}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[
                    ["Risk", card.riskScore != null ? `${card.riskScore}/100` : "n/a"],
                    ["Signals", card.signalCount],
                    ["Freshness", card.freshnessLabel],
                  ].map(([label, value]) => (
                    <div key={label as string} className="rounded-card border border-b-subtle bg-surface-alt p-3 shadow-raised">
                      <p className="text-[10px] uppercase tracking-widest text-t-tertiary font-mono">{label}</p>
                      <p className="mt-2 text-lg font-mono text-t-primary">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-card border border-b-subtle bg-surface-alt p-4 shadow-raised">
                  <p className="text-sm text-t-secondary">{card.summary}</p>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-t-secondary">
                  <div>Confidence: {card.confidenceScore != null ? `${card.confidenceScore}/100` : "n/a"}</div>
                  <div>{card.driverLabel ? `Lead driver: ${card.driverLabel}` : "Lead driver unavailable"}</div>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button
                    className="rounded-card bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110"
                    disabled={!item}
                    onClick={() => { if (item) onActivate(item); }}
                    type="button"
                  >
                    Open in simulator
                  </button>
                  <div className="rounded-card border border-b-subtle px-4 py-3 text-sm text-t-secondary">
                    {card.signalCount > 0 || card.riskScore != null ? "Ready for daily review" : "Waiting for stronger signal coverage"}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {boardQuery.isFetching && !boardQuery.isLoading && (
        <p className="mt-4 text-sm text-t-tertiary">Refreshing live watchlist intelligence...</p>
      )}
    </section>
  );
}
