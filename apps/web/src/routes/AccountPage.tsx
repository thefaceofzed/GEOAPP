import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { PageTransition } from "../components/PageTransition";
import { HistoryList } from "../components/HistoryList";
import { buildComparisonItem } from "../features/planet/comparison";
import {
  createPlanetSimulationFromBackend,
  restoreLocalReplay,
} from "../features/planet/impactEngine";
import { decodeReplayState } from "../features/planet/replayCodec";
import { WatchlistIntelligenceBoard } from "../features/planet/WatchlistIntelligenceBoard";
import { WatchlistPanel } from "../features/planet/WatchlistPanel";
import { useWatchlistSync } from "../hooks/useWatchlistSync";
import type { ReplayHistoryItem } from "../features/planet/types";
import {
  fetchAdminIngestionStatus,
  invalidateAdminIntelligenceCache,
  triggerAdminSignalRefresh,
} from "../services/adminService";
import { createCheckoutSession } from "../services/billingService";
import { logout } from "../services/authService";
import { fetchHistory, fetchReplay } from "../services/simulationService";
import { usePlanetStore } from "../store/planetStore";
import { useSessionStore } from "../store/sessionStore";

function normalizeSeverity(value: number) {
  return value <= 1 ? Math.round(value * 100) : Math.round(value);
}

