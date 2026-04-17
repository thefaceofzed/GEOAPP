import type {
  AnimatedAsset,
  ForecastView,
  ObservedView,
  SimulationView,
} from "../../lib/types";
import { actionByKey, backendActionMap } from "./planetCatalog";
import { countryByCca2, countryByCca3, findCountryByCode, planetCountries } from "./planetData";
import { buildLocalReplayHref } from "./replayCodec";
import type {
  ConflictActionDefinition,
  ConflictActionKey,
  CountryImpact,
  ImpactArc,
  ImpactRing,
  ImpactTone,
  LocalReplaySeed,
  PlanetCountry,
  PlanetSimulation,
  QuotaSnapshot,
  ReplayHistoryItem,
} from "./types";

const majorMarketCodes = [
  "USA",
  "CHN",
  "JPN",
  "DEU",
  "GBR",
  "IND",
  "FRA",
  "BRA",
  "AUS",
  "CAN",
  "SGP",
  "KOR",
  "ARE",
  "SAU",
  "CHE",
] as const;

const beneficiaryPools: Record<ConflictActionKey, string[]> = {
  war: ["USA", "NOR", "ARE", "SAU", "CAN", "AUS", "ISR"],
  embargo: ["VNM", "IND", "MEX", "POL", "THA", "MYS", "IDN"],
  sanctions: ["CHE", "SGP", "ARE", "QAT", "USA", "GBR"],
  cyberattack: ["EST", "ISR", "USA", "GBR", "IND", "SGP", "KOR"],
  alliance: ["NOR", "DEU", "CAN", "AUS", "JPN", "DNK", "NLD"],
};

const assetTemplates: Record<
  ConflictActionKey,
  Array<{
    key: string;
    label: string | ((country: PlanetCountry) => string);
    unit: string;
    baseline: number;
    delta: number;
  }>
> = {
  war: [
    { key: "oil", label: "Brent Oil", unit: "USD", baseline: 92, delta: 16.8 },
    {
      key: "shipping",
      label: "Global Shipping Index",
      unit: "IDX",
      baseline: 1000,
      delta: 220,
    },
    {
      key: "defense",
      label: "Defense Prime Basket",
      unit: "IDX",
      baseline: 100,
      delta: 22,
    },
    {
      key: "equity",
      label: (country) => `${country.name} Equity Index`,
      unit: "IDX",
      baseline: 100,
      delta: -19,
    },
  ],
  embargo: [
    {
      key: "components",
      label: "Advanced Components Basket",
      unit: "IDX",
      baseline: 100,
      delta: 17,
    },
    {
      key: "freight",
      label: "Freight Futures",
      unit: "IDX",
      baseline: 280,
      delta: 66,
    },
    {
      key: "manufacturing",
      label: "Export Manufacturing Basket",
      unit: "IDX",
      baseline: 100,
      delta: -9,
    },
    {
      key: "equity",
      label: (country) => `${country.name} Equity Index`,
      unit: "IDX",
      baseline: 100,
      delta: -13,
    },
  ],
  sanctions: [
    { key: "gold", label: "Gold", unit: "USD", baseline: 2200, delta: 92 },
    {
      key: "banks",
      label: "Cross-Border Banks",
      unit: "IDX",
      baseline: 100,
      delta: -15,
    },
    {
      key: "fx",
      label: "Dollar Liquidity Index",
      unit: "IDX",
      baseline: 100,
      delta: 6.4,
    },
    {
      key: "equity",
      label: (country) => `${country.name} Equity Index`,
      unit: "IDX",
      baseline: 100,
      delta: -11,
    },
  ],
  cyberattack: [
    {
      key: "cyber",
      label: "Cyber Defense Basket",
      unit: "IDX",
      baseline: 100,
      delta: 18,
    },
    {
      key: "payments",
      label: "Global Payments Index",
      unit: "IDX",
      baseline: 100,
      delta: -10,
    },
    {
      key: "cloud",
      label: "Cloud Infrastructure Basket",
      unit: "IDX",
      baseline: 100,
      delta: 9,
    },
    {
      key: "equity",
      label: (country) => `${country.name} Equity Index`,
      unit: "IDX",
      baseline: 100,
      delta: -14,
    },
  ],
  alliance: [
    {
      key: "grid",
      label: "Grid Infrastructure Basket",
      unit: "IDX",
      baseline: 100,
      delta: 16,
    },
    {
      key: "energy",
      label: "Regional Energy Basket",
      unit: "IDX",
      baseline: 100,
      delta: 8,
    },
    {
      key: "renewables",
      label: "Renewables Suppliers",
      unit: "IDX",
      baseline: 100,
      delta: 13,
    },
    {
      key: "equity",
      label: (country) => `${country.name} Equity Index`,
      unit: "IDX",
      baseline: 100,
      delta: 11,
    },
  ],
};

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededNumber(seed: string) {
  return (hashString(seed) % 1000) / 1000;
}

