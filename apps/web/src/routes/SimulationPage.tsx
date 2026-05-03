import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { PageTransition } from "../components/PageTransition";
import { PriceTicker } from "../components/PriceTicker";
import { PlanetControlPanel } from "../features/planet/PlanetControlPanel";
import { PlanetGlobe } from "../features/planet/PlanetGlobe";
import { ScenarioTemplateRail } from "../features/planet/ScenarioTemplateRail";
import { buildComparisonItem } from "../features/planet/comparison";
import {
  buildReplayHistoryItem,
  createForecastPlanetView,
  createObservedPlanetView,
  createPlanetSimulation,
  createPlanetSimulationFromBackend,
} from "../features/planet/impactEngine";
import { actionByKey } from "../features/planet/planetCatalog";
import { countryByCca3, findCountryByCode } from "../features/planet/planetData";
import type { ScenarioTemplateDefinition, WatchlistItem } from "../features/planet/types";
import { useIntelligenceStream } from "../hooks/useIntelligenceStream";
import { useWatchlistSync } from "../hooks/useWatchlistSync";
import { createGuestSession, logout } from "../services/authService";
import {
  createSimulation,
  fetchIntelligencePosture,
  fetchForecast,
  fetchObservedSignals,
} from "../services/simulationService";
import { usePlanetStore } from "../store/planetStore";
import { useSessionStore } from "../store/sessionStore";
import type { SimulationView } from "../lib/types";

