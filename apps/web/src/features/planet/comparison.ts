import type { SimulationView } from "../../lib/types";
import { severityBand, topAssetMoves } from "./decisionSupport";
import type { ComparisonItem, PlanetSimulation } from "./types";

export function buildComparisonItem(
  simulation: PlanetSimulation,
  simulationView: SimulationView | null,
): ComparisonItem {
  const cacheState: ComparisonItem["cacheState"] =
    simulationView == null
      ? "local"
      : simulationView.cached
        ? "cached"
        : "fresh";

  return {
    id: simulation.simulationId ?? simulation.id,
    countryCode: simulation.countryCode,
    countryCode3: simulation.countryCode3,
    countryName: simulation.countryName,
    actionKey: simulation.actionKey,
    actionLabel: simulation.actionLabel,
    createdAt: simulation.createdAt,
    severityScore: simulation.severityScore,
    narrative: simulation.narrative,
    assets: simulation.assets,
    impactsCount: simulation.impacts.length,
    replayUrl: simulation.replayUrl,
    rulesVersion: simulationView?.rulesVersion ?? null,
    evidenceCount: simulationView?.supportingSignals.length ?? 0,
    cacheState,
    sourceMode: simulation.mode,
  };
}

export function buildComparisonBrief(items: ComparisonItem[]) {
  const rankedItems = items
    .slice()
    .sort((left, right) => right.severityScore - left.severityScore);

  if (rankedItems.length === 0) {
    return "No comparison scenarios selected yet.";
  }

  const leader = rankedItems[0];
  const lines = rankedItems.map((item, index) => {
    const topMoves = topAssetMoves(item.assets, 2)
      .map(
        (asset) =>
          `${asset.label} ${asset.delta >= 0 ? "+" : ""}${asset.delta.toFixed(2)} ${asset.unit}`,
      )
      .join(" | ");

    return [
      `${index + 1}. ${item.countryName} | ${item.actionLabel}`,
      `Severity: ${severityBand(item.severityScore)} (${Math.round(item.severityScore)}/100)`,
      `Evidence: ${item.evidenceCount} supporting signal(s) | Rules: ${item.rulesVersion ?? "local-preview"}`,
      `Impacts: ${item.impactsCount} states | Cache: ${item.cacheState}`,
      `Top moves: ${topMoves || "No asset moves available"}`,
      `Summary: ${item.narrative.summary}`,
    ].join("\n");
  });

  return [
    "Comparison brief",
    `Priority scenario: ${leader.countryName} | ${leader.actionLabel}`,
    `Reason: ${severityBand(leader.severityScore)} severity with ${leader.evidenceCount} supporting signal(s).`,
    "",
    ...lines,
  ].join("\n\n");
}