function scaleValue(value: number, seed: string, spread = 0.2) {
  const factor = 1 - spread / 2 + seededNumber(seed) * spread;
  return Number((value * factor).toFixed(2));
}

function scoreToSeverity(score: number) {
  if (score <= 1) {
    return Math.round(score * 100);
  }

  if (score < 2) {
    return 100;
  }

  return Math.min(100, Math.round(score));
}

function makeId(prefix: string, seed: string) {
  const suffix = hashString(seed).toString(36).slice(0, 8);
  return `${prefix}-${suffix}`;
}

function rankCountries(
  candidates: PlanetCountry[],
  seed: string,
  limit: number,
  exclude: Set<string>,
) {
  return candidates
    .filter((country) => !exclude.has(country.cca3))
    .sort(
      (left, right) =>
        hashString(`${seed}:${left.cca3}`) - hashString(`${seed}:${right.cca3}`),
    )
    .slice(0, limit);
}

function toneScore(
  tone: CountryImpact["tone"],
  baseMagnitude: number,
  seed: string,
) {
  const magnitude = scaleValue(baseMagnitude, seed, 0.18);
  if (tone === "positive") {
    return Number(magnitude.toFixed(2));
  }
  return Number((-magnitude).toFixed(2));
}

function buildAssets(country: PlanetCountry, actionKey: ConflictActionKey) {
  return assetTemplates[actionKey].map((asset) => {
    const baseline = scaleValue(asset.baseline, `${country.cca3}:${asset.key}:base`, 0.12);
    const delta = scaleValue(asset.delta, `${country.cca3}:${asset.key}:delta`, 0.2);
    const label =
      typeof asset.label === "function" ? asset.label(country) : asset.label;

    return {
      key: asset.key,
      label,
      unit: asset.unit,
      from: Number(baseline.toFixed(2)),
      to: Number((baseline + delta).toFixed(2)),
      delta: Number(delta.toFixed(2)),
    } satisfies AnimatedAsset;
  });
}

function buildNarrative(country: PlanetCountry, action: ConflictActionDefinition) {
  const openings: Record<ConflictActionKey, string> = {
    war: `${country.name} becomes the ignition point for a military escalation with immediate stress across shipping, insurance, and energy corridors.`,
    embargo: `${country.name} enters a trade choke and the market response spreads through exporters, substitute suppliers, and freight routes.`,
    sanctions: `${country.name} is pushed into a sanctions regime that tightens liquidity, payment access, and balance-sheet confidence.`,
    cyberattack: `${country.name} suffers a coordinated digital disruption that propagates through ports, payments, cloud systems, and regional trust.`,
    alliance: `${country.name} consolidates support through a new alliance structure, creating resilience at home while redistributing gains and costs abroad.`,
  };

  return {
    headline: `${action.label} around ${country.name}`,
    summary: `${openings[action.key]} ${action.narrativeHint}`,
  };
}

