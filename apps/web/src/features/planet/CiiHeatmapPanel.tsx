import { useState, useEffect, useCallback } from "react";
import type { CiiSnapshot, CiiScore } from "../../lib/intelligenceTypes";
import { fetchCiiScores } from "../../services/intelligenceService";

interface CiiHeatmapPanelProps {
  onSelectCountry: (countryCode3: string) => void;
}

const cca2ToCca3: Record<string, string> = {
  US: "USA", RU: "RUS", CN: "CHN", UA: "UKR", IR: "IRN", IL: "ISR",
  TW: "TWN", KP: "PRK", SA: "SAU", TR: "TUR", PL: "POL", DE: "DEU",
  FR: "FRA", GB: "GBR", IN: "IND", PK: "PAK", SY: "SYR", YE: "YEM",
  MM: "MMR", VE: "VEN", CU: "CUB", MX: "MEX", BR: "BRA", AE: "ARE",
};

function scoreColor(score: number): string {
  if (score >= 70) return "text-red-400";
  if (score >= 50) return "text-orange-400";
  if (score >= 30) return "text-yellow-400";
  return "text-emerald-400";
}

function scoreBg(score: number): string {
  if (score >= 70) return "bg-red-500/20 border-red-500/30";
  if (score >= 50) return "bg-orange-500/20 border-orange-500/30";
  if (score >= 30) return "bg-yellow-500/20 border-yellow-500/30";
  return "bg-emerald-500/20 border-emerald-500/30";
}

function trendIcon(trend: string): string {
  if (trend === "rising") return "\u2191";
  if (trend === "falling") return "\u2193";
  return "\u2192";
}

function trendColor(trend: string): string {
  if (trend === "rising") return "text-red-400";
  if (trend === "falling") return "text-emerald-400";
  return "text-t-tertiary";
}

function SubScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-[10px] uppercase tracking-wider font-mono text-t-tertiary">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-surface-alt overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(100, value)}%`,
            backgroundColor: value >= 70 ? "#f87171" : value >= 50 ? "#fb923c" : value >= 30 ? "#fbbf24" : "#34d399",
          }}
        />
      </div>
      <span className="w-8 text-right text-[10px] font-mono text-t-tertiary">{Math.round(value)}</span>
    </div>
  );
}

export function CiiHeatmapPanel({ onSelectCountry }: CiiHeatmapPanelProps) {
  const [snapshot, setSnapshot] = useState<CiiSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchCiiScores();
      setSnapshot(data);
      setError(null);
    } catch {
      setError("Unable to load CII scores");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30_000);
    return () => clearInterval(interval);
  }, [loadData]);

  function handleCountryClick(score: CiiScore) {
    const cca3 = cca2ToCca3[score.countryCode];
    if (cca3) onSelectCountry(cca3);
    setExpanded(expanded === score.countryCode ? null : score.countryCode);
  }

  return (
    <section className="rounded-panel border border-b-subtle bg-surface p-5 backdrop-blur-panel">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono">
            Live intelligence
          </p>
          <h2 className="mt-2 font-display text-xl font-semibold text-t-primary italic">
            Country Instability Index
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-t-tertiary">
            Composite 0-100 score blending baseline structural risk with live event signals
            across unrest, conflict, security, and information channels.
          </p>
        </div>
        {snapshot && (
          <div className={`rounded-2xl border px-4 py-2 ${scoreBg(snapshot.globalRiskScore)}`}>
            <p className="text-[10px] uppercase tracking-wider font-mono text-t-tertiary">Global risk</p>
            <p className={`text-2xl font-bold font-mono ${scoreColor(snapshot.globalRiskScore)}`}>
              {Math.round(snapshot.globalRiskScore)}
              <span className="ml-1.5 text-sm font-normal text-t-tertiary">
                {snapshot.globalRiskLevel}
              </span>
            </p>
          </div>
        )}
      </div>

      {loading && (
        <div className="mt-6 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-surface-alt animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {snapshot && !loading && (
        <div className="mt-4 space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
          {snapshot.scores.map((score) => (
            <div key={score.countryCode}>
              <button
                className="w-full rounded-xl border border-b-subtle bg-surface-alt px-4 py-3 text-left transition hover:bg-surface-alt hover:border-b-subtle hover:shadow-raised"
                onClick={() => handleCountryClick(score)}
                type="button"
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg border text-lg font-bold ${scoreBg(score.combinedScore)} ${scoreColor(score.combinedScore)}`}>
                    {Math.round(score.combinedScore)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-t-primary truncate">{score.countryName}</span>
                      <span className="text-xs font-mono text-t-tertiary">{score.countryCode}</span>
                      <span className={`text-sm ${trendColor(score.trend)}`}>
                        {trendIcon(score.trend)}
                      </span>
                    </div>
                    <div className="mt-1 flex gap-3 text-[10px] font-mono text-t-tertiary">
                      <span>Signals: {score.signalCount}</span>
                      <span>Base: {Math.round(score.baselineRisk)}</span>
                      <span>Event: {Math.round(score.eventScore)}</span>
                    </div>
                  </div>
                  <div className="flex-1 max-w-[200px] hidden sm:block">
                    <div className="h-2 rounded-full bg-surface-alt overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${score.combinedScore}%`,
                          backgroundColor: score.combinedScore >= 70 ? "#f87171"
                            : score.combinedScore >= 50 ? "#fb923c"
                            : score.combinedScore >= 30 ? "#fbbf24"
                            : "#34d399",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </button>

              {expanded === score.countryCode && (
                <div className="mx-4 mt-1 mb-2 rounded-xl border border-b-subtle bg-surface-alt p-4 space-y-2">
                  <SubScoreBar label="Unrest" value={score.unrestScore} />
                  <SubScoreBar label="Conflict" value={score.conflictScore} />
                  <SubScoreBar label="Security" value={score.securityScore} />
                  <SubScoreBar label="Info" value={score.informationScore} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
