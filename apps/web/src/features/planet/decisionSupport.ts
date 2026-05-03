import type {
  AnimatedAsset,
  ForecastView,
  ObservedView,
  RelevantSignal,
  SimulationView,
} from "../../lib/types";
import { actionByKey } from "./planetCatalog";
import type { ConflictActionKey, PlanetCountry, PlanetSimulation } from "./types";

export type IntelligencePosture =
  | "Select target"
  | "Coverage gap"
  | "Monitor"
  | "Watch"
  | "Escalate";

export interface IntelligenceCommandSnapshot {
  posture: IntelligencePosture;
  postureTone: "neutral" | "gap" | "monitor" | "watch" | "escalate";
  intelligenceScore: number | null;
  confidenceScore: number | null;
  evidenceCount: number;
  signalCount: number;
  driverCount: number;
  marketMoveCount: number;
  freshnessLabel: string;
  riskLabel: string;
  primaryFinding: string;
  recommendedAction: string;
  nextSteps: string[];
  sourceCoverage: Array<{
    label: string;
    value: string;
    detail: string;
    state: "ready" | "partial" | "missing";
  }>;
}

export function severityBand(score: number) {
  if (score >= 80) {
    return "Severe";
  }
  if (score >= 60) {
    return "High";
  }
  if (score >= 35) {
    return "Elevated";
  }
  return "Low";
}

export function freshnessBand(value: string | null) {
  if (!value) {
    return "Unknown freshness";
  }

  const ageMs = Date.now() - new Date(value).getTime();
  const ageHours = Math.max(0, Math.round(ageMs / 3_600_000));

  if (ageHours <= 6) {
    return "Fresh";
  }
  if (ageHours <= 24) {
    return "Recent";
  }
  if (ageHours <= 72) {
    return "Aging";
  }
  return "Stale";
}

export function topAssetMoves(assets: AnimatedAsset[], limit = 3) {
  return assets
    .slice()
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
    .slice(0, limit);
}

