import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { PageTransition } from "../components/PageTransition";
import { IntelligenceCommandCenter } from "../features/planet/IntelligenceCommandCenter";
import { buildComparisonItem } from "../features/planet/comparison";
import {
  createObservedPlanetView,
  createForecastPlanetView,
} from "../features/planet/impactEngine";
import { countryByCca3 } from "../features/planet/planetData";
import { useIntelligenceStream } from "../hooks/useIntelligenceStream";
import {
  fetchIntelligencePosture,
  fetchForecast,
  fetchObservedSignals,
} from "../services/simulationService";
import { usePlanetStore } from "../store/planetStore";
import { useSessionStore } from "../store/sessionStore";

const CiiHeatmapPanel = lazy(() => import("../features/planet/CiiHeatmapPanel").then((m) => ({ default: m.CiiHeatmapPanel })));
const SignalFeedPanel = lazy(() => import("../features/planet/SignalFeedPanel").then((m) => ({ default: m.SignalFeedPanel })));
const CorrelationAlertsPanel = lazy(() => import("../features/planet/CorrelationAlertsPanel").then((m) => ({ default: m.CorrelationAlertsPanel })));
const DecisionSupportPanel = lazy(() => import("../features/planet/DecisionSupportPanel").then((m) => ({ default: m.DecisionSupportPanel })));

function PanelSkeleton({ title }: { title: string }) {
  return (
    <div className="rounded-panel border border-b-default bg-surface p-5 backdrop-blur-panel animate-pulse transition-colors shadow-panel">
      <p className="text-xs uppercase tracking-[0.35em] text-accent/40">{title}</p>
      <div className="mt-4 space-y-3">
        <div className="h-4 w-3/4 rounded bg-surface-alt" />
        <div className="h-4 w-1/2 rounded bg-surface-alt" />
        <div className="h-20 rounded-card bg-surface-alt" />
      </div>
    </div>
  );
}

export function IntelligencePage() {
  const { t } = useTranslation();
  const profile = useSessionStore((s) => s.profile);
  const selectedCountryCode3 = usePlanetStore((s) => s.selectedCountryCode3);
  const selectedActionKey = usePlanetStore((s) => s.selectedActionKey);
  const experienceMode = usePlanetStore((s) => s.experienceMode);
  const activeSimulation = usePlanetStore((s) => s.activeSimulation);
  const setExperienceMode = usePlanetStore((s) => s.setExperienceMode);
  const setSelectedCountry = usePlanetStore((s) => s.setSelectedCountry);
  const isWatched = usePlanetStore((s) => s.isWatched);
  const hasComparisonItem = usePlanetStore((s) => s.hasComparisonItem);
  const upsertComparisonItem = usePlanetStore((s) => s.upsertComparisonItem);

  const selectedCountry = selectedCountryCode3
    ? countryByCca3.get(selectedCountryCode3) ?? null
    : null;

  const observedQuery = useQuery({
    queryKey: ["observed-signals", selectedCountry?.cca2, selectedActionKey],
    queryFn: () => fetchObservedSignals(selectedCountry!.cca2, selectedActionKey, 8),
    enabled: Boolean(selectedCountry),
    staleTime: 60_000,
  });

  const forecastQuery = useQuery({
    queryKey: ["forecast-view", selectedCountry?.cca2, selectedActionKey],
    queryFn: () => fetchForecast(selectedCountry!.cca2, selectedActionKey, 30),
    enabled: Boolean(selectedCountry),
    staleTime: 60_000,
  });

  const postureQuery = useQuery({
    queryKey: ["intelligence-posture", selectedCountry?.cca2, selectedActionKey],
    queryFn: () => fetchIntelligencePosture(selectedCountry!.cca2, selectedActionKey, 8, 30),
    enabled: Boolean(selectedCountry),
    staleTime: 60_000,
  });

  const intelligenceStream = useIntelligenceStream(
    selectedCountry?.cca2 ?? null,
    selectedActionKey,
    Boolean(selectedCountry) && experienceMode !== "simulate",
  );

  const liveObserved = intelligenceStream.observed ?? observedQuery.data ?? postureQuery.data?.observed ?? null;
  const liveForecast = intelligenceStream.forecast ?? forecastQuery.data ?? postureQuery.data?.forecast ?? null;

  return (
    <PageTransition>
      <div className="space-y-5">
        <div className="rounded-panel border border-b-default bg-surface p-5 backdrop-blur-panel transition-colors shadow-panel">
          <div className="flex items-center gap-3 mb-3">
            <span className="h-px w-6 bg-accent" />
            <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono font-medium">{t("intelligence.dashboard")}</p>
            <span className="live-dot text-[10px] text-sig-live font-mono ml-auto">{t("intelligence.live")}</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-t-primary italic leading-tight">
            {selectedCountry ? t("intelligence.risk_analysis", { country: selectedCountry.name }) : t("intelligence.global_overview")}
          </h1>
          <p className="mt-2 text-sm text-t-secondary max-w-3xl leading-relaxed">
            {t("intelligence.description")}
          </p>
        </div>

        <IntelligenceCommandCenter
          alreadyCompared={hasComparisonItem(activeSimulation?.simulationId ?? activeSimulation?.id ?? null)}
          busy={false}
          forecast={liveForecast}
          mode={experienceMode}
          observed={liveObserved}
          onAddToCompare={() => {
            if (activeSimulation) upsertComparisonItem(buildComparisonItem(activeSimulation, null));
          }}
          onModeChange={setExperienceMode}
          onRunSimulation={() => {}}
          onToggleWatchlist={() => {}}
          posture={postureQuery.data ?? null}
          selectedActionKey={selectedActionKey}
          selectedCountry={selectedCountry}
          simulation={activeSimulation}
          simulationView={null}
          streamState={intelligenceStream.state}
          watchingSelection={isWatched(selectedCountry?.cca3 ?? null, selectedActionKey)}
        />

        <Suspense fallback={<PanelSkeleton title={t("intelligence.cii_heatmap")} />}>
          <CiiHeatmapPanel onSelectCountry={setSelectedCountry} />
        </Suspense>

        <div className="grid gap-4 lg:grid-cols-2">
          <Suspense fallback={<PanelSkeleton title={t("intelligence.signal_feed")} />}>
            <SignalFeedPanel selectedCountryCode={selectedCountry?.cca2 ?? null} />
          </Suspense>
          <Suspense fallback={<PanelSkeleton title={t("intelligence.correlations")} />}>
            <CorrelationAlertsPanel />
          </Suspense>
        </div>

        <Suspense fallback={<PanelSkeleton title="Decision Support" />}>
          <DecisionSupportPanel
            alreadyCompared={hasComparisonItem(activeSimulation?.simulationId ?? activeSimulation?.id ?? null)}
            forecast={liveForecast}
            mode={experienceMode}
            observed={liveObserved}
            onAddToCompare={() => {
              if (activeSimulation) upsertComparisonItem(buildComparisonItem(activeSimulation, null));
            }}
            selectedActionKey={selectedActionKey}
            selectedCountry={selectedCountry}
            simulation={activeSimulation}
            simulationView={null}
          />
        </Suspense>
      </div>
    </PageTransition>
  );
}
