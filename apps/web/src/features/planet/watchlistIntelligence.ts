import type { ForecastView, ObservedView } from "../../lib/types";
import { freshnessBand } from "./decisionSupport";
import type { WatchlistItem } from "./types";

export interface WatchlistIntelligenceCard {
  id: string;
  countryCode: string;
  countryCode3: string;
  countryName: string;
  actionKey: string;
  actionLabel: string;
  preferredMode: WatchlistItem["mode"];
  createdAt: string;
  alertState: "attention" | "watch" | "quiet";
  riskLabel: string;
  riskScore: number | null;
  signalCount: number;
  freshnessLabel: string;
  confidenceScore: number | null;
  summary: string;
  driverLabel: string | null;
}

export function buildWatchlistIntelligenceCard(
  item: WatchlistItem,
  observed: ObservedView | null,
  forecast: ForecastView | null,
): WatchlistIntelligenceCard {
  const leadSignal = observed?.signals[0] ?? null;
  const topDriver = forecast?.drivers[0] ?? null;

  return {
    id: item.id,
    countryCode: item.countryCode,
    countryCode3: item.countryCode3,
    countryName: item.countryName,
    actionKey: item.actionKey,
    actionLabel: item.actionLabel,
    preferredMode: item.mode,
    createdAt: item.createdAt,
    alertState:
      forecast && forecast.riskScore >= 55
        ? "attention"
        : observed && observed.signalCount >= 4
          ? "attention"
          : forecast && forecast.riskScore >= 30
            ? "watch"
            : observed && observed.signalCount > 0
              ? "watch"
              : "quiet",
    riskLabel: forecast?.riskLabel ?? (leadSignal ? "Observed only" : "No live reading"),
    riskScore: forecast ? Math.round(forecast.riskScore) : null,
    signalCount: observed?.signalCount ?? 0,
    freshnessLabel: freshnessBand(
      leadSignal?.publishedAt ?? observed?.generatedAt ?? forecast?.generatedAt ?? null,
    ),
    confidenceScore: forecast
      ? Math.round(forecast.confidenceScore)
      : leadSignal
        ? Math.round(leadSignal.confidenceScore)
        : null,
    summary:
      forecast?.summary ??
      leadSignal?.extractedSummary ??
      `No strong live signal is currently mapped for ${item.countryName}.`,
    driverLabel: topDriver?.label ?? leadSignal?.sourceName ?? null,
  };
}

export function sortWatchlistIntelligenceCards(cards: WatchlistIntelligenceCard[]) {
  return cards.slice().sort((left, right) => {
    const alertRank = (value: WatchlistIntelligenceCard["alertState"]) =>
      value === "attention" ? 3 : value === "watch" ? 2 : 1;

    const rankDelta = alertRank(right.alertState) - alertRank(left.alertState);
    if (rankDelta !== 0) {
      return rankDelta;
    }

    const rightRisk = right.riskScore ?? -1;
    const leftRisk = left.riskScore ?? -1;

    if (rightRisk !== leftRisk) {
      return rightRisk - leftRisk;
    }

    if (right.signalCount !== left.signalCount) {
      return right.signalCount - left.signalCount;
    }

    return left.countryName.localeCompare(right.countryName);
  });
}

export function summarizeWatchlistIntelligence(cards: WatchlistIntelligenceCard[]) {
  return cards.reduce(
    (summary, card) => {
      if (card.alertState === "attention") {
        summary.attentionCount += 1;
      } else if (card.alertState === "watch") {
        summary.watchCount += 1;
      } else {
        summary.quietCount += 1;
      }

      if (card.signalCount === 0 && card.riskScore == null) {
        summary.coverageGapCount += 1;
      }

      return summary;
    },
    {
      attentionCount: 0,
      watchCount: 0,
      quietCount: 0,
      coverageGapCount: 0,
    },
  );
}

export function buildWatchlistBrief(cards: WatchlistIntelligenceCard[]) {
  if (cards.length === 0) {
    return "Watchlist briefing\nNo tracked items are saved yet.";
  }

  return [
    "Watchlist briefing",
    ...cards.map(
      (card) =>
        `${card.countryName} | ${card.actionLabel}\nAlert: ${card.alertState.toUpperCase()} | Risk: ${card.riskLabel}${card.riskScore != null ? ` (${card.riskScore}/100)` : ""} | Signals: ${card.signalCount} | Freshness: ${card.freshnessLabel}\nConfidence: ${card.confidenceScore != null ? `${card.confidenceScore}/100` : "n/a"}\nSummary: ${card.summary}`,
    ),
  ].join("\n\n");
}
