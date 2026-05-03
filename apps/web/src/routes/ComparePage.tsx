import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { PageTransition } from "../components/PageTransition";
import { buildComparisonBrief } from "../features/planet/comparison";
import { severityBand, topAssetMoves } from "../features/planet/decisionSupport";
import { usePlanetStore } from "../store/planetStore";

export function ComparePage() {
  const { t } = useTranslation();
  const comparisonItems = usePlanetStore((s) => s.comparisonItems);
  const removeComparisonItem = usePlanetStore((s) => s.removeComparisonItem);
  const clearComparisonItems = usePlanetStore((s) => s.clearComparisonItems);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const rankedItems = comparisonItems.slice().sort((l, r) => r.severityScore - l.severityScore);
  const primary = rankedItems[0] ?? null;
  const baseline = rankedItems[0] ?? null;

  const largestMoveLabel = useMemo(() => {
    const ranked = comparisonItems
      .flatMap((item) => item.assets.map((asset) => ({
        scenarioLabel: `${item.countryName} / ${item.actionLabel}`,
        label: asset.label, delta: asset.delta, unit: asset.unit,
      })))
      .sort((l, r) => Math.abs(r.delta) - Math.abs(l.delta))[0];
    if (!ranked) return "No asset move data yet";
    return `${ranked.scenarioLabel}: ${ranked.label} ${ranked.delta >= 0 ? "+" : ""}${ranked.delta.toFixed(2)} ${ranked.unit}`;
  }, [comparisonItems]);

  async function handleCopyBrief() {
    await navigator.clipboard.writeText(buildComparisonBrief(rankedItems));
    setCopyMessage("Comparison brief copied.");
    window.setTimeout(() => setCopyMessage(null), 1800);
  }

  if (comparisonItems.length === 0) {
    return (
      <PageTransition>
        <section className="rounded-panel border border-b-default bg-surface p-4 sm:p-6 lg:p-8 backdrop-blur-panel shadow-panel transition-colors animate-panel-enter">
          <div className="flex items-center gap-3 mb-3">
            <span className="h-px w-6 bg-accent" />
            <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono font-medium">{t("compare.workspace")}</p>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold text-t-primary italic">{t("compare.empty_headline")}</h1>
          <p className="mt-3 max-w-3xl text-t-secondary leading-relaxed">
            {t("compare.empty_desc")}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link className="rounded-btn bg-accent px-5 py-3 text-center text-[11px] uppercase tracking-[0.2em] font-mono font-semibold text-white dark:text-[#080b12] transition hover:brightness-110 hover:shadow-glow-accent" to="/app">{t("compare.open_simulator")}</Link>
            <Link className="rounded-btn border border-b-default px-5 py-3 text-center text-[11px] uppercase tracking-[0.2em] font-mono text-t-secondary transition hover:border-accent/40 hover:text-accent" to="/account">{t("compare.open_account")}</Link>
          </div>
        </section>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-5">
        <section className="rounded-panel border border-b-default bg-surface p-5 backdrop-blur-panel shadow-panel transition-colors animate-panel-enter">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="h-px w-6 bg-accent" />
                <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono font-medium">{t("compare.workspace")}</p>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-semibold text-t-primary italic leading-tight">{t("compare.headline")}</h1>
              <p className="mt-3 max-w-4xl text-base text-t-secondary leading-relaxed">
                {t("compare.description")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-btn border border-b-subtle px-4 py-2 text-[10px] uppercase tracking-[0.25em] font-mono text-t-secondary transition hover:border-accent/40 hover:text-accent" onClick={handleCopyBrief} type="button">{t("compare.copy_brief")}</button>
              <button className="rounded-btn border border-b-subtle px-4 py-2 text-[10px] uppercase tracking-[0.25em] font-mono text-t-secondary transition hover:border-accent/40 hover:text-accent" onClick={clearComparisonItems} type="button">{t("compare.clear_all")}</button>
            </div>
          </div>
          {copyMessage && <p className="mt-4 text-sm text-accent font-mono">{copyMessage}</p>}
        </section>

        <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          <div className="rounded-panel border border-b-subtle bg-surface p-5 backdrop-blur-panel shadow-card transition-colors animate-panel-enter stagger-1">
            <p className="text-[10px] uppercase tracking-[0.25em] text-t-tertiary font-mono">{t("compare.highest_severity")}</p>
            <p className="mt-3 font-display text-3xl font-semibold text-t-primary italic">{primary ? primary.countryName : "n/a"}</p>
            <p className="mt-2 text-sm text-t-secondary font-mono tabular-nums">{primary ? `${primary.actionLabel} | ${severityBand(primary.severityScore)} (${Math.round(primary.severityScore)}/100)` : "No comparison data"}</p>
          </div>
          <div className="rounded-panel border border-b-subtle bg-surface p-5 backdrop-blur-panel shadow-card transition-colors animate-panel-enter stagger-2">
            <p className="text-[10px] uppercase tracking-[0.25em] text-t-tertiary font-mono">{t("compare.largest_move")}</p>
            <p className="mt-3 text-sm leading-6 text-t-secondary font-mono">{largestMoveLabel}</p>
          </div>
          <div className="rounded-panel border border-b-subtle bg-surface p-5 backdrop-blur-panel shadow-card transition-colors animate-panel-enter stagger-3">
            <p className="text-[10px] uppercase tracking-[0.25em] text-t-tertiary font-mono">{t("compare.evidence_leader")}</p>
            <p className="mt-3 font-mono text-3xl text-t-primary tabular-nums">{rankedItems.slice().sort((l, r) => r.evidenceCount - l.evidenceCount)[0]?.evidenceCount ?? 0}</p>
            <p className="mt-2 text-sm text-t-secondary">Attached supporting signals on the strongest evidence-backed scenario</p>
          </div>
        </section>

        <section className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {rankedItems.map((item, idx) => {
            const severityGap = baseline && baseline.id !== item.id ? Math.round(item.severityScore - baseline.severityScore) : 0;
            return (
              <article className={`rounded-panel border border-b-subtle bg-surface p-5 backdrop-blur-panel shadow-panel transition-all hover:shadow-glow-accent animate-panel-enter stagger-${Math.min(idx + 1, 6)}`} key={item.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.25em] text-accent font-mono">{item.countryName}</p>
                    <h2 className="mt-2 font-display text-3xl font-semibold text-t-primary italic">{item.actionLabel}</h2>
                  </div>
                  <div className="rounded-btn border border-b-subtle px-3 py-1 text-[9px] uppercase tracking-[0.2em] font-mono text-t-tertiary">{item.cacheState}</div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-card border border-b-subtle bg-surface-raised p-3 shadow-raised">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-t-tertiary font-mono">{t("compare.severity")}</p>
                    <p className="mt-2 font-display text-xl font-semibold text-t-primary italic">{severityBand(item.severityScore)}</p>
                    <p className="mt-1 text-sm text-t-secondary font-mono tabular-nums">{Math.round(item.severityScore)}/100{severityGap !== 0 ? ` | ${severityGap > 0 ? "+" : ""}${severityGap} vs leader` : ""}</p>
                  </div>
                  <div className="rounded-card border border-b-subtle bg-surface-raised p-3 shadow-raised">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-t-tertiary font-mono">{t("compare.evidence")}</p>
                    <p className="mt-2 font-mono text-xl text-t-primary tabular-nums">{item.evidenceCount}</p>
                    <p className="mt-1 text-sm text-t-secondary font-mono">{item.rulesVersion ?? "Local preview"}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-card border border-b-subtle bg-surface-raised p-4 shadow-raised">
                  <p className="text-sm text-t-secondary leading-relaxed">{item.narrative.summary}</p>
                </div>

                <div className="mt-4 space-y-3">
                  {topAssetMoves(item.assets).map((asset) => (
                    <div className="rounded-card border border-b-subtle bg-surface-alt p-3 shadow-raised" key={`${item.id}:${asset.key}`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-t-primary">{asset.label}</p>
                        <span className="text-sm text-t-secondary font-mono tabular-nums">{asset.delta >= 0 ? "+" : ""}{asset.delta.toFixed(2)} {asset.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-card border border-b-subtle bg-surface-alt p-3 text-sm text-t-secondary font-mono shadow-raised">{item.impactsCount} {t("common.impacted")}</div>
                  <div className="rounded-card border border-b-subtle bg-surface-alt p-3 text-sm text-t-secondary font-mono tabular-nums shadow-raised">{new Date(item.createdAt).toLocaleString()}</div>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button className="rounded-btn border border-b-subtle px-4 py-2.5 text-[10px] uppercase tracking-[0.25em] font-mono text-t-secondary transition hover:border-accent/40 hover:text-accent" onClick={() => removeComparisonItem(item.id)} type="button">{t("compare.remove")}</button>
                  <Link className="flex-1 rounded-btn bg-accent px-4 py-2.5 text-center text-[10px] uppercase tracking-[0.25em] font-mono font-semibold text-white dark:text-[#080b12] transition hover:brightness-110 hover:shadow-glow-accent" to={item.replayUrl}>{t("compare.open_scenario")}</Link>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </PageTransition>
  );
}