function buildImpactGraph(country: PlanetCountry, actionKey: ConflictActionKey) {
  const impacts = new Map<string, CountryImpact>();
  const selectedIds = new Set([country.cca3]);

  const addImpact = (
    target: PlanetCountry,
    tone: CountryImpact["tone"],
    label: string,
    detail: string,
    delayMs: number,
    magnitude: number,
  ) => {
    impacts.set(target.cca3, {
      id: makeId("impact", `${country.cca3}:${actionKey}:${target.cca3}`),
      countryCode: target.cca2,
      countryCode3: target.cca3,
      countryName: target.name,
      lat: target.lat,
      lng: target.lng,
      tone,
      score: toneScore(tone, magnitude, `${country.cca3}:${actionKey}:${target.cca3}:score`),
      label,
      detail,
      delayMs,
    });
  };

  const actionPrimaryTone: Record<ConflictActionKey, CountryImpact["tone"]> = {
    war: "severe-negative",
    embargo: "medium-negative",
    sanctions: "medium-negative",
    cyberattack: "severe-negative",
    alliance: "positive",
  };

  addImpact(
    country,
    actionPrimaryTone[actionKey],
    actionKey === "alliance" ? "Coalition anchor" : "Epicenter",
    actionKey === "alliance"
      ? `${country.name} becomes the main beneficiary of the coalition buildout.`
      : `${country.name} absorbs the first-order shock.`,
    0,
    actionKey === "alliance" ? 0.78 : 0.94,
  );

  const borderCountries = rankCountries(
    country.borders
      .map((border) => countryByCca3.get(border))
      .filter((candidate): candidate is PlanetCountry => Boolean(candidate)),
    `${country.cca3}:${actionKey}:borders`,
    4,
    selectedIds,
  );

  borderCountries.forEach((target, index) => {
    selectedIds.add(target.cca3);
    addImpact(
      target,
      actionKey === "alliance" ? "warning" : "medium-negative",
      actionKey === "alliance" ? "Negotiation pressure" : "Border spillover",
      actionKey === "alliance"
        ? `${target.name} adjusts to the new bloc architecture.`
        : `${target.name} is hit by the first regional spillover.`,
      900 + index * 320,
      actionKey === "alliance" ? 0.45 : 0.72,
    );
  });

  const subregionCountries = rankCountries(
    planetCountries.filter(
      (candidate) =>
        candidate.subregion === country.subregion && candidate.cca3 !== country.cca3,
    ),
    `${country.cca3}:${actionKey}:subregion`,
    5,
    selectedIds,
  );

  subregionCountries.forEach((target, index) => {
    selectedIds.add(target.cca3);
    addImpact(
      target,
      actionKey === "alliance" ? "positive" : "warning",
      actionKey === "alliance" ? "Regional uplift" : "Regional repricing",
      actionKey === "alliance"
        ? `${target.name} captures spillover demand from the new alignment.`
        : `${target.name} reprices with the broader regional move.`,
      1800 + index * 350,
      actionKey === "alliance" ? 0.55 : 0.52,
    );
  });

  const globalMarkets = rankCountries(
    majorMarketCodes
      .map((code) => countryByCca3.get(code))
      .filter((candidate): candidate is PlanetCountry => Boolean(candidate)),
    `${country.cca3}:${actionKey}:markets`,
    6,
    selectedIds,
  );

  globalMarkets.forEach((target, index) => {
    selectedIds.add(target.cca3);
    addImpact(
      target,
      actionKey === "alliance" ? "warning" : "medium-negative",
      actionKey === "alliance" ? "Strategic response" : "Global risk repricing",
      actionKey === "alliance"
        ? `${target.name} reacts to the balance shift with procurement and diplomatic moves.`
        : `${target.name} prices the shock through risk assets and supply chains.`,
      2900 + index * 370,
      actionKey === "alliance" ? 0.38 : 0.58,
    );
  });

  const beneficiaries = rankCountries(
    beneficiaryPools[actionKey]
      .map((code) => countryByCca3.get(code))
      .filter((candidate): candidate is PlanetCountry => Boolean(candidate)),
    `${country.cca3}:${actionKey}:beneficiaries`,
    4,
    selectedIds,
  );

  beneficiaries.forEach((target, index) => {
    addImpact(
      target,
      "positive",
      actionKey === "alliance" ? "Alliance upside" : "Beneficiary flow",
      actionKey === "alliance"
        ? `${target.name} benefits from the coalition network and redirected investment.`
        : `${target.name} benefits from the resulting demand rotation.`,
      3800 + index * 340,
      actionKey === "alliance" ? 0.7 : 0.5,
    );
  });

  const orderedImpacts = Array.from(impacts.values()).sort(
    (left, right) => left.delayMs - right.delayMs,
  );

  const arcs: ImpactArc[] = orderedImpacts
    .filter((impact) => impact.countryCode3 !== country.cca3)
    .map((impact, index) => ({
      id: makeId("arc", `${country.cca3}:${actionKey}:${impact.countryCode3}`),
      startLat: country.lat,
      startLng: country.lng,
      endLat: impact.lat,
      endLng: impact.lng,
      tone: impact.tone,
      delayMs: impact.delayMs,
      dashTimeMs: 1500 + index * 120,
      label: `${country.name} -> ${impact.countryName}`,
    }));

  const rings: ImpactRing[] = orderedImpacts.slice(0, 10).map((impact, index) => ({
    id: makeId("ring", `${country.cca3}:${actionKey}:${impact.countryCode3}`),
    lat: impact.lat,
    lng: impact.lng,
    tone: impact.tone,
    delayMs: impact.delayMs,
    maxRadius: impact.countryCode3 === country.cca3 ? 7.5 : 4.5 + Math.abs(impact.score) * 2,
    propagationSpeed: 2.2 + (index % 3) * 0.3,
    repeatPeriod: 1400 + index * 120,
  }));

  return {
    impacts: orderedImpacts,
    arcs,
    rings,
  };
}

