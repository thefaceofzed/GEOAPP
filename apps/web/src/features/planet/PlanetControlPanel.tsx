import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { ForecastView, ObservedView, Profile } from "../../lib/types";
import type { IntelligenceStreamState } from "../../hooks/useIntelligenceStream";
import { conflictActions, tonePalette } from "./planetCatalog";
import { countrySearchIndex } from "./planetData";
import type {
  ConflictActionKey,
  ExperienceMode,
  PlanetCountry,
  PlanetSimulation,
  QuotaSnapshot,
} from "./types";

interface PlanetControlPanelProps {
  profile: Profile | null;
  quota: QuotaSnapshot;
  selectedCountry: PlanetCountry | null;
  selectedActionKey: ConflictActionKey;
  experienceMode: ExperienceMode;
  searchValue: string;
  statusMessage: string | null;
  simulation: PlanetSimulation | null;
  observed: ObservedView | null;
  forecast: ForecastView | null;
  observedLoading: boolean;
  forecastLoading: boolean;
  streamState: IntelligenceStreamState;
  busy: boolean;
  onModeChange: (mode: ExperienceMode) => void;
  onSearchChange: (value: string) => void;
  onSearchConfirm: () => void;
  onSelectAction: (key: ConflictActionKey) => void;
  onRunSimulation: () => void;
  onCopyReplay: () => void;
  onOpenReplay: () => void;
  watchingSelection: boolean;
  onToggleWatchlist: () => void;
}

function quotaLabel(quota: QuotaSnapshot) {
  if (quota.unlimited) return "Unlimited";
  return `${quota.simulationsRemaining ?? 0} run(s) left`;
}

function modeDescription(mode: ExperienceMode) {
  switch (mode) {
    case "observed": return "Live signals only. No synthetic outcome.";
    case "simulate": return "Deterministic scenario engine with replay.";
    case "forecast": return "Explainable forward-looking risk estimate.";
    default: return "";
  }
}

