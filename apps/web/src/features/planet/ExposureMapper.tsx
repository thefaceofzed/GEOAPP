import { useState, useCallback } from "react";
import type { ExposureProfile, ExposureAnalysis } from "../../lib/intelligenceTypes";
import type { PlanetSimulation } from "./types";
import { analyzeExposure } from "../../services/intelligenceService";

interface ExposureMapperProps {
  scenarioId: string | null;
  simulation: PlanetSimulation | null;
}

const presetCommodities = ["Brent Crude", "WTI", "Natural Gas", "Gold", "Copper", "Wheat", "Semiconductors"];
const presetFxPairs = ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CNY", "USD/RUB", "USD/TRY"];
const presetSectors = ["Energy", "Technology", "Defense", "Finance", "Agriculture", "Shipping", "Manufacturing"];

function severityColor(severity: string): string {
  if (severity === "CRITICAL") return "text-red-400";
  if (severity === "HIGH") return "text-orange-400";
  if (severity === "MEDIUM") return "text-yellow-400";
  return "text-emerald-400";
}

function deltaDisplay(delta: number, unit: string): { text: string; color: string } {
  const sign = delta >= 0 ? "+" : "";
  const color = delta >= 0 ? "text-emerald-400" : "text-red-400";
  return { text: `${sign}${delta.toFixed(1)}${unit === "%" ? "%" : " " + unit}`, color };
}

function ChipButton({ selected, onClick, label }: { selected: boolean; onClick: () => void; label: string }) {
  return (
    <button
      className={`rounded-full border px-3 py-1 text-xs transition ${
        selected
          ? "border-accent/40 bg-accent-soft text-accent"
          : "border-b-subtle text-t-tertiary hover:border-b-default hover:text-t-secondary"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

export function ExposureMapper({ scenarioId, simulation }: ExposureMapperProps) {
  const [profile, setProfile] = useState<ExposureProfile>({
    id: "user-default",
    label: "My Portfolio",
    countries: [],
    commodities: [],
    fxPairs: [],
    sectors: [],
  });
  const [analysis, setAnalysis] = useState<ExposureAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleItem = useCallback((field: keyof ExposureProfile, value: string) => {
    setProfile((prev) => {
      const list = prev[field] as string[];
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      return { ...prev, [field]: next };
    });
    setAnalysis(null);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!scenarioId) return;
    const totalSelections = profile.commodities.length + profile.fxPairs.length + profile.sectors.length;
    if (totalSelections === 0) return;
    try {
      setLoading(true);
      setError(null);
      const data = await analyzeExposure(scenarioId, profile);
      setAnalysis(data);
    } catch { setError("Unable to analyze exposure"); }
    finally { setLoading(false); }
  }, [scenarioId, profile]);

  const hasSelections = profile.commodities.length + profile.fxPairs.length + profile.sectors.length > 0;

  return (
    <section className="rounded-panel border border-b-default bg-surface p-5 backdrop-blur-panel transition-colors shadow-panel">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono font-medium">Personal risk</p>
        <h2 className="mt-2 font-display text-xl font-semibold text-t-primary italic">Exposure Mapper</h2>
        <p className="mt-2 max-w-3xl text-sm text-t-secondary">
          Define your portfolio exposure and see how active scenarios impact your specific assets, currencies, and sectors.
        </p>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <h4 className="text-[10px] uppercase tracking-widest font-mono text-t-tertiary mb-2">Commodities</h4>
          <div className="flex flex-wrap gap-1.5">
            {presetCommodities.map((c) => (
              <ChipButton key={c} selected={profile.commodities.includes(c)} onClick={() => toggleItem("commodities", c)} label={c} />
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-[10px] uppercase tracking-widest font-mono text-t-tertiary mb-2">FX Pairs</h4>
          <div className="flex flex-wrap gap-1.5">
            {presetFxPairs.map((fx) => (
              <ChipButton key={fx} selected={profile.fxPairs.includes(fx)} onClick={() => toggleItem("fxPairs", fx)} label={fx} />
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-[10px] uppercase tracking-widest font-mono text-t-tertiary mb-2">Sectors</h4>
          <div className="flex flex-wrap gap-1.5">
            {presetSectors.map((s) => (
              <ChipButton key={s} selected={profile.sectors.includes(s)} onClick={() => toggleItem("sectors", s)} label={s} />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="rounded-full border border-accent/30 bg-accent-soft px-5 py-2 text-[10px] uppercase tracking-[0.25em] font-mono text-accent transition hover:bg-accent/20 disabled:opacity-40"
            disabled={!scenarioId || !hasSelections || loading}
            onClick={handleAnalyze}
            type="button"
          >
            {loading ? "Analyzing..." : "Analyze exposure"}
          </button>
          {!scenarioId && <span className="text-xs text-t-tertiary">Run a simulation first to analyze exposure</span>}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-card border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
          {error}
        </div>
      )}

      {analysis && (
        <div className="mt-5 space-y-4">
          <div className="rounded-card border border-b-subtle bg-surface-alt p-4 shadow-raised">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-t-primary">Exposure Analysis</h4>
              <span className={`text-sm font-medium ${severityColor(analysis.overallSeverity)}`}>{analysis.overallSeverity}</span>
            </div>
            <p className="mt-2 text-sm text-t-secondary">{analysis.summary}</p>
          </div>

          {analysis.impacts.length > 0 && (
            <div className="space-y-1.5">
              {analysis.impacts.map((impact) => {
                const d = deltaDisplay(impact.delta, impact.unit);
                return (
                  <div key={impact.assetKey} className="flex items-center justify-between rounded-card border border-b-subtle bg-surface-alt px-4 py-3 shadow-raised">
                    <div>
                      <span className="text-sm text-t-secondary">{impact.assetLabel}</span>
                      <span className={`ml-2 text-xs font-mono ${severityColor(impact.severity)}`}>{impact.severity}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-medium font-mono ${d.color}`}>{d.text}</span>
                      {impact.percentChange !== 0 && (
                        <span className="ml-2 text-xs font-mono text-t-tertiary">({impact.percentChange >= 0 ? "+" : ""}{impact.percentChange.toFixed(1)}%)</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!analysis && simulation && scenarioId && hasSelections && !loading && (
        <div className="mt-4 rounded-card border border-b-subtle bg-surface-alt px-4 py-6 text-center text-sm text-t-tertiary shadow-raised">
          Click "Analyze exposure" to see how <strong className="text-t-secondary">{simulation.countryName} {simulation.actionLabel}</strong> impacts your selections
        </div>
      )}
    </section>
  );
}