function formatDateTime(value: string | null) {
  if (!value) return "n/a";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function AccountPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const profile = useSessionStore((s) => s.profile);
  const accessToken = useSessionStore((s) => s.accessToken);
  const clearSession = useSessionStore((s) => s.clearSession);
  const localHistory = usePlanetStore((s) => s.history);
  const watchlist = usePlanetStore((s) => s.watchlist);
  const setExperienceMode = usePlanetStore((s) => s.setExperienceMode);
  const setSelectedCountry = usePlanetStore((s) => s.setSelectedCountry);
  const setSelectedAction = usePlanetStore((s) => s.setSelectedAction);
  const setActiveSimulation = usePlanetStore((s) => s.setActiveSimulation);
  const upsertComparisonItem = usePlanetStore((s) => s.upsertComparisonItem);
  const quotaSnapshot = usePlanetStore((s) => s.quotaSnapshot);
  const { removeWatchlistItem } = useWatchlistSync();
  const [billingMessage, setBillingMessage] = useState<string | null>(null);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [refreshSourceKey, setRefreshSourceKey] = useState("all");
  const [cacheCountryCode, setCacheCountryCode] = useState("");
  const [cacheActionKey, setCacheActionKey] = useState("");
  const isAdmin = profile?.role === "ADMIN";

  const historyQuery = useQuery({ queryKey: ["history"], queryFn: fetchHistory, enabled: Boolean(accessToken) });

  const adminStatusQuery = useQuery({
    queryKey: ["admin-ingestion-status"], queryFn: fetchAdminIngestionStatus,
    enabled: Boolean(accessToken) && isAdmin,
  });

  const refreshSignalsMutation = useMutation({
    mutationFn: triggerAdminSignalRefresh,
    onSuccess: (result) => {
      const scope = result.sourceKey ? `${result.sourceKey} refresh` : "Global refresh";
      setAdminMessage(`${scope} completed. Inserted ${result.summary.insertedCount}, updated ${result.summary.updatedCount}, deduplicated ${result.summary.deduplicatedCount}.`);
      void queryClient.invalidateQueries({ queryKey: ["admin-ingestion-status"] });
    },
    onError: (error: any) => setAdminMessage(error?.response?.data?.message ?? "Unable to trigger ingestion refresh."),
  });

  const invalidateCacheMutation = useMutation({
    mutationFn: invalidateAdminIntelligenceCache,
    onSuccess: (result) => {
      const scope = result.invalidation.countryCode
        ? `${result.invalidation.countryCode} / ${result.invalidation.actionKey ?? "all actions"}`
        : "all intelligence caches";
      setAdminMessage(`Invalidated ${scope}. Removed ${result.invalidation.observedEntriesRemoved} observed and ${result.invalidation.forecastEntriesRemoved} forecast entries.`);
      void queryClient.invalidateQueries({ queryKey: ["admin-ingestion-status"] });
    },
    onError: (error: any) => setAdminMessage(error?.response?.data?.message ?? "Unable to invalidate intelligence cache."),
  });

  const checkoutState = useMemo(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("checkout") === "success") return "Stripe redirected back. Entitlements update after webhook confirmation.";
    if (params.get("checkout") === "cancelled") return "Checkout was cancelled.";
    return null;
  }, [location.search]);

  const quota = quotaSnapshot(profile);

  const remoteHistory = useMemo<ReplayHistoryItem[]>(() => {
    return (historyQuery.data ?? []).flatMap((item) => {
      if (!item.replayToken) return [];
      return [{
        id: item.simulationId, href: `/replay/${item.replayToken}`,
        countryCode: item.countryCode, countryName: item.countryName,
        actionKey: item.actionKey, actionLabel: item.actionLabel,
        severityScore: normalizeSeverity(item.severityScore), createdAt: item.createdAt,
        source: "backend", note: "Persisted account replay",
      }];
    });
  }, [historyQuery.data]);

  const combinedHistory = useMemo(() => {
    const seen = new Set<string>();
    return [...localHistory, ...remoteHistory]
      .filter((item) => { if (seen.has(item.href)) return false; seen.add(item.href); return true; })
      .sort((l, r) => r.createdAt.localeCompare(l.createdAt));
  }, [localHistory, remoteHistory]);

  async function handleUpgrade() {
    if (!profile || profile.subjectType !== "USER") {
      setBillingMessage("Create an account to start checkout and unlock Pro.");
      return;
    }
    try {
      setBillingMessage(null);
      const session = await createCheckoutSession();
      window.location.assign(session.url);
    } catch (error: any) {
      setBillingMessage(error?.response?.data?.message ?? "Unable to start checkout right now.");
    }
  }

  function handleActivateWatchItem(item: (typeof watchlist)[number]) {
    setSelectedCountry(item.countryCode3);
    setSelectedAction(item.actionKey);
    setExperienceMode(item.mode);
    setActiveSimulation(null);
    navigate("/app");
  }

  async function handleCompareHistoryItem(item: ReplayHistoryItem) {
    if (item.source === "local") {
      const url = new URL(item.href, "http://localhost");
      const seed = decodeReplayState(url.searchParams.get("state"));
      const restored = seed ? restoreLocalReplay(seed) : null;
      if (restored) { upsertComparisonItem(buildComparisonItem(restored, null)); return; }
    }
    const token = item.href.split("/replay/")[1];
    if (!token) return;
    const replayView = await fetchReplay(token);
    const restored = createPlanetSimulationFromBackend(replayView);
    if (!restored) return;
    upsertComparisonItem(buildComparisonItem(restored, replayView));
  }

  return (
    <PageTransition>
      <div className="space-y-5">
        <section className="grid gap-5 grid-cols-1 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-5">
            <section className="rounded-panel border border-b-default bg-surface p-6 backdrop-blur-panel shadow-panel transition-colors animate-panel-enter">
              <div className="flex items-center gap-3 mb-3">
                <span className="h-px w-6 bg-accent" />
                <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono font-medium">{t("account.state")}</p>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold text-t-primary italic">{profile?.planTier ?? "Guest"}</h1>
              <p className="mt-3 text-t-secondary leading-relaxed">
                {quota.unlimited
                  ? t("account.unlimited_access")
                  : t("account.remaining_runs", { count: quota.simulationsRemaining ?? 0 })}
              </p>
              {profile?.planTier !== "PRO" && (
                <button
                  className="mt-6 rounded-btn bg-accent px-6 py-3 font-semibold text-white dark:text-[#080b12] transition hover:brightness-110 hover:shadow-glow-accent"
                  onClick={handleUpgrade}
                  type="button"
                >
                  {profile?.subjectType === "USER" ? t("account.upgrade_pro") : t("account.register_upgrade")}
                </button>
              )}
              {billingMessage && <p className="mt-4 rounded-card border border-b-subtle bg-surface-alt px-4 py-3 text-sm text-t-secondary shadow-card">{billingMessage}</p>}
              {checkoutState && <p className="mt-4 rounded-card border border-b-subtle bg-surface-alt px-4 py-3 text-sm text-t-secondary shadow-card">{checkoutState}</p>}
            </section>

            <section className="rounded-panel border border-b-default bg-surface p-6 backdrop-blur-panel shadow-panel transition-colors animate-panel-enter stagger-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="h-px w-6 bg-accent" />
                <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono font-medium">{t("account.identity")}</p>
              </div>
              <div className="mt-2 grid gap-4 sm:grid-cols-2">
                <div className="rounded-card border border-b-subtle bg-surface-alt p-4 shadow-raised">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-t-tertiary font-mono">{t("account.email")}</p>
                  <p className="mt-2 font-mono text-lg text-t-primary">{profile?.email ?? t("account.guest_session")}</p>
                </div>
                <div className="rounded-card border border-b-subtle bg-surface-alt p-4 shadow-raised">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-t-tertiary font-mono">{t("account.subject_type")}</p>
                  <p className="mt-2 font-mono text-lg text-t-primary">{profile?.subjectType ?? "GUEST"}</p>
                </div>
              </div>
            </section>

            <WatchlistPanel
              emptyMessage="Save scenario lenses from the simulator to create a reusable geopolitical watchlist."
              items={watchlist}
              onActivate={handleActivateWatchItem}
              onRemove={(id) => { const item = watchlist.find((e) => e.id === id); if (item) void removeWatchlistItem(item); }}
              subtitle="Use this as your repeat-use queue for hotspots you expect to revisit."
              title="Saved watchlist"
            />

            <WatchlistIntelligenceBoard items={watchlist} onActivate={handleActivateWatchItem} />

            {isAdmin && (
              <section className="rounded-panel border border-accent/15 bg-gradient-to-br from-accent/5 to-surface p-6 backdrop-blur-panel shadow-panel transition-colors animate-panel-enter stagger-3">
                <div className="flex items-center gap-3 mb-3">
                  <span className="h-px w-6 bg-accent" />
                  <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono font-medium">{t("account.control_plane")}</p>
                </div>
                <h2 className="font-display text-3xl font-semibold text-t-primary italic">{t("account.ingestion_ops")}</h2>
                <p className="mt-3 text-sm text-t-secondary leading-relaxed">
                  {t("account.ingestion_desc")}
                </p>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {[
                    [t("account.stored_signals"), adminStatusQuery.data?.ingestion.storedSignalCount ?? "--", `Latest signal: ${formatDateTime(adminStatusQuery.data?.ingestion.latestSignalPublishedAt ?? null)}`],
                    [t("account.live_stream"), adminStatusQuery.data?.intelligenceStream.activeSubscriptions ?? "--", `Clients: ${adminStatusQuery.data?.intelligenceStream.activeClients ?? "--"} / Max ${adminStatusQuery.data?.intelligenceStream.maxConcurrentStreams ?? "--"}`],
                  ].map(([label, value, detail]) => (
                    <div key={label as string} className="rounded-card border border-b-subtle bg-surface-raised p-4 shadow-raised">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-t-tertiary font-mono">{label}</p>
                      <p className="mt-2 font-mono text-2xl text-t-primary tabular-nums">{value}</p>
                      <p className="mt-2 text-xs text-t-tertiary font-mono">{detail}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-card border border-b-subtle bg-surface-raised p-4 shadow-raised">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-t-tertiary font-mono">{t("account.observed_cache")}</p>
                    <p className="mt-2 font-mono text-xl text-t-primary tabular-nums">{adminStatusQuery.data?.intelligenceCache.observedEntries ?? "--"} {t("common.entries")}</p>
                  </div>
                  <div className="rounded-card border border-b-subtle bg-surface-raised p-4 shadow-raised">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-t-tertiary font-mono">{t("account.forecast_cache")}</p>
                    <p className="mt-2 font-mono text-xl text-t-primary tabular-nums">{adminStatusQuery.data?.intelligenceCache.forecastEntries ?? "--"} {t("common.entries")}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {(adminStatusQuery.data?.ingestion.adapters ?? []).map((adapter) => (
                    <span key={adapter.sourceName} className={`rounded-btn px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-mono ${
                      adapter.enabled ? "border border-emerald-300/30 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300" : "border border-b-subtle bg-surface-alt text-t-tertiary"
                    }`}>
                      {adapter.sourceName} {adapter.enabled ? "on" : "off"}
                    </span>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <select
                    aria-label="Refresh source"
                    className="rounded-btn border border-b-default bg-surface-raised px-4 py-3 text-sm text-t-primary font-mono outline-none transition focus:border-accent"
                    onChange={(e) => setRefreshSourceKey(e.target.value)}
                    value={refreshSourceKey}
                  >
                    <option value="all">All sources</option>
                    {(adminStatusQuery.data?.ingestion.adapters ?? []).map((a) => (
                      <option key={a.sourceKey} value={a.sourceKey}>{a.sourceName}</option>
                    ))}
                  </select>
                  <button
                    className="rounded-btn bg-accent px-5 py-3 font-semibold text-white dark:text-[#080b12] transition hover:brightness-110 hover:shadow-glow-accent disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={refreshSignalsMutation.isPending}
                    onClick={() => { setAdminMessage(null); refreshSignalsMutation.mutate({ sourceKey: refreshSourceKey === "all" ? undefined : refreshSourceKey }); }}
                    type="button"
                  >
                    {refreshSignalsMutation.isPending ? t("account.refreshing") : t("account.refresh_signals")}
                  </button>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-[0.7fr_0.7fr_auto]">
                  <input className="rounded-btn border border-b-default bg-surface-raised px-4 py-3 text-sm text-t-primary font-mono outline-none transition placeholder:text-t-tertiary focus:border-accent focus:shadow-glow-accent"
                    onChange={(e) => setCacheCountryCode(e.target.value.toUpperCase())} placeholder="Country code, e.g. MA" value={cacheCountryCode} />
                  <input className="rounded-btn border border-b-default bg-surface-raised px-4 py-3 text-sm text-t-primary font-mono outline-none transition placeholder:text-t-tertiary focus:border-accent focus:shadow-glow-accent"
                    onChange={(e) => setCacheActionKey(e.target.value)} placeholder="Action key, e.g. sanctions" value={cacheActionKey} />
                  <button
                    className="rounded-btn border border-b-subtle px-5 py-3 text-[11px] uppercase tracking-[0.2em] font-mono text-t-secondary transition hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={invalidateCacheMutation.isPending}
                    onClick={() => { setAdminMessage(null); invalidateCacheMutation.mutate({ countryCode: cacheCountryCode.trim() || undefined, actionKey: cacheActionKey.trim() || undefined }); }}
                    type="button"
                  >
                    {invalidateCacheMutation.isPending ? t("account.invalidating") : t("account.invalidate_cache")}
                  </button>
                </div>

                <div className="mt-4 rounded-card border border-b-subtle bg-surface-raised p-4 text-sm text-t-secondary font-mono shadow-raised">
                  <p>Last refresh: {formatDateTime(adminStatusQuery.data?.ingestion.lastRefresh.completedAt ?? null)}</p>
                  <p className="mt-1">Last broadcast: {formatDateTime(adminStatusQuery.data?.intelligenceStream.lastBroadcastAt ?? null)}</p>
                  <p className="mt-1">Cache TTL: <span className="tabular-nums">{adminStatusQuery.data?.intelligenceCache.ttlMs ?? "--"}</span> ms</p>
                </div>

                {adminMessage && <p className="mt-4 rounded-card border border-b-subtle bg-surface-raised px-4 py-3 text-sm text-t-secondary shadow-raised">{adminMessage}</p>}
              </section>
            )}
          </div>

          <section className="rounded-panel border border-b-default bg-surface p-6 backdrop-blur-panel shadow-panel transition-colors animate-panel-enter stagger-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="h-px w-6 bg-accent" />
                  <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono font-medium">{t("account.replay_history")}</p>
                </div>
                <h2 className="font-display text-3xl font-semibold text-t-primary italic">{t("account.scenario_archive")}</h2>
              </div>
            </div>
            {historyQuery.isLoading ? (
              <div className="rounded-card border border-b-subtle bg-surface-alt px-4 py-5 text-t-secondary shadow-card animate-pulse">Loading account history...</div>
            ) : (
              <HistoryList items={combinedHistory} onCompare={(item) => void handleCompareHistoryItem(item)} />
            )}
          </section>
        </section>
      </div>
    </PageTransition>
  );
}
