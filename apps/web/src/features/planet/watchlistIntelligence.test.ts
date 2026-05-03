import { describe, expect, it } from "vitest";
import type { ForecastView, ObservedView } from "../../lib/types";
import type { WatchlistItem } from "./types";
import {
  buildWatchlistIntelligenceCard,
  sortWatchlistIntelligenceCards,
} from "./watchlistIntelligence";

const baseItem: WatchlistItem = {
  id: "usa:war",
  countryCode: "US",
  countryCode3: "USA",
  countryName: "United States",
  actionKey: "war",
  actionLabel: "Armed conflict",
  mode: "simulate",
  createdAt: "2026-04-18T00:00:00.000Z",
};

describe("watchlistIntelligence", () => {
  it("prefers forecast data when it exists", () => {
    const observed: ObservedView = {
      generatedAt: "2026-04-18T00:00:00.000Z",
      countryCode: "US",
      countryName: "United States",
      actionKey: "war",
      signalCount: 2,
      signals: [
        {
          sourceName: "Wire",
          sourceType: "api",
          url: "https://example.com/1",
          publishedAt: "2026-04-18T00:00:00.000Z",
          countryCodes: ["US"],
          topicTags: ["security"],
          signalType: "news",
          sentiment: "negative",
          severityScore: 74,
          extractedSummary: "Observed escalation.",
          rawReferenceId: "sig-1",
          relevanceScore: 0.88,
          confidenceScore: 71,
        },
      ],
    };

    const forecast: ForecastView = {
      generatedAt: "2026-04-18T00:00:00.000Z",
      countryCode: "US",
      countryName: "United States",
      actionKey: "war",
      horizonDays: 14,
      riskScore: 82,
      riskLabel: "Severe",
      confidenceScore: 67,
      summary: "Forecast risk remains severe over the next two weeks.",
      drivers: [
        {
          factorKey: "energy",
          label: "Energy corridor strain",
          weight: 0.42,
          explanation: "Shipping disruptions are tightening energy pricing.",
          sourceName: "Wire",
          rawReferenceId: "driver-1",
          publishedAt: "2026-04-18T00:00:00.000Z",
        },
      ],
    };

    const card = buildWatchlistIntelligenceCard(baseItem, observed, forecast);

    expect(card.riskLabel).toBe("Severe");
    expect(card.riskScore).toBe(82);
    expect(card.confidenceScore).toBe(67);
    expect(card.summary).toContain("Forecast risk remains severe");
    expect(card.driverLabel).toBe("Energy corridor strain");
  });

  it("falls back to observed data when forecast is unavailable", () => {
    const observed: ObservedView = {
      generatedAt: "2026-04-18T00:00:00.000Z",
      countryCode: "US",
      countryName: "United States",
      actionKey: "war",
      signalCount: 1,
      signals: [
        {
          sourceName: "GDELT",
          sourceType: "api",
          url: "https://example.com/2",
          publishedAt: "2026-04-18T00:00:00.000Z",
          countryCodes: ["US"],
          topicTags: ["security"],
          signalType: "news",
          sentiment: "negative",
          severityScore: 68,
          extractedSummary: "Observed signal summary.",
          rawReferenceId: "sig-2",
          relevanceScore: 0.92,
          confidenceScore: 64,
        },
      ],
    };

    const card = buildWatchlistIntelligenceCard(baseItem, observed, null);

    expect(card.riskLabel).toBe("Observed only");
    expect(card.riskScore).toBeNull();
    expect(card.signalCount).toBe(1);
    expect(card.confidenceScore).toBe(64);
    expect(card.summary).toBe("Observed signal summary.");
    expect(card.driverLabel).toBe("GDELT");
  });

  it("sorts cards by risk score and then signal count", () => {
    const sorted = sortWatchlistIntelligenceCards([
      {
        id: "a",
        countryCode: "AA",
        countryCode3: "AAA",
        countryName: "B",
        actionKey: "war",
        actionLabel: "A",
        preferredMode: "simulate",
        createdAt: "2026-04-18T00:00:00.000Z",
        alertState: "attention",
        riskLabel: "Observed only",
        riskScore: null,
        signalCount: 4,
        freshnessLabel: "Fresh",
        confidenceScore: 60,
        summary: "Observed only",
        driverLabel: null,
      },
      {
        id: "b",
        countryCode: "BB",
        countryCode3: "BBB",
        countryName: "A",
        actionKey: "war",
        actionLabel: "A",
        preferredMode: "simulate",
        createdAt: "2026-04-18T00:00:00.000Z",
        alertState: "attention",
        riskLabel: "High",
        riskScore: 61,
        signalCount: 1,
        freshnessLabel: "Fresh",
        confidenceScore: 61,
        summary: "High risk",
        driverLabel: null,
      },
      {
        id: "c",
        countryCode: "CC",
        countryCode3: "CCC",
        countryName: "C",
        actionKey: "war",
        actionLabel: "A",
        preferredMode: "simulate",
        createdAt: "2026-04-18T00:00:00.000Z",
        alertState: "attention",
        riskLabel: "Elevated",
        riskScore: 61,
        signalCount: 3,
        freshnessLabel: "Fresh",
        confidenceScore: 55,
        summary: "Elevated risk",
        driverLabel: null,
      },
    ]);

    expect(sorted.map((card) => card.id)).toEqual(["c", "b", "a"]);
  });
});
