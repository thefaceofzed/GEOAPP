import { useState, useCallback } from "react";
import type { DecisionBriefing } from "../../lib/intelligenceTypes";
import { generateBriefing } from "../../services/intelligenceService";

interface BriefingViewerProps {
  countryCode: string | null;
  countryName: string | null;
  actionKey: string;
  scenarioId: string | null;
}

function priorityColor(priority: string): string {
  if (priority === "high") return "border-red-500/30 bg-red-500/5";
  if (priority === "medium") return "border-orange-500/30 bg-orange-500/5";
  return "border-b-subtle bg-surface-alt";
}

function priorityBadge(priority: string): string {
  if (priority === "high") return "bg-red-500/20 text-red-400 dark:text-red-300";
  if (priority === "medium") return "bg-orange-500/20 text-orange-400 dark:text-orange-300";
  return "bg-surface-alt text-t-tertiary";
}

function confidenceBarColor(score: number): string {
  if (score >= 70) return "#34d399";
  if (score >= 45) return "#fbbf24";
  return "#f87171";
}

function buildMarkdownExport(briefing: DecisionBriefing): string {
  const lines: string[] = [];
  lines.push(`# ${briefing.headline}`);
  lines.push("");
  lines.push(`**Country:** ${briefing.countryName} (${briefing.countryCode})`);
  lines.push(`**Action:** ${briefing.actionLabel}`);
  lines.push(`**Confidence:** ${briefing.confidenceLevel} (${Math.round(briefing.confidenceScore)}/100)`);
  lines.push(`**Generated:** ${new Date(briefing.generatedAt).toLocaleString()}`);
  if (briefing.rulesVersion) lines.push(`**Rules version:** ${briefing.rulesVersion}`);
  lines.push("");
  if (briefing.keyRisks.length > 0) {
    lines.push("## Key Risks");
    briefing.keyRisks.forEach((r) => { lines.push(`### ${r.title} [${r.priority}]`); lines.push(r.content); lines.push(""); });
  }
  if (briefing.evidence.length > 0) {
    lines.push("## Evidence");
    briefing.evidence.forEach((e) => lines.push(`- **${e.title}**: ${e.content}`));
    lines.push("");
  }
  if (briefing.recommendedActions.length > 0) {
    lines.push("## Recommended Actions");
    briefing.recommendedActions.forEach((a) => lines.push(`- ${a}`));
    lines.push("");
  }
  if (briefing.limitations.length > 0) {
    lines.push("## Limitations");
    briefing.limitations.forEach((l) => lines.push(`- ${l}`));
  }
  return lines.join("\n");
}