export function createPlanetSimulation(
  country: PlanetCountry,
  actionKey: ConflictActionKey,
  quota: QuotaSnapshot,
) {
  const action = actionByKey.get(actionKey);

  if (!action) {
    throw new Error(`Unsupported action: ${actionKey}`);
  }

  const graph = buildImpactGraph(country, actionKey);
  const assets = buildAssets(country, actionKey);
  const narrative = buildNarrative(country, action);
  const primaryImpact = graph.impacts[0];
  const severityScore = scoreToSeverity(Math.max(Math.abs(primaryImpact?.score ?? 0.7), 0.7));

  const simulation: PlanetSimulation = {
    id:
      globalThis.crypto?.randomUUID?.() ??
      makeId("sim", `${country.cca3}:${actionKey}:${Date.now()}`),
    countryCode: country.cca2,
    countryCode3: country.cca3,
    countryName: country.name,
    actionKey,
    actionLabel: action.label,
    createdAt: new Date().toISOString(),
    severityScore,
    narrative,
    assets,
    impacts: graph.impacts,
    arcs: graph.arcs,
    rings: graph.rings,
    replayUrl: "",
    mode: "local",
    replayToken: null,
    simulationId: null,
    simulationsRemaining: quota.simulationsRemaining,
    unlimited: quota.unlimited,
  };

  return {
    ...simulation,
    replayUrl: buildLocalReplayHref({
      id: simulation.id,
      countryCode: simulation.countryCode,
      actionKey: simulation.actionKey,
      createdAt: simulation.createdAt,
      simulationsRemaining: simulation.simulationsRemaining,
      unlimited: simulation.unlimited,
    }),
  } satisfies PlanetSimulation;
}

function inferActionKey(view: SimulationView): ConflictActionKey {
  return backendActionMap.get(view.actionKey) ?? "war";
}

export function createPlanetSimulationFromBackend(view: SimulationView) {
  const country = countryByCca2.get(view.countryCode);

  if (!country) {
    return null;
  }

  const actionKey = inferActionKey(view);
  const baseSimulation = createPlanetSimulation(country, actionKey, {
    simulationsRemaining: view.simulationsRemaining,
    unlimited: view.unlimited,
  });

  const affectedSet = new Set(view.affectedCountries);
  const remappedImpacts: CountryImpact[] = baseSimulation.impacts.map((impact, index) => {
    if (impact.countryCode === view.countryCode) {
      return impact;
    }

    if (!affectedSet.has(impact.countryCode)) {
      const tone: ImpactTone = index % 2 === 0 ? "warning" : "medium-negative";
      return {
        ...impact,
        tone,
        detail: `${impact.countryName} is part of the replay's broader market impact zone.`,
      };
    }

    return impact;
  });

  return {
    ...baseSimulation,
    id: view.simulationId,
    createdAt: view.createdAt,
    countryCode: view.countryCode,
    countryName: view.countryName,
    actionLabel: view.actionLabel,
    severityScore: scoreToSeverity(view.severityScore),
    narrative: view.narrative,
    assets: view.assets,
    impacts: remappedImpacts,
    replayUrl: view.replayToken ? `/replay/${view.replayToken}` : baseSimulation.replayUrl,
    mode: "persisted",
    replayToken: view.replayToken,
    simulationId: view.simulationId,
    simulationsRemaining: view.simulationsRemaining,
    unlimited: view.unlimited,
  } satisfies PlanetSimulation;
}

function sentimentToTone(sentiment: string, severityScore: number): ImpactTone {
  if (sentiment === "positive") {
    return "positive";
  }
  if (sentiment === "negative") {
    return severityScore >= 75 ? "severe-negative" : "medium-negative";
  }
  return "warning";
}

