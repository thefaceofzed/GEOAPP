import type {
  ForecastView,
  IntelligencePostureView,
  ObservedView,
  SimulationView,
} from "../../lib/types";
import type { IntelligenceStreamState } from "../../hooks/useIntelligenceStream";
import {
  buildIntelligenceCommandSnapshot,
  type IntelligenceCommandSnapshot,
} from "./decisionSupport";
import type {
  ConflictActionKey,
  ExperienceMode,
  PlanetCountry,
  PlanetSimulation,
} from "./types";

interface IntelligenceCommandCenterProps {
  selectedCountry: PlanetCountry | null;
  selectedActionKey: ConflictActionKey;
  mode: ExperienceMode;
  simulation: PlanetSimulation | null;
  simulationView: SimulationView | null;
  posture: IntelligencePostureView | null;
  observed: ObservedView | null;
  forecast: ForecastView | null;
  streamState: IntelligenceStreamState;
  busy: boolean;
  watchingSelection: boolean;
  alreadyCompared: boolean;
  onModeChange: (mode: ExperienceMode) => void;
  onRunSimulation: () => void;
  onToggleWatchlist: () => void;
  onAddToCompare: () => void;
}

const postureStyles: Record<
  IntelligenceCommandSnapshot["postureTone"],
  { badge: string; panel: string; meter: string }
> = {
  neutral: {
    badge: "border-b-subtle bg-surface-alt text-t-secondary",
    panel: "border-b-default bg-surface",
    meter: "bg-gray-400",
  },
  gap: {
    badge: "border-amber-300/25 bg-amber-300/10 text-amber-700 dark:text-amber-100",
    panel: "border-amber-300/20 bg-amber-50 dark:bg-amber-300/10",
    meter: "bg-amber-400",
  },
  monitor: {
    badge: "border-cyan-300/25 bg-cyan-200/10 text-cyan-700 dark:text-cyan-100",
    panel: "border-cyan-300/20 bg-cyan-50 dark:bg-cyan-200/10",
    meter: "bg-cyan-400",
  },
  watch: {
    badge: "border-yellow-400/30 bg-yellow-400/10 text-yellow-700 dark:text-[#fff1a7]",
    panel: "border-yellow-400/20 bg-yellow-50 dark:bg-[#ffe16b]/10",
    meter: "bg-yellow-400",
  },
  escalate: {
    badge: "border-red-500/35 bg-red-500/10 text-red-700 dark:text-[#ffb4b2]",
    panel: "border-red-500/20 bg-red-50 dark:bg-[#ff5e5b]/10",
    meter: "bg-red-500",
  },
};

function sourceStateClass(state: IntelligenceCommandSnapshot["sourceCoverage"][number]["state"]) {
  if (state === "ready") return "border-cyan-300/20 bg-cyan-50 dark:bg-cyan-200/10";
  if (state === "partial") return "border-amber-300/20 bg-amber-50 dark:bg-amber-300/10";
  return "border-b-subtle bg-surface-raised";
}

function modeButtonClass(active: boolean) {
  return active
    ? "border-accent/45 bg-accent-soft text-t-primary"
    : "border-b-subtle bg-surface-raised text-t-secondary hover:border-b-default hover:text-t-primary";
}

function normalizePostureTone(value: string): IntelligenceCommandSnapshot["postureTone"] {
  return ["neutral", "gap", "monitor", "watch", "escalate"].includes(value)
    ? (value as IntelligenceCommandSnapshot["postureTone"])
    : "gap";
}

function normalizePostureLabel(value: string): IntelligenceCommandSnapshot["posture"] {
  return ["Select target", "Coverage gap", "Monitor", "Watch", "Escalate"].includes(value)
    ? (value as IntelligenceCommandSnapshot["posture"])
    : "Coverage gap";
}

function normalizeSourceState(
  value: string,
): IntelligenceCommandSnapshot["sourceCoverage"][number]["state"] {
  return ["ready", "partial", "missing"].includes(value)
    ? (value as IntelligenceCommandSnapshot["sourceCoverage"][number]["state"])
    : "partial";
}

function mergeBackendPosture(
  local: IntelligenceCommandSnapshot,
  posture: IntelligencePostureView | null,
): IntelligenceCommandSnapshot {
  if (!posture) return local;
  return {
    ...local,
    posture: normalizePostureLabel(posture.posture),
    postureTone: normalizePostureTone(posture.postureTone),
    intelligenceScore: posture.intelligenceScore,
    confidenceScore: posture.confidenceScore,
    evidenceCount: posture.evidenceCount,
    signalCount: posture.signalCount,
    driverCount: posture.driverCount,
    freshnessLabel: posture.freshnessLabel,
    riskLabel: posture.riskLabel,
    primaryFinding: posture.primaryFinding,
    recommendedAction: posture.recommendedAction,
    nextSteps: posture.nextSteps,
    sourceCoverage: posture.sourceCoverage.map((source) => ({
      ...source,
      state: normalizeSourceState(source.state),
    })),
  };
}