export function PlanetControlPanel({
  profile,
  quota,
  selectedCountry,
  selectedActionKey,
  experienceMode,
  searchValue,
  statusMessage,
  simulation,
  observed,
  forecast,
  observedLoading,
  forecastLoading,
  streamState,
  busy,
  onModeChange,
  onSearchChange,
  onSearchConfirm,
  onSelectAction,
  onRunSimulation,
  onCopyReplay,
  onOpenReplay,
  watchingSelection,
  onToggleWatchlist,
}: PlanetControlPanelProps) {
  const [localSearch, setLocalSearch] = useState(searchValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setLocalSearch(searchValue);
  }, [searchValue]);

  function handleLocalSearchChange(value: string) {
    setLocalSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearchChange(value), 250);
  }

  const streamLabel =
    streamState === "open" ? "Live stream connected"
    : streamState === "connecting" ? "Connecting live stream"
    : streamState === "error" ? "Live stream unavailable"
    : "Snapshot mode";

  return (
    <aside className="space-y-4 rounded-panel border border-b-default bg-surface p-4 backdrop-blur-panel lg:sticky lg:top-6 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto transition-colors duration-300 shadow-panel">
      <section aria-labelledby="section-product-mode" className="rounded-panel border border-b-subtle bg-surface-alt p-4 shadow-card">
        <p id="section-product-mode" className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono font-medium">Product mode</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {([["observed", "Observed"], ["simulate", "Simulate"], ["forecast", "Forecast"]] as const).map(([mode, label]) => {
            const active = mode === experienceMode;
            return (
              <button
                aria-label={`Switch to ${label} mode`}
                className={`rounded-card border px-3 py-3 text-sm transition ${
                  active
                    ? "border-accent/45 bg-accent-soft text-t-primary"
                    : "border-b-subtle bg-surface-raised text-t-secondary hover:border-b-default hover:text-t-primary"
                }`}
                key={mode}
                onClick={() => onModeChange(mode)}
                type="button"
              >
                {label}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-t-secondary">{modeDescription(experienceMode)}</p>
        <div className="mt-3 rounded-card border border-b-subtle bg-surface-raised px-3 py-2 text-xs text-t-tertiary shadow-raised">
          {streamLabel}
        </div>
      </section>

      <section aria-labelledby="section-country-target" className="rounded-panel border border-b-subtle bg-surface-alt p-4 shadow-card">
        <p id="section-country-target" className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono font-medium">Country target</p>
        <div className="mt-3 flex gap-2">
          <input
            aria-label="Search for a country"
            className="flex-1 rounded-card border border-b-default bg-surface-raised px-4 py-3 text-sm text-t-primary outline-none transition placeholder:text-t-tertiary focus:border-accent"
            list="country-directory"
            onChange={(event) => handleLocalSearchChange(event.target.value)}
            placeholder="Jump to any country"
            value={localSearch}
          />
          <button
            aria-label="Focus on selected country"
            className="rounded-card border border-b-subtle px-4 py-3 text-sm text-t-secondary transition hover:border-accent hover:text-t-primary"
            onClick={onSearchConfirm}
            type="button"
          >
            Focus
          </button>
        </div>
        <datalist id="country-directory">
          {countrySearchIndex.map((country) => (
            <option key={country.code3} value={country.value}>{country.region}</option>
          ))}
        </datalist>

        <div className="mt-4 rounded-card border border-b-subtle bg-surface-raised p-4 shadow-raised">
          {selectedCountry ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-t-tertiary font-mono">Selected country</p>
                  <h2 className="mt-2 font-display text-3xl font-semibold text-t-primary italic">{selectedCountry.name}</h2>
                </div>
                <div className="rounded-full border border-b-subtle px-3 py-1 text-sm font-mono text-t-secondary">{selectedCountry.cca2}</div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-card border border-b-subtle bg-surface-alt p-3 shadow-raised">
                  <p className="text-[10px] uppercase tracking-widest text-t-tertiary font-mono">Region</p>
                  <p className="mt-2 text-sm text-t-secondary">{selectedCountry.region}</p>
                </div>
                <div className="rounded-card border border-b-subtle bg-surface-alt p-3 shadow-raised">
                  <p className="text-[10px] uppercase tracking-widest text-t-tertiary font-mono">Capital</p>
                  <p className="mt-2 text-sm text-t-secondary">{selectedCountry.capital ?? "N/A"}</p>
                </div>
              </div>
              <button
                aria-label={watchingSelection ? "Remove country from watchlist" : "Save country to watchlist"}
                className={`mt-4 rounded-full px-4 py-3 text-sm transition ${
                  watchingSelection
                    ? "border border-accent/35 bg-accent-soft text-accent"
                    : "border border-b-subtle bg-surface-alt text-t-secondary hover:border-b-default hover:text-t-primary"
                }`}
                onClick={onToggleWatchlist}
                type="button"
              >
                {watchingSelection ? "Remove from watchlist" : "Save to watchlist"}
              </button>
            </>
          ) : (
            <div className="space-y-2 text-sm text-t-secondary">
              <p>Click a country on the planet or jump to it from search.</p>
              <p>The panel rebuilds around that selection for live, simulated, and forecast views.</p>
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="section-scenario-class" className="rounded-panel border border-b-subtle bg-surface-alt p-4 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p id="section-scenario-class" className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono font-medium">Scenario class</p>
            <h2 className="mt-2 font-display text-xl font-semibold text-t-primary italic">Action surface</h2>
          </div>
          <div className="rounded-full border border-b-subtle px-3 py-1 text-[10px] uppercase tracking-widest text-t-tertiary font-mono">
            {quotaLabel(quota)}
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {conflictActions.map((action) => {
            const active = action.key === selectedActionKey;
            const tone = tonePalette[action.accentTone];
            return (
              <button
                className={`rounded-card border px-4 py-4 text-left transition ${
                  active
                    ? "border-b-default bg-surface-alt"
                    : "border-b-subtle bg-surface-raised hover:border-b-default hover:bg-surface-alt"
                }`}
                key={action.key}
                onClick={() => onSelectAction(action.key)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-t-primary">{action.label}</p>
                    <p className="mt-2 text-sm text-t-secondary">{action.description}</p>
                  </div>
                  <span
                    className="rounded-full border px-3 py-1 text-[11px] uppercase tracking-widest font-mono"
                    style={{ borderColor: tone.borderColor, color: tone.color, backgroundColor: tone.softColor }}
                  >
                    {action.shortLabel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {experienceMode === "simulate" && (
          <button
            aria-label={busy ? "Simulation running" : "Run scenario simulation"}
            aria-busy={busy}
            className="mt-4 w-full rounded-card bg-[linear-gradient(120deg,#7de5ff,#ffe170)] px-5 py-4 text-sm font-semibold text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!selectedCountry || busy}
            onClick={onRunSimulation}
            type="button"
          >
            {busy ? "Running simulation..." : "Run scenario"}
          </button>
        )}

        {statusMessage && (
          <div role="status" aria-live="polite" className="mt-4 rounded-card border border-b-subtle bg-surface-raised px-4 py-3 text-sm text-t-secondary shadow-raised">
            {statusMessage}
          </div>
        )}
      </section>

      {experienceMode === "observed" && (
        <section className="rounded-panel border border-b-subtle bg-surface-alt p-4 shadow-card">
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono font-medium">Observed</p>
          <h2 className="mt-2 font-display text-xl font-semibold text-t-primary italic">Live signal feed</h2>
          {observedLoading ? (
            <p role="status" className="mt-3 text-sm text-t-secondary">Loading live signals...</p>
          ) : observed?.signals.length ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-card border border-b-subtle bg-surface-raised p-3 text-sm text-t-secondary shadow-raised">
                {observed.signalCount} signal(s) matched to the selected country and scenario.
              </div>
              {observed.signals.slice(0, 5).map((signal) => (
                <a
                  className="block rounded-card border border-b-subtle bg-surface-raised p-4 transition hover:border-b-default hover:bg-surface-alt shadow-raised"
                  href={signal.url}
                  key={signal.rawReferenceId}
                  rel="noreferrer"
                  target="_blank"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-t-primary">{signal.sourceName}</p>
                    <span className="text-[10px] uppercase tracking-widest text-t-tertiary font-mono">{signal.signalType}</span>
                  </div>
                  <p className="mt-2 text-sm text-t-secondary">{signal.extractedSummary}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-t-tertiary font-mono">
                    <span>Severity {Math.round(signal.severityScore)}/100</span>
                    <span>Confidence {Math.round(signal.confidenceScore)}/100</span>
                    <span>{new Date(signal.publishedAt).toLocaleString()}</span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-t-secondary">No strong live signal is currently mapped for this selection.</p>
          )}
        </section>
      )}

      {experienceMode === "forecast" && (
        <section className="rounded-panel border border-b-subtle bg-surface-alt p-4 shadow-card">
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono font-medium">Forecast</p>
          <h2 className="mt-2 font-display text-xl font-semibold text-t-primary italic">Forward risk</h2>
          {forecastLoading ? (
            <p role="status" className="mt-3 text-sm text-t-secondary">Computing forecast...</p>
          ) : forecast ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-card border border-b-subtle bg-surface-raised p-3 shadow-raised">
                  <p className="text-[10px] uppercase tracking-widest text-t-tertiary font-mono">Risk</p>
                  <p className="mt-2 text-2xl font-mono text-t-primary">{Math.round(forecast.riskScore)}/100</p>
                  <p className="mt-1 text-sm text-t-secondary">{forecast.riskLabel}</p>
                </div>
                <div className="rounded-card border border-b-subtle bg-surface-raised p-3 shadow-raised">
                  <p className="text-[10px] uppercase tracking-widest text-t-tertiary font-mono">Confidence</p>
                  <p className="mt-2 text-2xl font-mono text-t-primary">{Math.round(forecast.confidenceScore)}/100</p>
                  <p className="mt-1 text-sm text-t-secondary">{forecast.horizonDays} day horizon</p>
                </div>
              </div>
              <div className="rounded-card border border-b-subtle bg-surface-raised p-4 text-sm text-t-secondary shadow-raised">
                {forecast.summary}
              </div>
              <div className="space-y-3">
                {forecast.drivers.map((driver) => (
                  <div className="rounded-card border border-b-subtle bg-surface-raised p-4 shadow-raised" key={driver.factorKey}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-t-primary">{driver.label}</p>
                      <span className="text-[10px] uppercase tracking-widest text-t-tertiary font-mono">Weight {Math.round(driver.weight * 100)}</span>
                    </div>
                    <p className="mt-2 text-sm text-t-secondary">{driver.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-t-secondary">Forecast becomes available once the selected country has enough relevant live signals.</p>
          )}
        </section>
      )}

      <section className="rounded-panel border border-b-subtle bg-surface-alt p-4 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono font-medium">Session state</p>
            <h2 className="mt-2 font-display text-xl font-semibold text-t-primary italic">{profile?.planTier ?? "Guest"}</h2>
          </div>
          <Link
            className="rounded-full border border-b-subtle px-3 py-2 text-sm text-t-secondary transition hover:border-b-default hover:text-t-primary"
            to="/account"
          >
            Account
          </Link>
        </div>
        <p className="mt-3 text-sm text-t-secondary">
          {quota.unlimited
            ? "Unlimited simulation access is active."
            : `You can launch ${quota.simulationsRemaining ?? 0} more simulation(s) before the paywall appears.`}
        </p>
      </section>

      {experienceMode === "simulate" && simulation && (
        <section className="rounded-panel border border-b-subtle bg-gradient-to-b from-surface-alt to-surface p-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono font-medium">Replay</p>
          <h2 className="mt-2 font-display text-xl font-semibold text-t-primary italic">{simulation.actionLabel}</h2>
          <p className="mt-3 text-sm text-t-secondary">{simulation.narrative.summary}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-card border border-b-subtle bg-surface-alt p-3 shadow-raised">
              <p className="text-[10px] uppercase tracking-widest text-t-tertiary font-mono">Severity</p>
              <p className="mt-2 text-sm font-mono text-t-primary">{simulation.severityScore}/100</p>
            </div>
            <div className="rounded-card border border-b-subtle bg-surface-alt p-3 shadow-raised">
              <p className="text-[10px] uppercase tracking-widest text-t-tertiary font-mono">Impacted states</p>
              <p className="mt-2 text-sm font-mono text-t-primary">{simulation.impacts.length}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              aria-label="Copy replay link to clipboard"
              className="flex-1 rounded-card bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110"
              onClick={onCopyReplay}
              type="button"
            >
              Copy replay link
            </button>
            <button
              aria-label="Open replay in new view"
              className="rounded-card border border-b-subtle px-4 py-3 text-center text-sm text-t-secondary transition hover:border-b-default hover:text-t-primary"
              onClick={onOpenReplay}
              type="button"
            >
              Open replay
            </button>
          </div>
        </section>
      )}
    </aside>
  );
}
