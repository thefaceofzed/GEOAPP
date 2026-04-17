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
}

function quotaLabel(quota: QuotaSnapshot) {
  if (quota.unlimited) {
    return "Unlimited";
  }
  return `${quota.simulationsRemaining ?? 0} run(s) left`;
}

function modeDescription(mode: ExperienceMode) {
  switch (mode) {
    case "observed":
      return "Live signals only. No synthetic outcome.";
    case "simulate":
      return "Deterministic scenario engine with replay.";
    case "forecast":
      return "Explainable forward-looking risk estimate.";
    default:
      return "";
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
}: PlanetControlPanelProps) {
  const streamLabel =
    streamState === "open"
      ? "Live stream connected"
      : streamState === "connecting"
        ? "Connecting live stream"
        : streamState === "error"
          ? "Live stream unavailable"
          : "Snapshot mode";

  return (
    <aside className="space-y-4 rounded-[2rem] border border-white/10 bg-black/35 p-4 backdrop-blur-xl lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
      <section className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">
          Product mode
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {([
            ["observed", "Observed"],
            ["simulate", "Simulate"],
            ["forecast", "Forecast"],
          ] as const).map(([mode, label]) => {
            const active = mode === experienceMode;
            return (
              <button
                className={`rounded-[1.1rem] border px-3 py-3 text-sm transition ${
                  active
                    ? "border-cyan-300/50 bg-cyan-200/12 text-white"
                    : "border-white/10 bg-[#08131d] text-white/72 hover:border-white/20 hover:text-white"
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
        <p className="mt-3 text-sm text-white/60">{modeDescription(experienceMode)}</p>
        <div className="mt-3 rounded-[1rem] border border-white/10 bg-[#08131d] px-3 py-2 text-xs text-white/58">
          {streamLabel}
        </div>
      </section>

      <section className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">
          Country target
        </p>
        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 rounded-[1.2rem] border border-white/10 bg-[#0a1420] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cyan-300/60"
            list="country-directory"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Jump to any country"
            value={searchValue}
          />
          <button
            className="rounded-[1.2rem] border border-white/10 px-4 py-3 text-sm text-white/85 transition hover:border-cyan-300/60 hover:text-white"
            onClick={onSearchConfirm}
            type="button"
          >
            Focus
          </button>
        </div>
        <datalist id="country-directory">
          {countrySearchIndex.map((country) => (
            <option key={country.code3} value={country.value}>
              {country.region}
            </option>
          ))}
        </datalist>

        <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-[#07111b] p-4">
          {selectedCountry ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/45">
                    Selected country
                  </p>
                  <h2 className="mt-2 font-display text-3xl text-white">
                    {selectedCountry.name}
                  </h2>
                </div>
                <div className="rounded-full border border-white/10 px-3 py-1 text-sm text-white/75">
                  {selectedCountry.cca2}
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                    Region
                  </p>
                  <p className="mt-2 text-sm text-white/80">{selectedCountry.region}</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                    Capital
                  </p>
                  <p className="mt-2 text-sm text-white/80">
                    {selectedCountry.capital ?? "N/A"}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-2 text-sm text-white/65">
              <p>Click a country on the planet or jump to it from search.</p>
              <p>The panel rebuilds around that selection for live, simulated, and forecast views.</p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">
              Scenario class
            </p>
            <h2 className="mt-2 font-display text-2xl text-white">Action surface</h2>
          </div>
          <div className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/65">
            {quotaLabel(quota)}
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {conflictActions.map((action) => {
            const active = action.key === selectedActionKey;
            const tone = tonePalette[action.accentTone];
            return (
              <button
                className={`rounded-[1.4rem] border px-4 py-4 text-left transition ${
                  active
                    ? "border-white/20 bg-white/10"
                    : "border-white/10 bg-[#08131d] hover:border-white/20 hover:bg-white/8"
                }`}
                key={action.key}
                onClick={() => onSelectAction(action.key)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-white">{action.label}</p>
                    <p className="mt-2 text-sm text-white/66">{action.description}</p>
                  </div>
                  <span
                    className="rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.2em]"
                    style={{
                      borderColor: tone.borderColor,
                      color: tone.color,
                      backgroundColor: tone.softColor,
                    }}
                  >
                    {action.shortLabel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {experienceMode === "simulate" ? (
          <button
            className="mt-4 w-full rounded-[1.4rem] bg-[linear-gradient(120deg,#7de5ff,#ffe170)] px-5 py-4 text-sm font-semibold text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!selectedCountry || busy}
            onClick={onRunSimulation}
            type="button"
          >
            {busy ? "Running simulation..." : "Run scenario"}
          </button>
        ) : null}

        {statusMessage ? (
          <div className="mt-4 rounded-[1.3rem] border border-white/10 bg-[#08111a] px-4 py-3 text-sm text-white/78">
            {statusMessage}
          </div>
        ) : null}
      </section>

      {experienceMode === "observed" ? (
        <section className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">
            Observed
          </p>
          <h2 className="mt-2 font-display text-2xl text-white">Live signal feed</h2>
          {observedLoading ? (
            <p className="mt-3 text-sm text-white/60">Loading live signals...</p>
          ) : observed?.signals.length ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-[1.2rem] border border-white/10 bg-[#07111b] p-3 text-sm text-white/70">
                {observed.signalCount} signal(s) matched to the selected country and scenario.
              </div>
              {observed.signals.slice(0, 5).map((signal) => (
                <a
                  className="block rounded-[1.3rem] border border-white/10 bg-[#08131d] p-4 transition hover:border-white/20 hover:bg-white/5"
                  href={signal.url}
                  key={signal.rawReferenceId}
                  rel="noreferrer"
                  target="_blank"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{signal.sourceName}</p>
                    <span className="text-xs uppercase tracking-[0.2em] text-white/45">
                      {signal.signalType}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-white/72">{signal.extractedSummary}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/45">
                    <span>Severity {Math.round(signal.severityScore)}/100</span>
                    <span>Confidence {Math.round(signal.confidenceScore)}/100</span>
                    <span>{new Date(signal.publishedAt).toLocaleString()}</span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-white/60">
              No strong live signal is currently mapped for this selection.
            </p>
          )}
        </section>
      ) : null}

      {experienceMode === "forecast" ? (
        <section className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">
            Forecast
          </p>
          <h2 className="mt-2 font-display text-2xl text-white">Forward risk</h2>
          {forecastLoading ? (
            <p className="mt-3 text-sm text-white/60">Computing forecast...</p>
          ) : forecast ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.2rem] border border-white/10 bg-[#07111b] p-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/40">Risk</p>
                  <p className="mt-2 text-2xl text-white">{Math.round(forecast.riskScore)}/100</p>
                  <p className="mt-1 text-sm text-white/60">{forecast.riskLabel}</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-[#07111b] p-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/40">Confidence</p>
                  <p className="mt-2 text-2xl text-white">
                    {Math.round(forecast.confidenceScore)}/100
                  </p>
                  <p className="mt-1 text-sm text-white/60">{forecast.horizonDays} day horizon</p>
                </div>
              </div>
              <div className="rounded-[1.2rem] border border-white/10 bg-[#08131d] p-4 text-sm text-white/72">
                {forecast.summary}
              </div>
              <div className="space-y-3">
                {forecast.drivers.map((driver) => (
                  <div
                    className="rounded-[1.2rem] border border-white/10 bg-[#08131d] p-4"
                    key={driver.factorKey}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">{driver.label}</p>
                      <span className="text-xs uppercase tracking-[0.2em] text-white/45">
                        Weight {Math.round(driver.weight * 100)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-white/70">{driver.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-white/60">
              Forecast becomes available once the selected country has enough relevant live signals.
            </p>
          )}
        </section>
      ) : null}

      <section className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">
              Session state
            </p>
            <h2 className="mt-2 font-display text-2xl text-white">
              {profile?.planTier ?? "Guest"}
            </h2>
          </div>
          <Link
            className="rounded-full border border-white/10 px-3 py-2 text-sm text-white/75 transition hover:border-white/25 hover:text-white"
            to="/account"
          >
            Account
          </Link>
        </div>
        <p className="mt-3 text-sm text-white/65">
          {quota.unlimited
            ? "Unlimited simulation access is active."
            : `You can launch ${quota.simulationsRemaining ?? 0} more simulation(s) before the paywall appears.`}
        </p>
      </section>

      {experienceMode === "simulate" && simulation ? (
        <section className="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(20,36,54,0.84),rgba(8,14,22,0.84))] p-4">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">
            Replay
          </p>
          <h2 className="mt-2 font-display text-2xl text-white">
            {simulation.actionLabel}
          </h2>
          <p className="mt-3 text-sm text-white/70">{simulation.narrative.summary}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-3">
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                Severity
              </p>
              <p className="mt-2 text-sm text-white/85">{simulation.severityScore}/100</p>
            </div>
            <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-3">
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                Impacted states
              </p>
              <p className="mt-2 text-sm text-white/85">{simulation.impacts.length}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              className="flex-1 rounded-[1.2rem] bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100"
              onClick={onCopyReplay}
              type="button"
            >
              Copy replay link
            </button>
            <button
              className="rounded-[1.2rem] border border-white/10 px-4 py-3 text-center text-sm text-white/80 transition hover:border-white/25 hover:text-white"
              onClick={onOpenReplay}
              type="button"
            >
              Open replay
            </button>
          </div>
        </section>
      ) : null}
    </aside>
  );
}
