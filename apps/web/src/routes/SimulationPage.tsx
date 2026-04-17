import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AuthModal } from "../components/AuthModal";
import { PaywallModal } from "../components/PaywallModal";
import { PriceTicker } from "../components/PriceTicker";
import { TopBar } from "../components/TopBar";
import { PlanetControlPanel } from "../features/planet/PlanetControlPanel";
import { PlanetGlobe } from "../features/planet/PlanetGlobe";
import {
  buildReplayHistoryItem,
  createForecastPlanetView,
  createObservedPlanetView,
  createPlanetSimulation,
  createPlanetSimulationFromBackend,
} from "../features/planet/impactEngine";
import { actionByKey } from "../features/planet/planetCatalog";
import { countryByCca3, findCountryByCode } from "../features/planet/planetData";
import { useIntelligenceStream } from "../hooks/useIntelligenceStream";
import { createGuestSession, logout } from "../services/authService";
import {
  createSimulation,
  fetchForecast,
  fetchObservedSignals,
} from "../services/simulationService";
import { usePlanetStore } from "../store/planetStore";
import { useSessionStore } from "../store/sessionStore";

export function SimulationPage() {
  const navigate = useNavigate();
  const profile = useSessionStore((state) => state.profile);
  const accessToken = useSessionStore((state) => state.accessToken);
  const bootstrapStatus = useSessionStore((state) => state.bootstrapStatus);
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
  const quotaSnapshot = usePlanetStore((state) => state.quotaSnapshot);
  const consumeQuota = usePlanetStore((state) => state.consumeQuota);

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

  const [authOpen, setAuthOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCountry) {
      setSearchValue(selectedCountry.name);
    }
  }, [selectedCountry?.cca3]);

  const intelligenceStream = useIntelligenceStream(
    selectedCountry?.cca2 ?? null,
    selectedActionKey,
    Boolean(selectedCountry) && experienceMode !== "simulate",
  );

  const liveObserved = intelligenceStream.observed ?? observedQuery.data ?? null;
  const liveForecast = intelligenceStream.forecast ?? forecastQuery.data ?? null;

  const globeScenario = useMemo(() => {
    if (!selectedCountry) {
      return activeSimulation;
    }
    if (experienceMode === "simulate") {
      return activeSimulation;
    }
    if (experienceMode === "observed" && liveObserved) {
      return createObservedPlanetView(selectedCountry, selectedActionKey, liveObserved);
    }
    if (experienceMode === "forecast" && liveForecast) {
      return createForecastPlanetView(selectedCountry, selectedActionKey, liveForecast);
    }
    return null;
  }, [
    activeSimulation,
    experienceMode,
    liveForecast,
    liveObserved,
    selectedActionKey,
    selectedCountry,
  ]);

  async function ensureGuestSession() {
    if (accessToken) {
      return;
    }

    try {
      const session = await createGuestSession();
      setSession(session);
    } catch {
      // The frontend simulation engine can still run locally.
    }
  }

  async function runBackendSimulation() {
    if (!selectedCountry) {
      throw new Error("Select a country on the planet before launching a scenario.");
    }

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
        } else {
          throw error;
        }
      }

      const simulation =
        createPlanetSimulationFromBackend(backendView) ??
        createPlanetSimulation(selectedCountry, selectedActionKey, {
          simulationsRemaining: backendView.simulationsRemaining,
          unlimited: backendView.unlimited,
        });

      setExperienceMode("simulate");
      setActiveSimulation(simulation);
      pushHistory(buildReplayHistoryItem(simulation));

      const currentProfile = useSessionStore.getState().profile;
      if (currentProfile) {
        setProfile({
          ...currentProfile,
          simulationsRemaining: backendView.simulationsRemaining,
          unlimited: backendView.unlimited,
        });
      }
    } catch (error: any) {
      const backendMessage =
        error?.response?.data?.message ??
        error?.message ??
        "The simulation engine could not complete this run.";

      if (/quota exhausted/i.test(backendMessage)) {
        setPaywallOpen(true);
        return;
      }

      if (!error?.response) {
        try {
          const nextQuota = consumeQuota(profile);
          const simulation = createPlanetSimulation(
            selectedCountry,
            selectedActionKey,
            nextQuota,
          );
          setExperienceMode("simulate");
          setActiveSimulation(simulation);
          pushHistory(buildReplayHistoryItem(simulation));

          const currentProfile = useSessionStore.getState().profile;
          if (currentProfile) {
            setProfile({
              ...currentProfile,
              simulationsRemaining: nextQuota.simulationsRemaining,
              unlimited: nextQuota.unlimited,
            });
          }
          setStatusMessage("Backend unavailable. Ran a local preview instead.");
        } catch (localError: any) {
          if (/quota exhausted/i.test(localError?.message ?? "")) {
            setPaywallOpen(true);
            return;
          }

          setStatusMessage(
            localError?.message ?? "The local preview engine could not complete this run.",
          );
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

  async function handleCopyReplay() {
    if (!activeSimulation) {
      return;
    }

    const replayUrl = new URL(activeSimulation.replayUrl, window.location.origin).toString();
    await navigator.clipboard.writeText(replayUrl);
    setStatusMessage("Replay link copied to the clipboard.");
  }

  function handleOpenReplay() {
    if (!activeSimulation) {
      return;
    }

    window.location.assign(activeSimulation.replayUrl);
  }

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Local state clear is enough for the UI.
    }
    clearSession();
    navigate("/");
  }

  if (bootstrapStatus !== "ready" && !accessToken) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-white">
        <div className="rounded-[2rem] border border-white/10 bg-black/25 px-6 py-5 backdrop-blur">
          Restoring access...
        </div>
      </div>
    );
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
      ? "The globe is showing live signal stress only. Nothing here is a synthetic scenario outcome."
      : experienceMode === "forecast"
        ? "The globe is showing an explainable risk projection built from recent live signals."
        : "The globe is the primary interface. Country overlays, arcs, and labels appear directly on the surface after each run.";

  return (
    <div className="min-h-screen px-4 py-5 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <TopBar
          onAuthOpen={() => setAuthOpen(true)}
          onLogout={handleLogout}
          profile={profile}
        />

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-4">
            <div className="rounded-[2rem] border border-white/10 bg-black/28 p-5 backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/72">
                Live scenario surface
              </p>
              <h1 className="mt-3 font-display text-4xl text-white sm:text-5xl">
                {headline}
              </h1>
              <p className="mt-3 max-w-4xl text-base text-white/68">{copy}</p>
            </div>

            <PlanetGlobe
              className="h-[62vh] lg:h-[calc(100vh-19rem)]"
              hoveredCountryCode3={hoveredCountryCode3}
              onHoverCountry={setHoveredCountry}
              onSelectCountry={setSelectedCountry}
              selectedCountryCode3={selectedCountryCode3}
              simulation={globeScenario}
            />

            <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
              <div className="rounded-[1.8rem] border border-white/10 bg-black/30 p-5 backdrop-blur-lg">
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/72">
                  Planet behavior
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-white/50">Selection</p>
                    <p className="mt-2 text-lg text-white">
                      {selectedCountry?.name ?? "No country selected"}
                    </p>
                  </div>
                  <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-white/50">Propagation zone</p>
                    <p className="mt-2 text-lg text-white">
                      {globeScenario ? `${globeScenario.impacts.length} countries` : "Waiting"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.8rem] border border-white/10 bg-black/30 p-5 backdrop-blur-lg">
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/72">
                  Color meaning
                </p>
                <div className="mt-4 grid gap-3 text-sm text-white/72 sm:grid-cols-2">
                  {[
                    ["#ff5e5b", "Red = severe negative impact"],
                    ["#ff9a3d", "Orange = medium negative impact"],
                    ["#ffe16b", "Yellow = warning / moderate effect"],
                    ["#59d97d", "Green = positive / beneficial effect"],
                  ].map(([color, label]) => (
                    <div
                      className="flex items-center gap-3 rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3"
                      key={label}
                    >
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <section className="rounded-[2rem] border border-white/10 bg-black/30 p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/72">
                    Market tape
                  </p>
                  <h2 className="mt-2 font-display text-2xl text-white">
                    Asset reaction stream
                  </h2>
                </div>
                {globeScenario ? (
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/60">
                    {experienceMode === "simulate" ? "Replay ready" : experienceMode}
                  </span>
                ) : null}
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
          />
        </section>
      </div>

      <AuthModal onClose={() => setAuthOpen(false)} open={authOpen} />
      <PaywallModal
        onClose={() => setPaywallOpen(false)}
        onOpenAuth={() => {
          setPaywallOpen(false);
          setAuthOpen(true);
        }}
        open={paywallOpen}
      />
    </div>
  );
}