export function BriefingViewer({ countryCode, countryName, actionKey, scenarioId }: BriefingViewerProps) {
  const [briefing, setBriefing] = useState<DecisionBriefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!countryCode) return;
    try {
      setLoading(true);
      setError(null);
      const data = await generateBriefing({ countryCode, actionKey, scenarioId: scenarioId ?? undefined });
      setBriefing(data);
    } catch { setError("Unable to generate briefing"); }
    finally { setLoading(false); }
  }, [countryCode, actionKey, scenarioId]);

  async function handleCopyMarkdown() {
    if (!briefing) return;
    await navigator.clipboard.writeText(buildMarkdownExport(briefing));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="rounded-panel border border-b-default bg-surface p-5 backdrop-blur-panel transition-colors shadow-panel">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono font-medium">Decision support</p>
          <h2 className="mt-2 font-display text-xl font-semibold text-t-primary italic">Intelligence Briefing</h2>
          <p className="mt-2 max-w-3xl text-sm text-t-secondary">
            Generate a structured decision brief combining scenario outcomes, live signals, and risk assessment.
          </p>
        </div>
        <div className="flex gap-2">
          {briefing && (
            <button
              className="rounded-full border border-b-subtle px-4 py-1.5 text-[10px] uppercase tracking-[0.25em] font-mono text-t-secondary transition hover:bg-surface-alt hover:text-t-primary"
              onClick={handleCopyMarkdown}
              type="button"
            >
              {copied ? "Copied" : "Export markdown"}
            </button>
          )}
          <button
            className="rounded-full border border-accent/30 bg-accent-soft px-5 py-1.5 text-[10px] uppercase tracking-[0.25em] font-mono text-accent transition hover:bg-accent/20 disabled:opacity-40"
            disabled={!countryCode || loading}
            onClick={handleGenerate}
            type="button"
          >
            {loading ? "Generating..." : briefing ? "Regenerate" : "Generate brief"}
          </button>
        </div>
      </div>

      {!countryCode && !briefing && (
        <div className="mt-6 rounded-card border border-b-subtle bg-surface-alt px-4 py-8 text-center text-sm text-t-tertiary shadow-raised">
          Select a country and action to generate an intelligence briefing
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-card border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
          {error}
        </div>
      )}

      {briefing && (
        <div className="mt-6 space-y-5">
          <div className="rounded-card border border-b-subtle bg-surface-alt p-5 shadow-raised">
            <h3 className="font-display text-xl font-semibold text-t-primary italic">{briefing.headline}</h3>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-mono text-t-tertiary">Confidence</span>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-2 w-24 rounded-full bg-surface-alt overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${briefing.confidenceScore}%`, backgroundColor: confidenceBarColor(briefing.confidenceScore) }} />
                  </div>
                  <span className="text-sm font-mono text-t-secondary">{Math.round(briefing.confidenceScore)}/100</span>
                  <span className="text-xs text-t-tertiary">{briefing.confidenceLevel}</span>
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-mono text-t-tertiary">Country</span>
                <p className="mt-1 text-sm text-t-secondary">{briefing.countryName}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-mono text-t-tertiary">Action</span>
                <p className="mt-1 text-sm text-t-secondary">{briefing.actionLabel}</p>
              </div>
            </div>
          </div>

          {briefing.keyRisks.length > 0 && (
            <div>
              <h4 className="text-[10px] uppercase tracking-widest font-mono text-t-tertiary mb-2">Key Risks</h4>
              <div className="space-y-2">
                {briefing.keyRisks.map((risk, i) => (
                  <div key={i} className={`rounded-card border p-4 ${priorityColor(risk.priority)}`}>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase font-mono ${priorityBadge(risk.priority)}`}>{risk.priority}</span>
                      <h5 className="font-medium text-t-secondary">{risk.title}</h5>
                    </div>
                    <p className="mt-1.5 text-sm text-t-secondary">{risk.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {briefing.evidence.length > 0 && (
            <div>
              <h4 className="text-[10px] uppercase tracking-widest font-mono text-t-tertiary mb-2">Evidence</h4>
              <div className="space-y-1.5">
                {briefing.evidence.map((ev, i) => (
                  <div key={i} className="rounded-card border border-b-subtle bg-surface-alt px-4 py-3 shadow-raised">
                    <span className="text-xs font-medium text-t-secondary">{ev.title}</span>
                    <p className="mt-1 text-sm text-t-tertiary">{ev.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {briefing.recommendedActions.length > 0 && (
            <div>
              <h4 className="text-[10px] uppercase tracking-widest font-mono text-t-tertiary mb-2">Recommended Actions</h4>
              <ul className="space-y-1.5">
                {briefing.recommendedActions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-t-secondary">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent/60 flex-shrink-0" />
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {briefing.limitations.length > 0 && (
            <div className="rounded-card border border-b-subtle bg-surface-alt p-4 shadow-raised">
              <h4 className="text-[10px] uppercase tracking-widest font-mono text-t-tertiary mb-2">Limitations</h4>
              <ul className="space-y-1">
                {briefing.limitations.map((lim, i) => (
                  <li key={i} className="text-xs text-t-tertiary">{lim}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