export function IntelligenceCommandCenter({
  selectedCountry,
  selectedActionKey,
  mode,
  simulation,
  simulationView,
  posture,
  observed,
  forecast,
  streamState,
  busy,
  watchingSelection,
  alreadyCompared,
  onModeChange,
  onRunSimulation,
  onToggleWatchlist,
  onAddToCompare,
}: IntelligenceCommandCenterProps) {
  const snapshot = mergeBackendPosture(
    buildIntelligenceCommandSnapshot({
      country: selectedCountry,
      actionKey: selectedActionKey,
      simulation,
      simulationView,
      observed,
      forecast,
      watched: watchingSelection,
      compared: alreadyCompared,
    }),
    posture,
  );
  const styles = postureStyles[snapshot.postureTone];
  const scoreWidth = `${snapshot.intelligenceScore ?? 0}%`;
  const confidenceLabel = snapshot.confidenceScore == null ? "n/a" : `${snapshot.confidenceScore}/100`;

  return (
    <section className={`rounded-panel border p-5 backdrop-blur-panel transition-colors ${styles.panel}`}>
      <div className="grid gap-5 grid-cols-1 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono font-medium">Intelligence command center</p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-t-primary italic sm:text-4xl">
                {selectedCountry ? `${selectedCountry.name} risk posture` : "Build a decision-ready posture"}
              </h2>
            </div>
            <div className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-widest font-mono ${styles.badge}`}>
              {snapshot.posture}
            </div>
          </div>

          <p className="mt-4 max-w-4xl text-sm leading-6 text-t-secondary">{snapshot.primaryFinding}</p>

          <div className="mt-5 grid gap-3 grid-cols-2 sm:grid-cols-4">
            <div className="rounded-card border border-b-subtle bg-surface-raised p-3 shadow-raised">
              <p className="text-[10px] uppercase tracking-widest text-t-tertiary font-mono">Intelligence index</p>
              <p className="mt-2 text-2xl font-mono text-t-primary">{snapshot.intelligenceScore == null ? "n/a" : `${snapshot.intelligenceScore}/100`}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-alt">
                <div className={`h-full ${styles.meter}`} style={{ width: scoreWidth }} />
              </div>
            </div>
            <div className="rounded-card border border-b-subtle bg-surface-raised p-3 shadow-raised">
              <p className="text-[10px] uppercase tracking-widest text-t-tertiary font-mono">Confidence</p>
              <p className="mt-2 text-2xl font-mono text-t-primary">{confidenceLabel}</p>
              <p className="mt-2 text-sm text-t-secondary">{snapshot.freshnessLabel}</p>
            </div>
            <div className="rounded-card border border-b-subtle bg-surface-raised p-3 shadow-raised">
              <p className="text-[10px] uppercase tracking-widest text-t-tertiary font-mono">Evidence</p>
              <p className="mt-2 text-2xl font-mono text-t-primary">{snapshot.evidenceCount}</p>
              <p className="mt-2 text-sm text-t-secondary">{snapshot.riskLabel}</p>
            </div>
            <div className="rounded-card border border-b-subtle bg-surface-raised p-3 shadow-raised">
              <p className="text-[10px] uppercase tracking-widest text-t-tertiary font-mono">Stream</p>
              <p className="mt-2 text-2xl font-mono text-t-primary capitalize">{streamState}</p>
              <p className="mt-2 text-sm text-t-secondary">{snapshot.signalCount} observed signals</p>
            </div>
          </div>

          <div className="mt-5 rounded-card border border-b-subtle bg-surface-raised p-4 shadow-raised">
            <p className="text-[10px] uppercase tracking-widest text-accent font-mono">Recommended action</p>
            <p className="mt-3 text-base text-t-secondary">{snapshot.recommendedAction}</p>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {snapshot.nextSteps.map((step) => (
                <div className="rounded-btn border border-b-subtle bg-surface-alt px-3 py-2 text-sm text-t-secondary" key={step}>
                  {step}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-panel border border-b-subtle bg-surface-raised p-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono font-medium">Lens controls</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(["observed", "simulate", "forecast"] as const).map((nextMode) => (
                <button
                  className={`rounded-card border px-3 py-3 text-sm transition ${modeButtonClass(nextMode === mode)}`}
                  key={nextMode}
                  onClick={() => onModeChange(nextMode)}
                  type="button"
                >
                  {nextMode}
                </button>
              ))}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                className="rounded-card bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!selectedCountry || busy}
                onClick={onRunSimulation}
                type="button"
              >
                {busy ? "Running..." : "Run deterministic scenario"}
              </button>
              <button
                className="rounded-card border border-b-subtle px-4 py-3 text-sm text-t-secondary transition hover:border-b-default hover:text-t-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!selectedCountry}
                onClick={onToggleWatchlist}
                type="button"
              >
                {watchingSelection ? "Remove from watchlist" : "Save to watchlist"}
              </button>
              <button
                className="rounded-card border border-b-subtle px-4 py-3 text-sm text-t-secondary transition hover:border-b-default hover:text-t-primary disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2"
                disabled={!simulation || alreadyCompared}
                onClick={onAddToCompare}
                type="button"
              >
                {alreadyCompared ? "Scenario already in comparison" : "Add scenario to comparison"}
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {snapshot.sourceCoverage.map((source) => (
              <div className={`rounded-card border p-3 ${sourceStateClass(source.state)}`} key={source.label}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] uppercase tracking-widest text-t-tertiary font-mono">{source.label}</p>
                  <p className="text-lg font-mono text-t-primary">{source.value}</p>
                </div>
                <p className="mt-2 text-sm leading-5 text-t-secondary">{source.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
