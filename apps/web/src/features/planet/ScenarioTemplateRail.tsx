import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { actionByKey, scenarioTemplates } from "./planetCatalog";
import { countryByCca3 } from "./planetData";
import type { ScenarioTemplateDefinition } from "./types";

const badgeColors: Record<string, string> = {
  Flashpoint: "border-red-400/40 text-red-500 dark:text-red-300",
  Energy: "border-amber-400/40 text-amber-600 dark:text-amber-300",
  Conflict: "border-orange-400/40 text-orange-500 dark:text-orange-300",
  Trade: "border-blue-400/40 text-blue-600 dark:text-blue-300",
  Critical: "border-rose-500/40 text-rose-500 dark:text-rose-300",
  Cyber: "border-purple-400/40 text-purple-600 dark:text-purple-300",
  Opportunity: "border-emerald-400/40 text-emerald-600 dark:text-emerald-300",
  Finance: "border-yellow-400/40 text-yellow-600 dark:text-yellow-300",
};

interface ScenarioTemplateRailProps {
  onSelectTemplate: (template: ScenarioTemplateDefinition) => void;
}

export const ScenarioTemplateRail = memo(function ScenarioTemplateRail({ onSelectTemplate }: ScenarioTemplateRailProps) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? scenarioTemplates : scenarioTemplates.slice(0, 4);

  return (
    <section className="rounded-panel border border-b-default bg-surface p-5 backdrop-blur-panel shadow-panel transition-colors animate-panel-enter">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-px w-6 bg-accent" />
            <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono font-medium">{t("scenarios.quick_deploy")}</p>
          </div>
          <h2 className="mt-2 font-display text-2xl font-semibold text-t-primary italic">{t("scenarios.playbooks")}</h2>
          <p className="mt-2 max-w-3xl text-sm text-t-secondary leading-relaxed">
            {t("scenarios.description")}
          </p>
        </div>
        {scenarioTemplates.length > 4 && (
          <button
            className="rounded-btn border border-b-subtle px-4 py-1.5 text-[10px] uppercase tracking-[0.25em] text-t-tertiary font-mono transition hover:border-accent/40 hover:text-accent"
            onClick={() => setShowAll(!showAll)}
            type="button"
          >
            {showAll ? t("scenarios.show_less") : t("scenarios.show_all", { count: scenarioTemplates.length })}
          </button>
        )}
      </div>

      <div className="mt-5 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visible.map((template) => {
          const country = countryByCca3.get(template.countryCode3);
          const action = actionByKey.get(template.actionKey);
          const badgeStyle = badgeColors[template.badge] ?? "border-b-subtle text-accent";

          return (
            <button
              className="group rounded-card border border-b-subtle bg-surface-raised p-4 text-left shadow-raised transition-all hover:shadow-card hover:border-accent/20"
              key={template.id}
              onClick={() => onSelectTemplate(template)}
              type="button"
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`rounded-btn border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] font-mono ${badgeStyle}`}>
                  {template.badge}
                </span>
                <span className="rounded-btn bg-surface-alt px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-t-tertiary font-mono">
                  {template.mode}
                </span>
              </div>
              <h3 className="mt-3 font-display text-lg font-semibold text-t-primary italic group-hover:text-accent transition-colors leading-snug">
                {template.title}
              </h3>
              <p className="mt-1.5 line-clamp-2 text-xs text-t-secondary leading-relaxed">{template.description}</p>
              <div className="mt-3 flex items-center justify-between text-xs font-mono">
                <span className="text-t-secondary">{country?.name ?? template.countryCode3}</span>
                <span className="text-t-tertiary">{action?.shortLabel ?? template.actionKey}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
});
