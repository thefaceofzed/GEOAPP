import {
  buildIntelligenceCommandSnapshot,
  buildForecastBrief,
  buildObservedBrief,
  buildSimulationBrief,
  freshnessBand,
  severityBand,
} from "./decisionSupport";
import { findCountryByCode } from "./planetData";
import { createPlanetSimulation } from "./impactEngine";

describe("decisionSupport", () => {
  it("classifies severity bands consistently", () => {
    expect(severityBand(82)).toBe("Severe");
    expect(severityBand(62)).toBe("High");
    expect(severityBand(40)).toBe("Elevated");
    expect(severityBand(18)).toBe("Low");
  });

  it("builds a deterministic simulation brief", () => {
    const country = findCountryByCode("MA");
    const simulation = createPlanetSimulation(country!, "sanctions", {
      simulationsRemaining: 2,
      unlimited: false,
    });

    const brief = buildSimulationBrief(country!, simulation, null);

    expect(brief).toContain("Financial Sanctions around Morocco");
    expect(brief).toContain("Rules version: local-preview");
  });

  it("builds observed and forecast briefs with actionable framing", () => {
    const country = findCountryByCode("JP");

    const observedBrief = buildObservedBrief(country!, "war", {
      generatedAt: new Date().toISOString(),
      countryCode: "JP",
      countryName: "Japan",
      actionKey: "war",
      signalCount: 1,
      signals: [
        {
          sourceName: "GDELT",
          sourceType: "api",
          url: "https://example.com",
          publishedAt: new Date().toISOString(),
          countryCodes: ["JP"],
          topicTags: ["war"],
          signalType: "NEWS_HEADLINE",
          sentiment: "negative",
          severityScore: 81,
          extractedSummary: "Shipping tension is climbing around Japan.",
          rawReferenceId: "sig-1",
          relevanceScore: 0.91,
          confidenceScore: 77,
        },
      ],
    });

    const forecastBrief = buildForecastBrief(country!, "war", {
      generatedAt: new Date().toISOString(),
      countryCode: "JP",
      countryName: "Japan",
      actionKey: "war",
      horizonDays: 30,
      riskScore: 71,
      riskLabel: "High",
      confidenceScore: 68,
      summary: "War risk around Japan is rising on recent shipping and regional stress signals.",
      drivers: [
        {
          factorKey: "driver-1",
          label: "Shipping stress",
          weight: 0.72,
          explanation: "Insurance and routing costs are rising.",
          sourceName: "GDELT",
          rawReferenceId: "sig-1",
          publishedAt: new Date().toISOString(),
        },
      ],
    });

    expect(observedBrief).toContain("Observed signal brief for Japan");
    expect(forecastBrief).toContain("Risk: High (71/100)");
  });

  it("fuses signals into an escalation posture", () => {
    const country = findCountryByCode("JP");
    const snapshot = buildIntelligenceCommandSnapshot({
      country,
      actionKey: "war",
      simulation: null,
      simulationView: null,
      observed: {
        generatedAt: new Date().toISOString(),
        countryCode: "JP",
        countryName: "Japan",
        actionKey: "war",
        signalCount: 2,
        signals: [
          {
            sourceName: "GDELT",
            sourceType: "api",
            url: "https://example.com",
            publishedAt: new Date().toISOString(),
            countryCodes: ["JP"],
            topicTags: ["shipping"],
            signalType: "NEWS_HEADLINE",
            sentiment: "negative",
            severityScore: 82,
            extractedSummary: "Regional shipping stress is accelerating.",
            rawReferenceId: "sig-1",
            relevanceScore: 0.91,
            confidenceScore: 74,
          },
        ],
      },
      forecast: {
        generatedAt: new Date().toISOString(),
        countryCode: "JP",
        countryName: "Japan",
        actionKey: "war",
        horizonDays: 30,
        riskScore: 76,
        riskLabel: "High",
        confidenceScore: 66,
        summary: "High near-term risk from maritime disruption.",
        drivers: [
          {
            factorKey: "maritime",
            label: "Maritime pressure",
            weight: 0.62,
            explanation: "Transit disruption is the dominant driver.",
            sourceName: "GDELT",
            rawReferenceId: "driver-1",
            publishedAt: new Date().toISOString(),
          },
        ],
      },
      watched: false,
      compared: false,
    });

    expect(snapshot.posture).toBe("Escalate");
    expect(snapshot.intelligenceScore).toBe(82);
    expect(snapshot.confidenceScore).toBeGreaterThanOrEqual(65);
    expect(snapshot.nextSteps[0]).toContain("executive brief");
  });

  it("marks missing evidence as a coverage gap", () => {
    const country = findCountryByCode("MA");
    const snapshot = buildIntelligenceCommandSnapshot({
      country,
      actionKey: "sanctions",
      simulation: null,
      simulationView: null,
      observed: null,
      forecast: null,
      watched: false,
      compared: false,
    });

    expect(snapshot.posture).toBe("Coverage gap");
    expect(snapshot.evidenceCount).toBe(0);
    expect(snapshot.recommendedAction).toContain("baseline scenario");
  });

  it("marks freshness using recency buckets", () => {
    const recent = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(freshnessBand(recent)).toBe("Fresh");
  });
});
