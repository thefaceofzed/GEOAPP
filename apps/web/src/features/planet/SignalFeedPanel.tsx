import { useState, useEffect, useCallback } from "react";
import type { GeoSignal } from "../../lib/intelligenceTypes";
import { fetchGeoSignals } from "../../services/intelligenceService";

interface SignalFeedPanelProps {
  selectedCountryCode: string | null;
}

const severityBadge: Record<string, { bg: string; text: string }> = {
  CRITICAL: { bg: "bg-red-500/20 border-red-500/40", text: "text-red-300" },
  HIGH: { bg: "bg-orange-500/20 border-orange-500/40", text: "text-orange-300" },
  MEDIUM: { bg: "bg-yellow-500/20 border-yellow-500/40", text: "text-yellow-300" },
  LOW: { bg: "bg-emerald-500/20 border-emerald-500/40", text: "text-emerald-300" },
};

const sourceTypeLabel: Record<string, string> = {
  NEWS: "News",
  COMMODITY_MOVE: "Commodity",
  FX_MOVE: "FX",
  SANCTIONS_CHANGE: "Sanctions",
  MACRO_RELEASE: "Macro",
  TRADE_FLOW: "Trade",
  CONFLICT_EVENT: "Conflict",
};

function relativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type SeverityFilter = "ALL" | "CRITICAL" | "HIGH" | "MEDIUM";

export function SignalFeedPanel({ selectedCountryCode }: SignalFeedPanelProps) {
  const [signals, setSignals] = useState<GeoSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<SeverityFilter>("ALL");

  const loadData = useCallback(async () => {
    try {
      const data = await fetchGeoSignals(selectedCountryCode ?? undefined, 24);
      setSignals(data);
      setError(null);
    } catch {
      setError("Unable to load signals");
    } finally {
      setLoading(false);
    }
  }, [selectedCountryCode]);

  useEffect(() => {
    setLoading(true);
    loadData();
    const interval = setInterval(loadData, 30_000);
    return () => clearInterval(interval);
  }, [loadData]);

  const filtered = filter === "ALL"
    ? signals
    : signals.filter((s) => s.severity === filter);

  const filters: SeverityFilter[] = ["ALL", "CRITICAL", "HIGH", "MEDIUM"];

  return (
    <section className="rounded-panel border border-b-subtle bg-surface p-5 backdrop-blur-panel">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono">
            Real-time
          </p>
          <h2 className="mt-2 font-display text-xl font-semibold text-t-primary italic">Signal Feed</h2>
        </div>
        <div className="flex gap-1.5">
          {filters.map((f) => (
            <button
              key={f}
              className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-wider font-mono transition ${
                filter === f
                  ? "bg-surface-alt text-t-primary border border-b-default"
                  : "text-t-tertiary hover:text-t-secondary border border-transparent"
              }`}
              onClick={() => setFilter(f)}
              type="button"
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-surface-alt animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="mt-4 rounded-xl border border-b-subtle bg-surface-alt px-4 py-8 text-center text-sm text-t-tertiary">
          {signals.length === 0
            ? "No signals detected in the last 24 hours"
            : `No ${filter} severity signals found`}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="mt-4 space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
          {filtered.map((signal) => {
            const badge = severityBadge[signal.severity] ?? severityBadge.LOW;
            return (
              <div
                key={signal.id}
                className="rounded-xl border border-b-subtle bg-surface-alt px-4 py-3 transition hover:bg-surface-alt"
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wider font-mono ${badge.bg} ${badge.text}`}>
                    {signal.severity}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-t-tertiary">
                      <span className="font-medium text-t-secondary">
                        {sourceTypeLabel[signal.sourceType] ?? signal.sourceType}
                      </span>
                      <span>{signal.country}</span>
                      <span className="ml-auto font-mono">{relativeTime(signal.timestamp)}</span>
                    </div>
                    <p className="mt-1 text-sm text-t-secondary line-clamp-2">{signal.summary}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
