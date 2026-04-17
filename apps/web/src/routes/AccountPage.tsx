import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthModal } from "../components/AuthModal";
import { HistoryList } from "../components/HistoryList";
import { TopBar } from "../components/TopBar";
import type { ReplayHistoryItem } from "../features/planet/types";
import {
  fetchAdminIngestionStatus,
  invalidateAdminIntelligenceCache,
  triggerAdminSignalRefresh,
} from "../services/adminService";
import { createCheckoutSession } from "../services/billingService";
import { logout } from "../services/authService";
import { fetchHistory } from "../services/simulationService";
import { usePlanetStore } from "../store/planetStore";
import { useSessionStore } from "../store/sessionStore";

function normalizeSeverity(value: number) {
  return value <= 1 ? Math.round(value * 100) : Math.round(value);
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "n/a";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AccountPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const profile = useSessionStore((state) => state.profile);
  const accessToken = useSessionStore((state) => state.accessToken);
  const clearSession = useSessionStore((state) => state.clearSession);
  const localHistory = usePlanetStore((state) => state.history);
  const quotaSnapshot = usePlanetStore((state) => state.quotaSnapshot);
  const [authOpen, setAuthOpen] = useState(false);
  const [billingMessage, setBillingMessage] = useState<string | null>(null);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [refreshSourceKey, setRefreshSourceKey] = useState("all");
  const [cacheCountryCode, setCacheCountryCode] = useState("");
  const [cacheActionKey, setCacheActionKey] = useState("");
  const isAdmin = profile?.role === "ADMIN";

  const historyQuery = useQuery({
    queryKey: ["history"],
    queryFn: fetchHistory,
    enabled: Boolean(accessToken),
  });

  const adminStatusQuery = useQuery({
    queryKey: ["admin-ingestion-status"],
    queryFn: fetchAdminIngestionStatus,
    enabled: Boolean(accessToken) && isAdmin,
  });

  const refreshSignalsMutation = useMutation({
    mutationFn: triggerAdminSignalRefresh,
    onSuccess: (result) => {
      const scope = result.sourceKey ? `${result.sourceKey} refresh` : "Global refresh";
      setAdminMessage(
        `${scope} completed. Inserted ${result.summary.insertedCount}, updated ${result.summary.updatedCount}, deduplicated ${result.summary.deduplicatedCount}.`,
      );
      void queryClient.invalidateQueries({ queryKey: ["admin-ingestion-status"] });
    },
    onError: (error: any) => {
      setAdminMessage(
        error?.response?.data?.message ?? "Unable to trigger ingestion refresh.",
      );
    },
  });

  const invalidateCacheMutation = useMutation({
    mutationFn: invalidateAdminIntelligenceCache,
    onSuccess: (result) => {
      const scope = result.invalidation.countryCode
        ? `${result.invalidation.countryCode} / ${result.invalidation.actionKey ?? "all actions"}`
        : "all intelligence caches";
      setAdminMessage(
        `Invalidated ${scope}. Removed ${result.invalidation.observedEntriesRemoved} observed and ${result.invalidation.forecastEntriesRemoved} forecast entries.`,
      );
      void queryClient.invalidateQueries({ queryKey: ["admin-ingestion-status"] });
    },
    onError: (error: any) => {
      setAdminMessage(
        error?.response?.data?.message ?? "Unable to invalidate intelligence cache.",
      );
    },
  });

  const checkoutState = useMemo(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("checkout") === "success") {
      return "Stripe redirected back. Entitlements update after webhook confirmation.";
    }
    if (params.get("checkout") === "cancelled") {
      return "Checkout was cancelled.";
    }
    return null;
  }, [location.search]);

  const quota = quotaSnapshot(profile);

  const remoteHistory = useMemo<ReplayHistoryItem[]>(() => {
    return (historyQuery.data ?? []).flatMap((item) => {
      if (!item.replayToken) {
        return [];
      }

      return [
        {
          id: item.simulationId,
          href: `/replay/${item.replayToken}`,
          countryCode: item.countryCode,
          countryName: item.countryName,
          actionKey: item.actionKey,
          actionLabel: item.actionLabel,
          severityScore: normalizeSeverity(item.severityScore),
          createdAt: item.createdAt,
          source: "backend",
          note: "Persisted account replay",
        },
      ];
    });
  }, [historyQuery.data]);

  const combinedHistory = useMemo(() => {
    const seen = new Set<string>();
    return [...localHistory, ...remoteHistory]
      .filter((item) => {
        if (seen.has(item.href)) {
          return false;
        }
        seen.add(item.href);
        return true;
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }, [localHistory, remoteHistory]);

  async function handleUpgrade() {
    if (!profile || profile.subjectType !== "USER") {
      setBillingMessage("Create an account to start checkout and unlock Pro.");
      setAuthOpen(true);
      return;
    }

    try {
      setBillingMessage(null);
      const session = await createCheckoutSession();
      window.location.assign(session.url);
    } catch (error: any) {
      setBillingMessage(
        error?.response?.data?.message ?? "Unable to start checkout right now.",
      );
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Local clear is enough for the UI.
    }
    clearSession();
    navigate("/");
  }

  function handleRefreshSignals() {
    setAdminMessage(null);
    refreshSignalsMutation.mutate({
      sourceKey: refreshSourceKey === "all" ? undefined : refreshSourceKey,
    });
  }

  function handleInvalidateCache() {
    setAdminMessage(null);
    invalidateCacheMutation.mutate({
      countryCode: cacheCountryCode.trim() || undefined,
      actionKey: cacheActionKey.trim() || undefined,
    });
  }

  return (
    <div className="min-h-screen px-4 py-5 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1280px] space-y-6">
        <TopBar
          onAuthOpen={() => setAuthOpen(true)}
          onLogout={handleLogout}
          profile={profile}
        />

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/72">
                Account state
              </p>
              <h1 className="mt-3 font-display text-4xl text-white">
                {profile?.planTier ?? "Guest"}
              </h1>
              <p className="mt-3 text-white/68">
                {quota.unlimited
                  ? "Unlimited simulation access is active on this device."
                  : `You currently have ${quota.simulationsRemaining ?? 0} local simulation run(s) remaining.`}
              </p>
              {profile?.planTier !== "PRO" ? (
                <button
                  className="mt-6 rounded-full bg-[linear-gradient(120deg,#7de5ff,#ffe170)] px-5 py-3 font-semibold text-slate-950 transition hover:brightness-105"
                  onClick={handleUpgrade}
                  type="button"
                >
                  {profile?.subjectType === "USER"
                    ? "Upgrade to Pro"
                    : "Register to upgrade"}
                </button>
              ) : null}
              {billingMessage ? (
                <p className="mt-4 rounded-[1.5rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80">
                  {billingMessage}
                </p>
              ) : null}
              {checkoutState ? (
                <p className="mt-4 rounded-[1.5rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80">
                  {checkoutState}
                </p>
              ) : null}
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/72">
                Identity
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-white/50">Email</p>
                  <p className="mt-2 text-lg text-white">
                    {profile?.email ?? "Guest session"}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-white/50">Subject type</p>
                  <p className="mt-2 text-lg text-white">
                    {profile?.subjectType ?? "GUEST"}
                  </p>
                </div>
              </div>
            </section>

            {isAdmin ? (
              <section className="rounded-[2rem] border border-amber-300/20 bg-[linear-gradient(160deg,rgba(255,196,87,0.12),rgba(4,7,18,0.88))] p-6 backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.35em] text-amber-200/72">
                  Control plane
                </p>
                <h2 className="mt-3 font-display text-3xl text-white">
                  Ingestion and intelligence operations
                </h2>
                <p className="mt-3 text-sm text-white/68">
                  Trigger source refreshes, inspect live intelligence health, and invalidate cached views without leaving the app.
                </p>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                    <p className="text-sm text-white/50">Stored signals</p>
                    <p className="mt-2 text-2xl text-white">
                      {adminStatusQuery.data?.ingestion.storedSignalCount ?? "--"}
                    </p>
                    <p className="mt-2 text-xs text-white/50">
                      Latest signal: {formatDateTime(adminStatusQuery.data?.ingestion.latestSignalPublishedAt ?? null)}
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                    <p className="text-sm text-white/50">Live stream</p>
                    <p className="mt-2 text-2xl text-white">
                      {adminStatusQuery.data?.intelligenceStream.activeSubscriptions ?? "--"}
                    </p>
                    <p className="mt-2 text-xs text-white/50">
                      Clients: {adminStatusQuery.data?.intelligenceStream.activeClients ?? "--"} / Max {adminStatusQuery.data?.intelligenceStream.maxConcurrentStreams ?? "--"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                    <p className="text-sm text-white/50">Observed cache</p>
                    <p className="mt-2 text-xl text-white">
                      {adminStatusQuery.data?.intelligenceCache.observedEntries ?? "--"} entries
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                    <p className="text-sm text-white/50">Forecast cache</p>
                    <p className="mt-2 text-xl text-white">
                      {adminStatusQuery.data?.intelligenceCache.forecastEntries ?? "--"} entries
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {(adminStatusQuery.data?.ingestion.adapters ?? []).map((adapter) => (
                    <span
                      key={adapter.sourceName}
                      className={`rounded-full px-3 py-1 text-xs ${
                        adapter.enabled
                          ? "border border-emerald-300/30 bg-emerald-300/12 text-emerald-100"
                          : "border border-white/10 bg-white/5 text-white/55"
                      }`}
                    >
                      {adapter.sourceName} {adapter.enabled ? "on" : "off"}
                    </span>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <select
                    aria-label="Refresh source"
                    className="rounded-full border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/45"
                    onChange={(event) => setRefreshSourceKey(event.target.value)}
                    value={refreshSourceKey}
                  >
                    <option value="all">All sources</option>
                    {(adminStatusQuery.data?.ingestion.adapters ?? []).map((adapter) => (
                      <option key={adapter.sourceKey} value={adapter.sourceKey}>
                        {adapter.sourceName}
                      </option>
                    ))}
                  </select>
                  <button
                    className="rounded-full bg-[linear-gradient(120deg,#ffd36c,#ff8f54)] px-5 py-3 font-semibold text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={refreshSignalsMutation.isPending}
                    onClick={handleRefreshSignals}
                    type="button"
                  >
                    {refreshSignalsMutation.isPending ? "Refreshing..." : "Refresh signals"}
                  </button>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-[0.7fr_0.7fr_auto]">
                  <input
                    className="rounded-full border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cyan-300/45"
                    onChange={(event) => setCacheCountryCode(event.target.value.toUpperCase())}
                    placeholder="Country code, e.g. MA"
                    value={cacheCountryCode}
                  />
                  <input
                    className="rounded-full border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cyan-300/45"
                    onChange={(event) => setCacheActionKey(event.target.value)}
                    placeholder="Action key, e.g. sanctions"
                    value={cacheActionKey}
                  />
                  <button
                    className="rounded-full border border-white/10 px-5 py-3 text-sm text-white/85 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={invalidateCacheMutation.isPending}
                    onClick={handleInvalidateCache}
                    type="button"
                  >
                    {invalidateCacheMutation.isPending ? "Invalidating..." : "Invalidate cache"}
                  </button>
                </div>

                <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-black/20 p-4 text-sm text-white/72">
                  <p>
                    Last refresh: {formatDateTime(adminStatusQuery.data?.ingestion.lastRefresh.completedAt ?? null)}
                  </p>
                  <p className="mt-1">
                    Last stream broadcast: {formatDateTime(adminStatusQuery.data?.intelligenceStream.lastBroadcastAt ?? null)}
                  </p>
                  <p className="mt-1">
                    Cache TTL: {adminStatusQuery.data?.intelligenceCache.ttlMs ?? "--"} ms
                  </p>
                </div>

                {adminMessage ? (
                  <p className="mt-4 rounded-[1.5rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80">
                    {adminMessage}
                  </p>
                ) : null}
              </section>
            ) : null}
          </div>

          <section className="rounded-[2rem] border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/72">
                  Replay history
                </p>
                <h2 className="mt-2 font-display text-3xl text-white">
                  Local and account-linked replays
                </h2>
              </div>
              {!accessToken ? (
                <button
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:border-white/25 hover:text-white"
                  onClick={() => setAuthOpen(true)}
                  type="button"
                >
                  Open auth
                </button>
              ) : null}
            </div>

            {historyQuery.isLoading ? (
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-5 text-white/60">
                Loading account history...
              </div>
            ) : (
              <HistoryList items={combinedHistory} />
            )}
          </section>
        </section>
      </div>

      <AuthModal onClose={() => setAuthOpen(false)} open={authOpen} />
    </div>
  );
}