function riskLabelToTone(riskLabel: string): ImpactTone {
  if (riskLabel.toLowerCase() === "severe") {
    return "severe-negative";
  }
  if (riskLabel.toLowerCase() === "high") {
    return "medium-negative";
  }
  if (riskLabel.toLowerCase() === "elevated") {
    return "warning";
  }
  return "positive";
}

function buildOverlayFromCountries(
  country: PlanetCountry,
  actionKey: ConflictActionKey,
  overlayCountries: Array<{
    country: PlanetCountry;
    tone: ImpactTone;
    detail: string;
    delayMs: number;
  }>,
) {
  const impacts: CountryImpact[] = overlayCountries.map((entry) => ({
    id: makeId("impact", `${country.cca3}:${actionKey}:${entry.country.cca3}:${entry.delayMs}`),
    countryCode: entry.country.cca2,
    countryCode3: entry.country.cca3,
    countryName: entry.country.name,
    lat: entry.country.lat,
    lng: entry.country.lng,
    tone: entry.tone,
    score: toneScore(entry.tone, entry.country.cca3 === country.cca3 ? 0.78 : 0.55, `${country.cca3}:${actionKey}:${entry.country.cca3}:overlay-score`),
    label: entry.country.cca3 === country.cca3 ? "Anchor" : "Observed node",
    detail: entry.detail,
    delayMs: entry.delayMs,
  }));

  const arcs: ImpactArc[] = impacts
    .filter((impact) => impact.countryCode3 !== country.cca3)
    .map((impact, index) => ({
      id: makeId("arc", `${country.cca3}:${actionKey}:${impact.countryCode3}:overlay`),
      startLat: country.lat,
      startLng: country.lng,
      endLat: impact.lat,
      endLng: impact.lng,
      tone: impact.tone,
      delayMs: impact.delayMs,
      dashTimeMs: 1450 + index * 90,
      label: `${country.name} -> ${impact.countryName}`,
    }));

  const rings: ImpactRing[] = impacts.map((impact, index) => ({
    id: makeId("ring", `${country.cca3}:${actionKey}:${impact.countryCode3}:overlay`),
    lat: impact.lat,
    lng: impact.lng,
    tone: impact.tone,
    delayMs: impact.delayMs,
    maxRadius: impact.countryCode3 === country.cca3 ? 7.2 : 4.4 + Math.abs(impact.score) * 1.4,
    propagationSpeed: 2.1 + (index % 3) * 0.2,
    repeatPeriod: 1400 + index * 120,
  }));

  return { impacts, arcs, rings };
}

export function createObservedPlanetView(
  country: PlanetCountry,
  actionKey: ConflictActionKey,
  observed: ObservedView,
) {
  const base = createPlanetSimulation(country, actionKey, {
    simulationsRemaining: null,
    unlimited: true,
  });
  const seen = new Set<string>([country.cca3]);
  const overlayCountries = [
    {
      country,
      tone:
        observed.signals[0] != null
          ? sentimentToTone(observed.signals[0].sentiment, observed.signals[0].severityScore)
          : "warning",
      detail:
        observed.signals[0]?.extractedSummary ??
        "Observed mode tracks the latest live signals around the selected country.",
      delayMs: 0,
    },
    ...observed.signals.flatMap((signal, signalIndex) =>
      signal.countryCodes
        .map((code) => countryByCca2.get(code))
        .filter((candidate): candidate is PlanetCountry => Boolean(candidate))
        .filter((candidate) => {
          if (seen.has(candidate.cca3)) {
            return false;
          }
          seen.add(candidate.cca3);
          return true;
        })
        .slice(0, 2)
        .map((candidate, countryIndex) => ({
          country: candidate,
          tone: sentimentToTone(signal.sentiment, signal.severityScore),
          detail: signal.extractedSummary,
          delayMs: 650 + signalIndex * 340 + countryIndex * 120,
        })),
    ),
  ];
  const overlay = buildOverlayFromCountries(country, actionKey, overlayCountries.slice(0, 12));

  return {
    ...base,
    id: `observed-${country.cca3}-${actionKey}`,
    createdAt: observed.generatedAt,
    severityScore:
      observed.signals[0]?.severityScore ??
      observed.signals.reduce((sum, signal) => sum + signal.severityScore, 0) /
        Math.max(1, observed.signals.length),
    narrative: {
      headline: `Observed live stress around ${country.name}`,
      summary:
        observed.signalCount > 0
          ? `${observed.signalCount} live signal(s) currently shape the risk surface around ${country.name}.`
          : `No strong live signal is currently mapped around ${country.name}.`,
    },
    assets: base.assets,
    impacts: overlay.impacts,
    arcs: overlay.arcs,
    rings: overlay.rings,
    replayUrl: "",
    mode: "observed",
    replayToken: null,
    simulationId: null,
    simulationsRemaining: null,
    unlimited: true,
  } satisfies PlanetSimulation;
}

