import { useMemo, useState } from "react";
import type {
  ForecastView,
  ObservedView,
  SimulationView,
} from "../../lib/types";
import { actionByKey } from "./planetCatalog";
import {
  buildForecastBrief,
  buildObservedBrief,
  buildSimulationBrief,
  freshnessBand,
  severityBand,
  topAssetMoves,
} from "./decisionSupport";
import type {
  ConflictActionKey,
  ExperienceMode,
  PlanetCountry,
  PlanetSimulation,
} from "./types";

interface DecisionSupportPanelProps {
  mode: ExperienceMode;
  selectedCountry: PlanetCountry | null;
  selectedActionKey: ConflictActionKey;
  simulation: PlanetSimulation | null;
  simulationView: SimulationView | null;
  observed: ObservedView | null;
  forecast: ForecastView | null;
  onAddToCompare?: () => void;
  alreadyCompared?: boolean;
}

function listStyle(count: number) {
  return count > 0 ? "space-y-3" : "";
}

export function DecisionSupportPanel({
  mode,
  selectedCountry,
  selectedActionKey,
  simulation,
  simulationView,
  observed,
  forecast,
  onAddToCompare,
  alreadyCompared = false,
}: DecisionSupportPanelProps) {
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const action = actionByKey.get(selectedActionKey);

  const briefText = useMemo(() => {
    if (!selectedCountry) {
      return null;
    }
    if (mode === "simulate" && simulation) {
      return buildSimulationBrief(selectedCountry, simulation, simulationView);
    }
    if (mode === "observed" && observed) {
      return buildObservedBrief(selectedCountry, selectedActionKey, observed);
    }
    if (mode === "forecast" && forecast) {
      return buildForecastBrief(selectedCountry, selectedActionKey, forecast);
    }
    return null;
  }, [
    forecast,
    mode,
    observed,
    selectedActionKey,
    selectedCountry,
    simulation,
    simulationView,
  ]);

  async function copyBrief() {
    if (!briefText) {
      return;
    }
    await navigator.clipboard.writeText(briefText);
    setCopyMessage("Brief copied.");
    window.setTimeout(() => setCopyMessage(null), 1800);
  }

  const topMoves = simulation ? topAssetMoves(simulation.assets) : [];
  const evidenceSignals = simulationView?.supportingSignals.slice(0, 4) ?? [];

  return (
    <section className="grid gap-4 grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="rounded-panel border border-b-subtle bg-surface p-5 backdrop-blur-panel">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono">
              Decision brief
            </p>
            <h2 className="mt-2 font-display text-xl font-semibold text-t-primary italic">
              {mode === "simulate"
                ? "What this scenario means"
                : mode === "observed"
                  ? "What to do with the live signals"
                  : "What the forecast implies"}
            </h2>
          </div>
          <button
            className="rounded-full border border-b-subtle px-4 py-2 text-sm text-t-secondary transition hover:border-b-default hover:text-t-primary disabled:opacity-45"
            disabled={!briefText}
            onClick={copyBrief}
            type="button"
          >
            Copy brief
          </button>
        </div>

        {!selectedCountry ? (
          <p className="mt-4 text-sm text-t-tertiary">
            Select a country to generate a scenario brief.
          </p>
        ) : mode === "simulate" && simulation ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-panel border border-b-subtle bg-surface-raised p-4">
              <p className="text-sm text-t-secondary">
                {simulation.narrative.summary}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-card border border-b-subtle bg-surface-alt p-3 shadow-raised">
                <p className="text-[10px] uppercase tracking-[0.2em] text-t-tertiary font-mono">
                  Severity
                </p>
                <p className="mt-2 text-xl font-mono text-t-primary">
                  {severityBand(simulation.severityScore)}
                </p>
                <p className="mt-1 text-sm font-mono text-t-tertiary">
                  {Math.round(simulation.severityScore)}/100
                </p>
              </div>
              <div className="rounded-card border border-b-subtle bg-surface-alt p-3 shadow-raised">
                <p className="text-[10px] uppercase tracking-[0.2em] text-t-tertiary font-mono">
                  Action lens
                </p>
                <p className="mt-2 text-xl text-t-primary">
                  {action?.label ?? selectedActionKey}
                </p>
                <p className="mt-1 text-sm text-t-tertiary">
                  {action?.narrativeHint ?? "Deterministic scenario"}
                </p>
              </div>
              <div className="rounded-card border border-b-subtle bg-surface-alt p-3 shadow-raised">
                <p className="text-[10px] uppercase tracking-[0.2em] text-t-tertiary font-mono">
                  Reach
                </p>
                <p className="mt-2 text-xl font-mono text-t-primary">{simulation.impacts.length}</p>
                <p className="mt-1 text-sm text-t-tertiary">Impacted states</p>
              </div>
            </div>

            <div className="rounded-panel border border-b-subtle bg-surface-raised p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-accent font-mono">
                Immediate takeaways
              </p>
              <div className={`mt-3 ${listStyle(topMoves.length)}`}>
                {topMoves.map((asset) => (
                  <div
                    className="rounded-card border border-b-subtle bg-surface-alt p-3 shadow-raised"
                    key={asset.key}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-t-primary">{asset.label}</p>
                      <span className="text-sm text-t-secondary">
                        {asset.delta >= 0 ? "+" : ""}
                        {asset.delta.toFixed(2)} {asset.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {simulationView == null ? (
              <div className="rounded-panel border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
                Backend evidence is unavailable for this run. This brief is based on the
                local fallback scenario model and should be treated as exploratory.
              </div>
            ) : null}
          </div>
        ) : mode === "observed" && observed ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-card border border-b-subtle bg-surface-alt p-3 shadow-raised">
                <p className="text-[10px] uppercase tracking-[0.2em] text-t-tertiary font-mono">
                  Signals
                </p>
                <p className="mt-2 text-xl font-mono text-t-primary">{observed.signalCount}</p>
                <p className="mt-1 text-sm text-t-tertiary">Mapped to the current lens</p>
              </div>
              <div className="rounded-card border border-b-subtle bg-surface-alt p-3 shadow-raised">
                <p className="text-[10px] uppercase tracking-[0.2em] text-t-tertiary font-mono">
                  Freshness
                </p>
                <p className="mt-2 text-xl font-mono text-t-primary">
                  {freshnessBand(observed.signals[0]?.publishedAt ?? observed.generatedAt)}
                </p>
                <p className="mt-1 text-sm text-t-tertiary">
                  Generated {new Date(observed.generatedAt).toLocaleString()}
                </p>
              </div>
              <div className="rounded-card border border-b-subtle bg-surface-alt p-3 shadow-raised">
                <p className="text-[10px] uppercase tracking-[0.2em] text-t-tertiary font-mono">
                  Recommended move
                </p>
                <p className="mt-2 text-xl font-semibold text-t-primary">Monitor</p>
                <p className="mt-1 text-sm text-t-tertiary">
                  Validate signal direction before escalation
                </p>
              </div>
            </div>
            <div className="rounded-panel border border-b-subtle bg-surface-raised p-4 text-sm text-t-secondary">
              {observed.signals[0]?.extractedSummary ??
                "No strong live signal is mapped to this scenario lens yet."}
            </div>
          </div>
        ) : mode === "forecast" && forecast ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-card border border-b-subtle bg-surface-alt p-3 shadow-raised">
                <p className="text-[10px] uppercase tracking-[0.2em] text-t-tertiary font-mono">
                  Risk
                </p>
                <p className="mt-2 text-xl font-mono text-t-primary">{forecast.riskLabel}</p>
                <p className="mt-1 text-sm font-mono text-t-tertiary">
                  {Math.round(forecast.riskScore)}/100
                </p>
              </div>
              <div className="rounded-card border border-b-subtle bg-surface-alt p-3 shadow-raised">
                <p className="text-[10px] uppercase tracking-[0.2em] text-t-tertiary font-mono">
                  Confidence
                </p>
                <p className="mt-2 text-xl font-mono text-t-primary">
                  {Math.round(forecast.confidenceScore)}/100
                </p>
                <p className="mt-1 text-sm text-t-tertiary">
                  {forecast.horizonDays}-day horizon
                </p>
              </div>
              <div className="rounded-card border border-b-subtle bg-surface-alt p-3 shadow-raised">
                <p className="text-[10px] uppercase tracking-[0.2em] text-t-tertiary font-mono">
                  Recommended move
                </p>
                <p className="mt-2 text-xl font-semibold text-t-primary">
                  {forecast.riskScore >= 60 ? "Escalate" : "Track"}
                </p>
                <p className="mt-1 text-sm text-t-tertiary">
                  Promote into scenario planning if the risk keeps climbing
                </p>
              </div>
            </div>
            <div className="rounded-panel border border-b-subtle bg-surface-raised p-4 text-sm text-t-secondary">
              {forecast.summary}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-t-tertiary">
            No decision brief is available yet for this selection.
          </p>
        )}

        {copyMessage ? (
          <p className="mt-4 text-sm text-accent">{copyMessage}</p>
        ) : null}
        {mode === "simulate" && simulation && onAddToCompare ? (
          <button
            className={`mt-4 rounded-full px-4 py-3 text-sm transition ${
              alreadyCompared
                ? "border border-cyan-300/35 bg-cyan-200/12 text-cyan-100"
                : "border border-b-subtle bg-surface-alt text-t-secondary hover:border-b-default hover:text-t-primary"
            }`}
            onClick={onAddToCompare}
            type="button"
          >
            {alreadyCompared ? "Added to compare" : "Add to compare"}
          </button>
        ) : null}
      </section>

      <section className="rounded-panel border border-b-subtle bg-surface p-5 backdrop-blur-panel">
        <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono">
          Explainability
        </p>
        <h2 className="mt-2 font-display text-xl font-semibold text-t-primary italic">
          Why this result exists
        </h2>

        {!selectedCountry ? (
          <p className="mt-4 text-sm text-t-tertiary">
            Choose a country to inspect assumptions, drivers, and evidence.
          </p>
        ) : mode === "simulate" && simulation ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-card border border-b-subtle bg-surface-raised p-3 shadow-raised">
                <p className="text-[10px] uppercase tracking-[0.2em] text-t-tertiary font-mono">
                  Engine type
                </p>
                <p className="mt-2 text-sm text-t-secondary">Deterministic scenario rules</p>
              </div>
              <div className="rounded-card border border-b-subtle bg-surface-raised p-3 shadow-raised">
                <p className="text-[10px] uppercase tracking-[0.2em] text-t-tertiary font-mono">
                  Rules version
                </p>
                <p className="mt-2 text-sm text-t-secondary">
                  {simulationView?.rulesVersion ?? "Local preview"}
                </p>
              </div>
              <div className="rounded-card border border-b-subtle bg-surface-raised p-3 shadow-raised">
                <p className="text-[10px] uppercase tracking-[0.2em] text-t-tertiary font-mono">
                  Intensity
                </p>
                <p className="mt-2 text-sm text-t-secondary">
                  {simulationView?.visualIntensity ?? "Preview"}
                </p>
              </div>
              <div className="rounded-card border border-b-subtle bg-surface-raised p-3 shadow-raised">
                <p className="text-[10px] uppercase tracking-[0.2em] text-t-tertiary font-mono">
                  Response state
                </p>
                <p className="mt-2 text-sm text-t-secondary">
                  {simulationView == null
                    ? "Backend unavailable"
                    : simulationView.cached
                      ? "Cached"
                      : "Fresh"}
                </p>
              </div>
            </div>

            <div className="rounded-panel border border-b-subtle bg-surface-raised p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-accent font-mono">
                Assumption frame
              </p>
              <p className="mt-3 text-sm text-t-secondary">
                {simulationView?.actionDescription ??
                  action?.description ??
                  "The deterministic engine projects asset and country spillovers from the selected scenario."}
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-accent font-mono">
                Supporting evidence
              </p>
              {evidenceSignals.length > 0 ? (
                evidenceSignals.map((signal) => (
                  <a
                    className="block rounded-card border border-b-subtle bg-surface-raised p-4 transition hover:border-b-default hover:bg-surface-alt shadow-raised"
                    href={signal.url}
                    key={signal.rawReferenceId}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-t-primary">{signal.sourceName}</p>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-t-tertiary font-mono">
                        {freshnessBand(signal.publishedAt)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-t-secondary">{signal.extractedSummary}</p>
                  </a>
                ))
              ) : (
                <div className="rounded-card border border-dashed border-b-default bg-surface-alt p-4 text-sm text-t-tertiary">
                  No attached backend evidence. This can happen for local previews or when
                  the live signal layer has no strong match for the scenario.
                </div>
              )}
            </div>
          </div>
        ) : mode === "observed" && observed ? (
          <div className="mt-4 space-y-3">
            {observed.signals.slice(0, 4).map((signal) => (
              <a
                className="block rounded-card border border-b-subtle bg-surface-raised p-4 transition hover:border-b-default hover:bg-surface-alt shadow-raised"
                href={signal.url}
                key={signal.rawReferenceId}
                rel="noreferrer"
                target="_blank"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-t-primary">{signal.sourceName}</p>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-t-tertiary font-mono">
                    Confidence {Math.round(signal.confidenceScore)}/100
                  </span>
                </div>
                <p className="mt-2 text-sm text-t-secondary">{signal.extractedSummary}</p>
              </a>
            ))}
          </div>
        ) : mode === "forecast" && forecast ? (
          <div className="mt-4 space-y-3">
            {forecast.drivers.slice(0, 4).map((driver) => (
              <div
                className="rounded-card border border-b-subtle bg-surface-raised p-4 shadow-raised"
                key={driver.factorKey}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-t-primary">{driver.label}</p>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-t-tertiary font-mono">
                    Weight {Math.round(driver.weight * 100)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-t-secondary">{driver.explanation}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-t-tertiary">
            No explainability details are available yet for this selection.
          </p>
        )}
      </section>
    </section>
  );
}