export function SimulationPage() {
  const navigate = useNavigate();
  const profile = useSessionStore((state) => state.profile);
  const accessToken = useSessionStore((state) => state.accessToken);
  const setSession = useSessionStore((state) => state.setSession);
  const setProfile = useSessionStore((state) => state.setProfile);
  const clearSession = useSessionStore((state) => state.clearSession);

  const experienceMode = usePlanetStore((state) => state.experienceMode);
  const selectedCountryCode3 = usePlanetStore((state) => state.selectedCountryCode3);
  const hoveredCountryCode3 = usePlanetStore((state) => state.hoveredCountryCode3);
  const selectedActionKey = usePlanetStore((state) => state.selectedActionKey);
  const activeSimulation = usePlanetStore((state) => state.activeSimulation);
  const setExperienceMode = usePlanetStore((state) => state.setExperienceMode);
  const setSelectedCountry = usePlanetStore((state) => state.setSelectedCountry);
  const setHoveredCountry = usePlanetStore((state) => state.setHoveredCountry);
  const setSelectedAction = usePlanetStore((state) => state.setSelectedAction);
  const setActiveSimulation = usePlanetStore((state) => state.setActiveSimulation);
  const pushHistory = usePlanetStore((state) => state.pushHistory);
  const watchlist = usePlanetStore((state) => state.watchlist);
  const upsertComparisonItem = usePlanetStore((state) => state.upsertComparisonItem);
  const hasComparisonItem = usePlanetStore((state) => state.hasComparisonItem);
  const isWatched = usePlanetStore((state) => state.isWatched);
  const quotaSnapshot = usePlanetStore((state) => state.quotaSnapshot);
  const consumeQuota = usePlanetStore((state) => state.consumeQuota);
  const { saveWatchlistItem, removeWatchlistItem } = useWatchlistSync();

  const selectedCountry = selectedCountryCode3
    ? countryByCca3.get(selectedCountryCode3) ?? null
    : null;
  const quota = quotaSnapshot(profile);

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

  const [busy, setBusy] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeSimulationView, setActiveSimulationView] = useState<SimulationView | null>(null);

  useEffect(() => {
    if (selectedCountry) setSearchValue(selectedCountry.name);
  }, [selectedCountry?.cca3]);

  const intelligenceStream = useIntelligenceStream(
    selectedCountry?.cca2 ?? null,
    selectedActionKey,
    Boolean(selectedCountry) && experienceMode !== "simulate",
  );

  const liveObserved = intelligenceStream.observed ?? observedQuery.data ?? null;
  const liveForecast = intelligenceStream.forecast ?? forecastQuery.data ?? null;

  const globeScenario = useMemo(() => {
    if (!selectedCountry) return activeSimulation;
    if (experienceMode === "simulate") return activeSimulation;
    if (experienceMode === "observed" && liveObserved)
      return createObservedPlanetView(selectedCountry, selectedActionKey, liveObserved);
    if (experienceMode === "forecast" && liveForecast)
      return createForecastPlanetView(selectedCountry, selectedActionKey, liveForecast);
    return null;
  }, [activeSimulation, experienceMode, liveForecast, liveObserved, selectedActionKey, selectedCountry]);

  async function ensureGuestSession() {
    if (accessToken) return;
    try {
      const session = await createGuestSession();
      setSession(session);
    } catch { /* local sim fallback */ }
  }

  async function runBackendSimulation() {
    if (!selectedCountry) throw new Error("Select a country on the planet before launching a scenario.");
    const action = actionByKey.get(selectedActionKey);
    return createSimulation({
      countryCode: selectedCountry.cca2,
      actionKey: selectedActionKey,
      durationHours: action?.durationHours ?? 72,
      allyCodes: [],
    });
  }

  async function handleRunSimulation() {
    if (!selectedCountry) {
      setStatusMessage("Select a country on the planet before launching a scenario.");
      return;
    }
    try {
      setBusy(true);
      setStatusMessage(null);
      await ensureGuestSession();
      let backendView;
      try {
        backendView = await runBackendSimulation();
      } catch (error: any) {
        if (error?.response?.status === 401) {
          clearSession();
          const session = await createGuestSession();
          setSession(session);
          backendView = await runBackendSimulation();
        } else throw error;
      }
      const simulation =
        createPlanetSimulationFromBackend(backendView) ??
        createPlanetSimulation(selectedCountry, selectedActionKey, {
          simulationsRemaining: backendView.simulationsRemaining,
          unlimited: backendView.unlimited,
        });
      setExperienceMode("simulate");
      setActiveSimulation(simulation);
      setActiveSimulationView(backendView);
      pushHistory(buildReplayHistoryItem(simulation));
      const currentProfile = useSessionStore.getState().profile;
      if (currentProfile)
        setProfile({ ...currentProfile, simulationsRemaining: backendView.simulationsRemaining, unlimited: backendView.unlimited });
    } catch (error: any) {
      const backendMessage = error?.response?.data?.message ?? error?.message ?? "The simulation engine could not complete this run.";
      if (/quota exhausted/i.test(backendMessage)) return;
      if (!error?.response) {
        try {
          const nextQuota = consumeQuota(profile);
          const simulation = createPlanetSimulation(selectedCountry, selectedActionKey, nextQuota);
          setExperienceMode("simulate");
          setActiveSimulation(simulation);
          setActiveSimulationView(null);
          pushHistory(buildReplayHistoryItem(simulation));
          const currentProfile = useSessionStore.getState().profile;
          if (currentProfile)
            setProfile({ ...currentProfile, simulationsRemaining: nextQuota.simulationsRemaining, unlimited: nextQuota.unlimited });
          setStatusMessage("Backend unavailable. Ran a local preview instead.");
        } catch (localError: any) {
          if (/quota exhausted/i.test(localError?.message ?? "")) return;
          setStatusMessage(localError?.message ?? "The local preview engine could not complete this run.");
        }
        return;
      }
      setStatusMessage(backendMessage);
    } finally {
      setBusy(false);
    }
  }

  function handleSearchConfirm() {
    const country = findCountryByCode(searchValue);
    if (!country) {
      setStatusMessage("Country not found. Try an official name or country code.");
      return;
    }
    setSelectedCountry(country.cca3);
    setStatusMessage(null);
  }

  function handleSelectTemplate(template: ScenarioTemplateDefinition) {
    setSelectedCountry(template.countryCode3);
    setSelectedAction(template.actionKey);
    setExperienceMode(template.mode);
    setActiveSimulation(null);
    setActiveSimulationView(null);
    setStatusMessage(`${template.title} loaded into ${template.mode} mode.`);
  }

  async function handleToggleWatchlist() {
    if (!selectedCountry) { setStatusMessage("Select a country before saving a watch item."); return; }
    const existingItem = watchlist.find(
      (item) => item.countryCode3 === selectedCountry.cca3 && item.actionKey === selectedActionKey,
    );
    if (isWatched(selectedCountry.cca3, selectedActionKey)) {
      if (!existingItem) return;
      try {
        await removeWatchlistItem(existingItem);
        setStatusMessage(`${selectedCountry.name} removed from your watchlist.`);
      } catch { setStatusMessage("Unable to sync the watchlist removal right now."); }
      return;
    }
    try {
      await saveWatchlistItem({
        countryCode: selectedCountry.cca2,
        countryCode3: selectedCountry.cca3,
        countryName: selectedCountry.name,
        actionKey: selectedActionKey,
        actionLabel: actionByKey.get(selectedActionKey)?.label ?? selectedActionKey,
        mode: experienceMode,
      });
      setStatusMessage(`${selectedCountry.name} saved to your watchlist.`);
    } catch { setStatusMessage("Saved locally, but the remote watchlist sync failed."); }
  }

  async function handleCopyReplay() {
    if (!activeSimulation) return;
    const replayUrl = new URL(activeSimulation.replayUrl, window.location.origin).toString();
    await navigator.clipboard.writeText(replayUrl);
    setStatusMessage("Replay link copied to the clipboard.");
  }

  function handleOpenReplay() {
    if (!activeSimulation) return;
    window.location.assign(activeSimulation.replayUrl);
  }

  const headline = globeScenario
    ? globeScenario.narrative.headline
    : selectedCountry
      ? experienceMode === "observed"
        ? `Observed signals around ${selectedCountry.name}`
        : experienceMode === "forecast"
          ? `Forecast risk for ${selectedCountry.name}`
          : `Ready to simulate ${selectedCountry.name}`
      : "Select any country to begin";
  const copy = globeScenario
    ? globeScenario.narrative.summary
    : experienceMode === "observed"
      ? "The globe is showing live signal stress only."
      : experienceMode === "forecast"
        ? "The globe is showing an explainable risk projection."
        : "Click any country on the globe to start building a scenario.";

  return (
    <PageTransition>
      <div className="space-y-5">
        <ScenarioTemplateRail onSelectTemplate={handleSelectTemplate} />

        <section className="grid gap-5 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="space-y-4">
            <div className="rounded-panel border border-b-default bg-surface p-5 backdrop-blur-panel shadow-panel transition-colors duration-300 animate-panel-enter">
              <div className="flex items-center gap-3 mb-3">
                <span className="h-px w-6 bg-accent" />
                <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono font-medium">
                  Command surface
                </p>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-semibold text-t-primary italic leading-tight">
                {headline}
              </h1>
              <p className="mt-2 max-w-4xl text-sm text-t-secondary leading-relaxed">{copy}</p>
            </div>

            <PlanetGlobe
              className="h-[45vh] sm:h-[55vh] lg:h-[calc(100vh-16rem)]"
              hoveredCountryCode3={hoveredCountryCode3}
              onHoverCountry={setHoveredCountry}
              onSelectCountry={setSelectedCountry}
              selectedCountryCode3={selectedCountryCode3}
              simulation={globeScenario}
            />

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-panel border border-b-default bg-surface p-4 backdrop-blur-panel transition-colors shadow-panel">
                <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono font-medium">Planet behavior</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-card border border-b-subtle bg-surface-alt p-3 shadow-raised">
                    <p className="text-xs text-t-tertiary">Selection</p>
                    <p className="mt-1.5 text-base text-t-primary font-medium">{selectedCountry?.name ?? "No country selected"}</p>
                  </div>
                  <div className="rounded-card border border-b-subtle bg-surface-alt p-3 shadow-raised">
                    <p className="text-xs text-t-tertiary">Propagation zone</p>
                    <p className="mt-1.5 text-base text-t-primary font-medium">{globeScenario ? `${globeScenario.impacts.length} countries` : "Waiting"}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-panel border border-b-default bg-surface p-4 backdrop-blur-panel transition-colors shadow-panel">
                <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono font-medium">Color meaning</p>
                <div className="mt-3 grid gap-2 text-sm text-t-secondary sm:grid-cols-2">
                  {[
                    ["#ff5e5b", "Red = severe negative"],
                    ["#ff9a3d", "Orange = medium negative"],
                    ["#ffe16b", "Yellow = warning"],
                    ["#59d97d", "Green = beneficial"],
                  ].map(([color, label]) => (
                    <div className="flex items-center gap-2.5 rounded-btn border border-b-subtle bg-surface-alt px-3 py-2" key={label}>
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-xs">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <section className="rounded-panel border border-b-default bg-surface p-4 backdrop-blur-panel transition-colors shadow-panel">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono font-medium">Market tape</p>
                  <h2 className="mt-1.5 font-display text-xl font-semibold text-t-primary italic">Asset reaction stream</h2>
                </div>
                {globeScenario && (
                  <span className="rounded-full border border-b-default px-3 py-1 text-xs uppercase tracking-widest text-t-tertiary">
                    {experienceMode === "simulate" ? "Replay ready" : experienceMode}
                  </span>
                )}
              </div>
              <PriceTicker assets={globeScenario?.assets ?? []} />
            </section>
          </div>

          <PlanetControlPanel
            busy={busy}
            experienceMode={experienceMode}
            forecast={liveForecast}
            forecastLoading={forecastQuery.isFetching && !liveForecast}
            observed={liveObserved}
            observedLoading={observedQuery.isFetching && !liveObserved}
            onModeChange={setExperienceMode}
            onCopyReplay={handleCopyReplay}
            onOpenReplay={handleOpenReplay}
            onRunSimulation={handleRunSimulation}
            onSearchChange={setSearchValue}
            onSearchConfirm={handleSearchConfirm}
            onSelectAction={setSelectedAction}
            profile={profile}
            quota={quota}
            searchValue={searchValue}
            selectedActionKey={selectedActionKey}
            selectedCountry={selectedCountry}
            simulation={activeSimulation}
            streamState={intelligenceStream.state}
            statusMessage={statusMessage}
            watchingSelection={isWatched(selectedCountry?.cca3 ?? null, selectedActionKey)}
            onToggleWatchlist={handleToggleWatchlist}
          />
        </section>
      </div>
    </PageTransition>
  );
}
