import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { PageTransition } from "../components/PageTransition";
import { PriceTicker } from "../components/PriceTicker";
import { DecisionSupportPanel } from "../features/planet/DecisionSupportPanel";
import { buildComparisonItem } from "../features/planet/comparison";
import { PlanetGlobe } from "../features/planet/PlanetGlobe";
import {
  createPlanetSimulationFromBackend,
  restoreLocalReplay,
} from "../features/planet/impactEngine";
import { countryByCca3 } from "../features/planet/planetData";
import { decodeReplayState } from "../features/planet/replayCodec";
import { fetchReplay } from "../services/simulationService";
import { usePlanetStore } from "../store/planetStore";

export function ReplayPage() {
  const { t } = useTranslation();
  const params = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const upsertComparisonItem = usePlanetStore((state) => state.upsertComparisonItem);
  const hasComparisonItem = usePlanetStore((state) => state.hasComparisonItem);

  const localReplay = useMemo(
    () => decodeReplayState(searchParams.get("state")),
    [searchParams],
  );

  const replayQuery = useQuery({
    queryKey: ["replay", params.token],
    queryFn: () => fetchReplay(params.token ?? ""),
    enabled: Boolean(params.token) && !localReplay,
  });

  const replay = useMemo(() => {
    if (localReplay) return restoreLocalReplay(localReplay);
    if (!replayQuery.data) return null;
    return createPlanetSimulationFromBackend(replayQuery.data);
  }, [localReplay, replayQuery.data]);

  const replayCountry = replay ? countryByCca3.get(replay.countryCode3) ?? null : null;

  async function copyReplayLink() {
    await navigator.clipboard.writeText(window.location.href);
  }

  function handleAddToCompare() {
    if (!replay) return;
    upsertComparisonItem(buildComparisonItem(replay, replayQuery.data ?? null));
  }

  if (!localReplay && replayQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="rounded-panel border border-b-default bg-surface px-6 py-5 backdrop-blur-panel text-t-primary shadow-panel font-mono">
          {t("replay.loading")}
        </div>
      </div>
    );
  }

  if (replayQuery.isError || !replay) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div className="rounded-panel border border-sig-danger/20 bg-red-500/8 px-6 py-8 text-sig-danger shadow-panel">
            {t("replay.not_found")}
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-5">
        <section className="grid gap-5 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="space-y-4">
            <div className="rounded-panel border border-b-default bg-surface p-5 backdrop-blur-panel shadow-panel transition-colors animate-panel-enter">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="h-px w-6 bg-accent" />
                    <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono font-medium">{t("replay.surface")}</p>
                  </div>
                  <h1 className="font-display text-3xl sm:text-4xl font-semibold text-t-primary italic leading-tight">
                    {replay.narrative.headline}
                  </h1>
                </div>
                <div className="rounded-btn border border-b-subtle px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] font-mono text-t-tertiary">
                  {replay.mode === "persisted" ? t("replay.persisted") : t("replay.encoded")}
                </div>
              </div>
              <p className="mt-3 max-w-4xl text-base text-t-secondary leading-relaxed">
                {replay.narrative.summary}
              </p>
            </div>

            <PlanetGlobe
              className="h-[45vh] sm:h-[55vh] lg:h-[calc(100vh-16rem)]"
              interactive={false}
              hoveredCountryCode3={null}
              selectedCountryCode3={replay.countryCode3}
              simulation={replay}
            />

            <section className="rounded-panel border border-b-default bg-surface p-5 backdrop-blur-panel shadow-panel transition-colors animate-panel-enter stagger-2">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono font-medium">Market tape</p>
                  <h2 className="mt-1.5 font-display text-xl font-semibold text-t-primary italic">{t("replay.asset_stream")}</h2>
                </div>
                <button
                  className="rounded-btn border border-b-subtle px-4 py-2 text-[10px] uppercase tracking-[0.25em] font-mono text-t-secondary transition hover:border-accent/40 hover:text-accent"
                  onClick={copyReplayLink}
                  type="button"
                >
                  {t("replay.copy_link")}
                </button>
              </div>
              <PriceTicker assets={replay.assets} />
            </section>

            <DecisionSupportPanel
              alreadyCompared={hasComparisonItem(replay.simulationId ?? replay.id)}
              forecast={null}
              mode="simulate"
              observed={null}
              onAddToCompare={handleAddToCompare}
              selectedActionKey={replay.actionKey}
              selectedCountry={replayCountry}
              simulation={replay}
              simulationView={replayQuery.data ?? null}
            />
          </div>

          <aside className="space-y-4 rounded-panel border border-b-default bg-surface p-5 backdrop-blur-panel lg:sticky lg:top-6 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto shadow-panel transition-colors animate-panel-enter stagger-1">
            <section className="rounded-card border border-b-subtle bg-surface-alt p-4 shadow-card">
              <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono font-medium">{t("replay.summary")}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-card border border-b-subtle bg-surface-raised p-3 shadow-raised">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-t-tertiary font-mono">{t("replay.country")}</p>
                  <p className="mt-2 text-sm text-t-primary">{replay.countryName}</p>
                </div>
                <div className="rounded-card border border-b-subtle bg-surface-raised p-3 shadow-raised">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-t-tertiary font-mono">{t("common.severity")}</p>
                  <p className="mt-2 text-sm text-t-primary font-mono tabular-nums">{replay.severityScore}/100</p>
                </div>
              </div>
            </section>

            <section className="rounded-card border border-b-subtle bg-surface-alt p-4 shadow-card">
              <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono font-medium">{t("replay.impact_list")}</p>
              <div className="mt-4 space-y-3">
                {replay.impacts.slice(0, 8).map((impact) => (
                  <div className="rounded-card border border-b-subtle bg-surface-raised p-3 shadow-raised" key={impact.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-t-primary">{impact.countryName}</p>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-t-tertiary font-mono">{impact.label}</span>
                    </div>
                    <p className="mt-2 text-sm text-t-secondary">{impact.detail}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                className="rounded-btn bg-accent px-4 py-3 text-center text-[11px] uppercase tracking-[0.2em] font-mono font-semibold text-white dark:text-[#080b12] transition hover:brightness-110 hover:shadow-glow-accent"
                to="/app"
              >
                {t("replay.open_simulator")}
              </Link>
              <Link
                className="rounded-btn border border-b-subtle px-4 py-3 text-center text-[11px] uppercase tracking-[0.2em] font-mono text-t-secondary transition hover:border-accent/40 hover:text-accent"
                to="/account"
              >
                {t("replay.view_account")}
              </Link>
            </div>
          </aside>
        </section>
      </div>
    </PageTransition>
  );
}
