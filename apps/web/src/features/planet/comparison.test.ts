import { describe, expect, it } from "vitest";
import type { ComparisonItem } from "./types";
import { buildComparisonBrief } from "./comparison";

const comparisonItems: ComparisonItem[] = [
  {
    id: "1",
    countryCode: "US",
    countryCode3: "USA",
    countryName: "United States",
    actionKey: "war",
    actionLabel: "Armed conflict",
    createdAt: "2026-04-18T00:00:00.000Z",
    severityScore: 82,
    narrative: {
      headline: "Test 1",
      summary: "Scenario one summary.",
    },
    assets: [
      {
        key: "oil",
        label: "Brent Oil",
        unit: "USD",
        from: 90,
        to: 108,
        delta: 18,
      },
    ],
    impactsCount: 12,
    replayUrl: "/replay/1",
    rulesVersion: "2026.02",
    evidenceCount: 4,
    cacheState: "fresh",
    sourceMode: "persisted",
  },
  {
    id: "2",
    countryCode: "JP",
    countryCode3: "JPN",
    countryName: "Japan",
    actionKey: "sanctions",
    actionLabel: "Sanctions",
    createdAt: "2026-04-18T01:00:00.000Z",
    severityScore: 61,
    narrative: {
      headline: "Test 2",
      summary: "Scenario two summary.",
    },
    assets: [
      {
        key: "fx",
        label: "Dollar Liquidity Index",
        unit: "IDX",
        from: 100,
        to: 106,
        delta: 6,
      },
    ],
    impactsCount: 7,
    replayUrl: "/replay/2",
    rulesVersion: null,
    evidenceCount: 1,
    cacheState: "local",
    sourceMode: "local",
  },
];

describe("buildComparisonBrief", () => {
  it("returns an empty-state message when there are no scenarios", () => {
    expect(buildComparisonBrief([])).toBe("No comparison scenarios selected yet.");
  });

  it("builds a ranked comparison brief", () => {
    const brief = buildComparisonBrief(comparisonItems);

    expect(brief).toContain("Comparison brief");
    expect(brief).toContain("Priority scenario: United States | Armed conflict");
    expect(brief).toContain("1. United States | Armed conflict");
    expect(brief).toContain("2. Japan | Sanctions");
    expect(brief).toContain("Brent Oil +18.00 USD");
  });
});
