import { useMemo } from "react";
import type { ComparisonItem } from "./types";

interface ScenarioComparisonWorkspaceProps {
  items: ComparisonItem[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

function severityColor(score: number) {
  if (score >= 80) return "text-[#ffb4b2]";
  if (score >= 60) return "text-orange-300";
  if (score >= 40) return "text-[#fff1a7]";
  return "text-emerald-300";
}

function severityBarColor(score: number) {
  if (score >= 80) return "bg-[#ff5e5b]";
  if (score >= 60) return "bg-orange-400";
  if (score >= 40) return "bg-[#ffe16b]";
  return "bg-[#59d97d]";
}

function severityBorderColor(score: number) {
  if (score >= 80) return "border-[#ff5e5b]/25";
  if (score >= 60) return "border-orange-400/25";
  if (score >= 40) return "border-[#ffe16b]/25";
  return "border-[#59d97d]/25";
}

function cacheStateLabel(state: ComparisonItem["cacheState"]) {
  if (state === "fresh") return "Live";
  if (state === "cached") return "Cached";
  return "Local";
}

function cacheStateBadge(state: ComparisonItem["cacheState"]) {
  if (state === "fresh") return "border-[#59d97d]/30 bg-[#59d97d]/10 text-emerald-300";
  if (state === "cached") return "border-cyan-300/30 bg-cyan-200/10 text-cyan-300";
  return "border-white/15 bg-white/5 text-white/50";
}

function allAssetKeys(items: ComparisonItem[]): string[] {
  const keys = new Set<string>();
  for (const item of items) {
    for (const asset of item.assets) {
      keys.add(asset.key);
    }
  }
  return [...keys];
}

function findAssetDelta(item: ComparisonItem, key: string): number | null {
  const asset = item.assets.find((a) => a.key === key);
  return asset?.delta ?? null;
}

function deltaColor(delta: number | null) {
  if (delta === null) return "text-white/20";
  if (delta > 0) return "text-[#59d97d]";
  if (delta < 0) return "text-[#ff5e5b]";
  return "text-white/50";
}

function deltaSign(delta: number) {
  return delta > 0 ? "+" : "";
}

function isDivergent(key: string, items: ComparisonItem[]): boolean {
  const deltas = items.map((item) => findAssetDelta(item, key)).filter((d) => d !== null);
  if (deltas.length < 2) return false;
  const hasPositive = deltas.some((d) => d > 0);
  const hasNegative = deltas.some((d) => d < 0);
  return hasPositive && hasNegative;
}

export function ScenarioComparisonWorkspace({
  items,
  onRemove,
  onClear,
}: ScenarioComparisonWorkspaceProps) {
  const sorted = useMemo(
    () => [...items].sort((a, b) => b.severityScore - a.severityScore),
    [items],
  );

  const assetKeys = useMemo(() => allAssetKeys(items), [items]);
  const divergentKeys = useMemo(
    () => new Set(assetKeys.filter((k) => isDivergent(k, items))),
    [assetKeys, items],
  );

  if (items.length === 0) {
    return (
      <section className="rounded-[2rem] border border-white/10 bg-black/30 p-5 backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/72">
          Scenario workspace
        </p>
        <h2 className="mt-2 font-display text-2xl text-white sm:text-3xl">
          Comparison workspace
        </h2>
        <p className="mt-4 text-sm text-white/40">
          Add scenarios from the simulation results to compare them side by side. Up to 4
          scenarios can be analyzed concurrently.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-black/30 p-5 backdrop-blur-xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/72">
            Scenario workspace
          </p>
          <h2 className="mt-2 font-display text-2xl text-white sm:text-3xl">
            Comparison workspace
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/50">
            {items.length} scenario{items.length !== 1 ? "s" : ""}
          </span>
          <button
            className="rounded-[0.8rem] border border-white/10 px-3 py-1.5 text-xs text-white/50 transition hover:border-[#ff5e5b]/30 hover:text-[#ffb4b2]"
            onClick={onClear}
            type="button"
          >
            Clear all
          </button>
        </div>
      </div>

      <div className={`mt-5 grid gap-4 ${
        sorted.length === 1
          ? "grid-cols-1"
          : sorted.length === 2
            ? "sm:grid-cols-2"
            : sorted.length === 3
              ? "sm:grid-cols-2 lg:grid-cols-3"
              : "sm:grid-cols-2 lg:grid-cols-4"
      }`}>
        {sorted.map((item) => (
          <div
            className={`rounded-[1.4rem] border bg-black/20 p-4 ${severityBorderColor(item.severityScore)}`}
            key={item.id}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-white">{item.countryName}</p>
                <p className="text-xs text-white/40">{item.actionLabel}</p>
              </div>
              <button
                className="text-xs text-white/30 transition hover:text-[#ffb4b2]"
                onClick={() => onRemove(item.id)}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">Severity</span>
                <span className={`text-lg font-semibold ${severityColor(item.severityScore)}`}>
                  {item.severityScore}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full ${severityBarColor(item.severityScore)}`}
                  style={{ width: `${Math.min(100, item.severityScore)}%` }}
                />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-[0.8rem] border border-white/10 bg-black/20 px-2.5 py-1.5">
                <p className="text-[10px] text-white/35">Impacts</p>
                <p className="text-sm text-white">{item.impactsCount}</p>
              </div>
              <div className="rounded-[0.8rem] border border-white/10 bg-black/20 px-2.5 py-1.5">
                <p className="text-[10px] text-white/35">Evidence</p>
                <p className="text-sm text-white">{item.evidenceCount}</p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] ${cacheStateBadge(item.cacheState)}`}
              >
                {cacheStateLabel(item.cacheState)}
              </span>
              {item.rulesVersion && (
                <span className="text-[10px] text-white/25">v{item.rulesVersion}</span>
              )}
            </div>

            <p className="mt-3 line-clamp-2 text-xs leading-4 text-white/50">
              {item.narrative.headline}
            </p>
          </div>
        ))}
      </div>

      {assetKeys.length > 0 && (
        <div className="mt-5">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/72">
            Asset impact comparison
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-[0.15em] text-white/40">
                    Asset
                  </th>
                  {sorted.map((item) => (
                    <th
                      className="px-3 py-2 text-right text-xs uppercase tracking-[0.15em] text-white/40"
                      key={item.id}
                    >
                      {item.countryCode}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assetKeys.map((key) => (
                  <tr
                    className={`border-b border-white/5 ${
                      divergentKeys.has(key) ? "bg-purple-400/5" : ""
                    }`}
                    key={key}
                  >
                    <td className="px-3 py-2 text-white/70">
                      {key}
                      {divergentKeys.has(key) && (
                        <span className="ml-2 text-[10px] text-purple-300">divergent</span>
                      )}
                    </td>
                    {sorted.map((item) => {
                      const delta = findAssetDelta(item, key);
                      return (
                        <td className={`px-3 py-2 text-right ${deltaColor(delta)}`} key={item.id}>
                          {delta !== null ? `${deltaSign(delta)}${delta.toFixed(2)}` : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {divergentKeys.size > 0 && (
            <p className="mt-2 text-xs text-purple-300/60">
              {divergentKeys.size} asset{divergentKeys.size !== 1 ? "s" : ""} show divergent
              impacts across scenarios (highlighted in purple).
            </p>
          )}
        </div>
      )}
    </section>
  );
}