export function createForecastPlanetView(
  country: PlanetCountry,
  actionKey: ConflictActionKey,
  forecast: ForecastView,
) {
  const base = createPlanetSimulation(country, actionKey, {
    simulationsRemaining: null,
    unlimited: true,
  });
  const seen = new Set<string>([country.cca3]);
  const primaryTone = riskLabelToTone(forecast.riskLabel);
  const overlayCountries = [
    {
      country,
      tone: primaryTone,
      detail: forecast.summary,
      delayMs: 0,
    },
    ...forecast.drivers.flatMap((driver, driverIndex) =>
      driver.factorKey
        ? [] as Array<{ country: PlanetCountry; tone: ImpactTone; detail: string; delayMs: number }>
        : [],
    ),
    ...base.impacts
      .filter((impact) => impact.countryCode3 !== country.cca3)
      .slice(0, 8)
      .map((impact, index) => ({
        country: countryByCca3.get(impact.countryCode3)!,
        tone: primaryTone,
        detail:
          forecast.drivers[index % Math.max(1, forecast.drivers.length)]?.explanation ??
          forecast.summary,
        delayMs: 700 + index * 250,
      }))
      .filter((entry) => {
        if (seen.has(entry.country.cca3)) {
          return false;
        }
        seen.add(entry.country.cca3);
        return true;
      }),
  ];
  const overlay = buildOverlayFromCountries(country, actionKey, overlayCountries.slice(0, 10));

  return {
    ...base,
    id: `forecast-${country.cca3}-${actionKey}`,
    createdAt: forecast.generatedAt,
    severityScore: forecast.riskScore,
    narrative: {
      headline: `Forecast risk for ${country.name}`,
      summary: forecast.summary,
    },
    assets: base.assets.map((asset) => ({
      ...asset,
      to: Number((asset.from + asset.delta * Math.max(0.25, forecast.riskScore / 100)).toFixed(2)),
      delta: Number((asset.delta * Math.max(0.25, forecast.riskScore / 100)).toFixed(2)),
    })),
    impacts: overlay.impacts,
    arcs: overlay.arcs,
    rings: overlay.rings,
    replayUrl: "",
    mode: "forecast",
    replayToken: null,
    simulationId: null,
    simulationsRemaining: null,
    unlimited: true,
  } satisfies PlanetSimulation;
}

export function buildReplayHistoryItem(simulation: PlanetSimulation): ReplayHistoryItem {
  return {
    id: simulation.id,
    href: simulation.replayUrl,
    countryCode: simulation.countryCode,
    countryName: simulation.countryName,
    actionKey: simulation.actionKey,
    actionLabel: simulation.actionLabel,
    severityScore: simulation.severityScore,
    createdAt: simulation.createdAt,
    source: simulation.mode === "persisted" ? "backend" : "local",
    note:
      simulation.mode === "persisted"
        ? "Stored replay"
        : "Encoded replay link",
  };
}

export function restoreLocalReplay(seed: LocalReplaySeed) {
  const country = findCountryByCode(seed.countryCode);

  if (!country) {
    return null;
  }

  const rebuilt = createPlanetSimulation(country, seed.actionKey, {
    simulationsRemaining: seed.simulationsRemaining,
    unlimited: seed.unlimited,
  });

  return {
    ...rebuilt,
    id: seed.id,
    createdAt: seed.createdAt,
    replayUrl: buildLocalReplayHref(seed),
  } satisfies PlanetSimulation;
}

export function buildHistoryItemFromBackend(view: SimulationView): ReplayHistoryItem | null {
  const simulation = createPlanetSimulationFromBackend(view);
  if (!simulation) {
    return null;
  }
  return buildReplayHistoryItem(simulation);
}