function signalSummary(signal: RelevantSignal) {
  return `${signal.sourceName}: ${signal.extractedSummary}`;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function buildNextSteps({
  hasCountry,
  hasSimulation,
  hasObserved,
  hasForecast,
  watched,
  compared,
  intelligenceScore,
}: {
  hasCountry: boolean;
  hasSimulation: boolean;
  hasObserved: boolean;
  hasForecast: boolean;
  watched: boolean;
  compared: boolean;
  intelligenceScore: number | null;
}) {
  if (!hasCountry) {
    return [
      "Select a country or load a template.",
      "Review observed signals before simulating.",
      "Save the hotspot once it becomes relevant.",
    ];
  }

  const steps: string[] = [];

  if (!hasObserved) {
    steps.push("Check observed mode for current evidence.");
  }

  if (!hasForecast) {
    steps.push("Open forecast mode to inspect near-term drivers.");
  }

  if (!hasSimulation) {
    steps.push("Run the deterministic scenario for replayable impact.");
  }

  if (!watched) {
    steps.push("Save this country and scenario lens to the watchlist.");
  }

  if (hasSimulation && !compared) {
    steps.push("Add the run to comparison before briefing a decision.");
  }

  if ((intelligenceScore ?? 0) >= 70) {
    steps.unshift("Prepare an executive brief with risk, confidence, and evidence.");
  }

  return steps.slice(0, 4);
}

export function buildIntelligenceCommandSnapshot({
  country,
  actionKey,
  simulation,
  simulationView,
  observed,
  forecast,
  watched,
  compared,
}: {
  country: PlanetCountry | null;
  actionKey: ConflictActionKey;
  simulation: PlanetSimulation | null;
  simulationView: SimulationView | null;
  observed: ObservedView | null;
  forecast: ForecastView | null;
  watched: boolean;
  compared: boolean;
}): IntelligenceCommandSnapshot {
  const action = actionByKey.get(actionKey);
  const observedSignals = observed?.signals ?? [];
  const forecastDrivers = forecast?.drivers ?? [];
  const supportingSignals = simulationView?.supportingSignals ?? [];
  const evidenceCount =
    observedSignals.length + forecastDrivers.length + supportingSignals.length;
  const leadSignal = observedSignals[0] ?? supportingSignals[0] ?? null;
  const marketMoves = simulation ? topAssetMoves(simulation.assets, 5) : [];
  const riskInputs = [
    simulation?.severityScore,
    forecast?.riskScore,
    observedSignals[0]?.severityScore,
  ].filter((score): score is number => typeof score === "number");
  const intelligenceScore =
    riskInputs.length > 0 ? clampScore(Math.max(...riskInputs)) : null;
  const confidenceInputs = [
    forecast?.confidenceScore,
    ...observedSignals.slice(0, 4).map((signal) => signal.confidenceScore),
    simulationView && supportingSignals.length > 0
      ? Math.min(92, 56 + supportingSignals.length * 7)
      : null,
  ].filter((score): score is number => typeof score === "number");
  const confidenceAverage = average(confidenceInputs);
  const confidenceScore =
    confidenceAverage == null
      ? simulation && !simulationView
        ? 38
        : null
      : clampScore(confidenceAverage);
  const freshnessLabel = freshnessBand(
    leadSignal?.publishedAt ?? observed?.generatedAt ?? forecast?.generatedAt ?? null,
  );
  const hasCountry = Boolean(country);
  const hasSimulation = Boolean(simulation);
  const hasObserved = Boolean(observed && observed.signalCount > 0);
  const hasForecast = Boolean(forecast);

  let posture: IntelligencePosture = "Select target";
  let postureTone: IntelligenceCommandSnapshot["postureTone"] = "neutral";

  if (!hasCountry) {
    posture = "Select target";
    postureTone = "neutral";
  } else if (evidenceCount === 0 && !hasSimulation) {
    posture = "Coverage gap";
    postureTone = "gap";
  } else if ((intelligenceScore ?? 0) >= 72 && (confidenceScore ?? 0) >= 50) {
    posture = "Escalate";
    postureTone = "escalate";
  } else if ((intelligenceScore ?? 0) >= 48 || observedSignals.length >= 3) {
    posture = "Watch";
    postureTone = "watch";
  } else {
    posture = "Monitor";
    postureTone = "monitor";
  }

  const riskLabel =
    intelligenceScore == null ? "No reading" : severityBand(intelligenceScore);
  const primaryFinding = country
    ? forecast?.summary ??
      simulation?.narrative.summary ??
      leadSignal?.extractedSummary ??
      `No strong live signal is currently mapped for ${country.name}.`
    : "Select a country to build an intelligence posture.";
  const recommendedAction =
    posture === "Escalate"
      ? "Brief stakeholders and compare adverse scenarios."
      : posture === "Watch"
        ? "Keep this hotspot in daily review and run a deterministic scenario."
        : posture === "Coverage gap"
          ? "Create a baseline scenario, then wait for stronger evidence."
          : posture === "Monitor"
            ? "Track evidence and save the lens if it matters to your exposure."
            : "Choose a target country and scenario lens.";

  return {
    posture,
    postureTone,
    intelligenceScore,
    confidenceScore,
    evidenceCount,
    signalCount: observed?.signalCount ?? 0,
    driverCount: forecastDrivers.length,
    marketMoveCount: marketMoves.length,
    freshnessLabel,
    riskLabel,
    primaryFinding,
    recommendedAction,
    nextSteps: buildNextSteps({
      hasCountry,
      hasSimulation,
      hasObserved,
      hasForecast,
      watched,
      compared,
      intelligenceScore,
    }),
    sourceCoverage: [
      {
        label: "Observed signals",
        value: `${observed?.signalCount ?? 0}`,
        detail:
          observed && observed.signalCount > 0
            ? `${freshnessLabel} evidence mapped to ${action?.label ?? actionKey}`
            : "No current signal match for this lens",
        state: observed && observed.signalCount > 0 ? "ready" : "missing",
      },
      {
        label: "Forecast drivers",
        value: `${forecastDrivers.length}`,
        detail: forecast
          ? `${forecast.horizonDays}-day horizon at ${Math.round(forecast.confidenceScore)}/100 confidence`
          : "Forecast waits for enough signal coverage",
        state: forecast ? "ready" : "partial",
      },
      {
        label: "Scenario evidence",
        value: `${supportingSignals.length}`,
        detail: simulationView
          ? `${simulationView.rulesVersion} rules with ${simulationView.cached ? "cached" : "fresh"} response`
          : simulation
            ? "Local preview without backend evidence"
            : "Run a scenario to attach deterministic impact",
        state: supportingSignals.length > 0 ? "ready" : simulation ? "partial" : "missing",
      },
      {
        label: "Market exposure",
        value: `${marketMoves.length}`,
        detail:
          marketMoves.length > 0
            ? topAssetMoves(simulation?.assets ?? [], 1)
                .map(
                  (asset) =>
                    `${asset.label} ${asset.delta >= 0 ? "+" : ""}${asset.delta.toFixed(2)} ${asset.unit}`,
                )
                .join("")
            : "No asset reaction stream yet",
        state: marketMoves.length > 0 ? "ready" : "missing",
      },
    ],
  };
}

export function buildSimulationBrief(
  country: PlanetCountry,
  simulation: PlanetSimulation,
  simulationView: SimulationView | null,
) {
  const topMoves = topAssetMoves(simulation.assets);
  const evidence = (simulationView?.supportingSignals ?? []).slice(0, 3).map(signalSummary);
  const rulesVersion = simulationView?.rulesVersion ?? "local-preview";
  const cacheState = simulationView == null ? "Local preview only" : simulationView.cached ? "Cached scenario response" : "Fresh scenario response";

  return [
    `${simulation.actionLabel} around ${country.name}`,
    `Severity: ${severityBand(simulation.severityScore)} (${Math.round(simulation.severityScore)}/100)`,
    `Rules version: ${rulesVersion}`,
    `Summary: ${simulation.narrative.summary}`,
    `Top moves: ${topMoves.map((asset) => `${asset.label} ${asset.delta >= 0 ? "+" : ""}${asset.delta.toFixed(2)} ${asset.unit}`).join(" | ")}`,
    `Affected states: ${simulation.impacts.length}`,
    `Scenario status: ${cacheState}`,
    evidence.length > 0 ? `Supporting evidence: ${evidence.join(" | ")}` : "Supporting evidence: no backend signal evidence attached to this run",
  ].join("\n");
}

export function buildObservedBrief(
  country: PlanetCountry,
  actionKey: ConflictActionKey,
  observed: ObservedView,
) {
  const action = actionByKey.get(actionKey);
  const leadSignal = observed.signals[0];

  return [
    `Observed signal brief for ${country.name}`,
    `Action lens: ${action?.label ?? actionKey}`,
    `Signals matched: ${observed.signalCount}`,
    `Freshness: ${freshnessBand(leadSignal?.publishedAt ?? observed.generatedAt)}`,
    `Headline evidence: ${leadSignal ? signalSummary(leadSignal) : "No strong signal mapped yet"}`,
    `Use this view to decide whether the live evidence supports escalation monitoring before running a deterministic scenario.`,
  ].join("\n");
}

export function buildForecastBrief(
  country: PlanetCountry,
  actionKey: ConflictActionKey,
  forecast: ForecastView,
) {
  const action = actionByKey.get(actionKey);
  const topDriver = forecast.drivers[0];

  return [
    `Forecast note for ${country.name}`,
    `Action lens: ${action?.label ?? actionKey}`,
    `Risk: ${forecast.riskLabel} (${Math.round(forecast.riskScore)}/100)`,
    `Confidence: ${Math.round(forecast.confidenceScore)}/100`,
    `Horizon: ${forecast.horizonDays} days`,
    `Primary driver: ${topDriver ? `${topDriver.label} - ${topDriver.explanation}` : "No strong forecast drivers yet"}`,
    `Summary: ${forecast.summary}`,
  ].join("\n");
}
