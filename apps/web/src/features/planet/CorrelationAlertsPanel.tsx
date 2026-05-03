import { useState, useEffect, useCallback } from "react";
import type { CorrelationAlert } from "../../lib/intelligenceTypes";
import { fetchCorrelations } from "../../services/intelligenceService";

const typeLabels: Record<string, { label: string; color: string }> = {
  CONVERGENCE: { label: "Convergence", color: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
  VELOCITY_SPIKE: { label: "Velocity Spike", color: "bg-orange-500/20 text-orange-300 border-orange-500/40" },
  NEWS_LEADS_MARKETS: { label: "News \u2192 Markets", color: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
  SILENT_DIVERGENCE: { label: "Silent Divergence", color: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
};

const severityOrder: Record<string, number> = {
  CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3,
};

function relativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function CorrelationAlertsPanel() {
  const [alerts, setAlerts] = useState<CorrelationAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchCorrelations();
      const sorted = [...data].sort((a, b) => {
        const severityDiff = (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99);
        if (severityDiff !== 0) return severityDiff;
        return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
      });
      setAlerts(sorted);
      setError(null);
    } catch {
      setError("Unable to load correlations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60_000);
    return () => clearInterval(interval);
  }, [loadData]);

  return (
    <section className="rounded-panel border border-b-subtle bg-surface p-5 backdrop-blur-panel">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono">
          Cross-stream
        </p>
        <h2 className="mt-2 font-display text-xl font-semibold text-t-primary italic">
          Correlation Alerts
        </h2>
      </div>

      {loading && (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-surface-alt animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && alerts.length === 0 && (
        <div className="mt-4 rounded-xl border border-b-subtle bg-surface-alt px-4 py-8 text-center text-sm text-t-tertiary">
          No cross-stream correlations detected in the current window
        </div>
      )}

      {!loading && !error && alerts.length > 0 && (
        <div className="mt-4 space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {alerts.map((alert) => {
            const typeInfo = typeLabels[alert.type] ?? {
              label: alert.type,
              color: "bg-surface-alt text-t-secondary border-b-default",
            };
            const isCritical = alert.severity === "CRITICAL";

            return (
              <div
                key={alert.id}
                className={`rounded-xl border border-b-subtle bg-surface-alt px-4 py-3 transition ${
                  isCritical ? "animate-pulse border-red-500/20" : "hover:bg-surface-alt"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wider font-mono ${typeInfo.color}`}>
                    {typeInfo.label}
                  </span>
                  <span className={`text-[10px] uppercase tracking-wider font-mono ${
                    alert.severity === "CRITICAL" ? "text-red-400"
                      : alert.severity === "HIGH" ? "text-orange-400"
                      : "text-t-tertiary"
                  }`}>
                    {alert.severity}
                  </span>
                  <span className="ml-auto text-[10px] font-mono text-t-tertiary">
                    {relativeTime(alert.detectedAt)}
                  </span>
                </div>

                <p className="mt-2 text-sm text-t-secondary">{alert.summary}</p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {alert.countries.map((c) => (
                    <span key={c} className="rounded-full bg-surface-alt px-2 py-0.5 text-[10px] text-t-tertiary">
                      {c}
                    </span>
                  ))}
                  <span className="ml-auto text-[10px] font-mono text-t-tertiary">
                    Confidence: {Math.round(alert.confidence * 100)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
