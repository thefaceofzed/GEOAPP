import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { PageTransition } from "../components/PageTransition";
import { WatchlistPanel } from "../features/planet/WatchlistPanel";
import { WatchlistIntelligenceBoard } from "../features/planet/WatchlistIntelligenceBoard";
import { useWatchlistSync } from "../hooks/useWatchlistSync";
import { usePlanetStore } from "../store/planetStore";
import { countryByCca3 } from "../features/planet/planetData";
import type { WatchlistItem } from "../features/planet/types";

const BriefingViewer = lazy(() => import("../features/planet/BriefingViewer").then((m) => ({ default: m.BriefingViewer })));
const ExposureMapper = lazy(() => import("../features/planet/ExposureMapper").then((m) => ({ default: m.ExposureMapper })));

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

export function BriefingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const selectedCountryCode3 = usePlanetStore((s) => s.selectedCountryCode3);
  const selectedActionKey = usePlanetStore((s) => s.selectedActionKey);
  const activeSimulation = usePlanetStore((s) => s.activeSimulation);
  const watchlist = usePlanetStore((s) => s.watchlist);
  const setExperienceMode = usePlanetStore((s) => s.setExperienceMode);
  const setSelectedCountry = usePlanetStore((s) => s.setSelectedCountry);
  const setSelectedAction = usePlanetStore((s) => s.setSelectedAction);
  const setActiveSimulation = usePlanetStore((s) => s.setActiveSimulation);
  const { removeWatchlistItem } = useWatchlistSync();

  const selectedCountry = selectedCountryCode3
    ? countryByCca3.get(selectedCountryCode3) ?? null
    : null;

  function handleActivateWatchItem(item: WatchlistItem) {
    setSelectedCountry(item.countryCode3);
    setSelectedAction(item.actionKey);
    setExperienceMode(item.mode);
    setActiveSimulation(null);
    navigate("/app");
  }

  return (
    <PageTransition>
      <div className="space-y-5">
        <div className="rounded-panel border border-b-default bg-surface p-5 backdrop-blur-panel shadow-panel transition-colors animate-panel-enter">
          <div className="flex items-center gap-3 mb-3">
            <span className="h-px w-6 bg-accent" />
            <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono font-medium">{t("briefings.title")}</p>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-t-primary italic leading-tight">
            {t("briefings.headline")}
          </h1>
          <p className="mt-2 text-sm text-t-secondary max-w-3xl leading-relaxed">
            {t("briefings.description")}
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <Suspense fallback={<PanelSkeleton title={t("briefings.decision_briefing")} />}>
            <BriefingViewer
              countryCode={selectedCountry?.cca2 ?? null}
              countryName={selectedCountry?.name ?? null}
              actionKey={selectedActionKey}
              scenarioId={activeSimulation?.simulationId ?? null}
            />
          </Suspense>

          <Suspense fallback={<PanelSkeleton title={t("briefings.exposure_analysis")} />}>
            <ExposureMapper
              scenarioId={activeSimulation?.simulationId ?? null}
              simulation={activeSimulation}
            />
          </Suspense>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <WatchlistPanel
            emptyMessage={t("watchlist.empty")}
            items={watchlist}
            onActivate={handleActivateWatchItem}
            onRemove={(id) => {
              const item = watchlist.find((entry) => entry.id === id);
              if (item) void removeWatchlistItem(item);
            }}
            subtitle={t("watchlist.subtitle")}
            title={t("watchlist.title")}
          />

          <WatchlistIntelligenceBoard
            items={watchlist}
            onActivate={handleActivateWatchItem}
          />
        </div>
      </div>
    </PageTransition>
  );
}
