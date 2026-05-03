import type {
  ConflictActionDefinition,
  ConflictActionKey,
  ImpactTone,
  ScenarioTemplateDefinition,
} from "./types";

export const tonePalette: Record<
  ImpactTone,
  {
    label: string;
    color: string;
    softColor: string;
    borderColor: string;
  }
> = {
  "severe-negative": {
    label: "Severe drag",
    color: "#ff5e5b",
    softColor: "rgba(255, 94, 91, 0.18)",
    borderColor: "rgba(255, 94, 91, 0.55)",
  },
  "medium-negative": {
    label: "Medium drag",
    color: "#ff9a3d",
    softColor: "rgba(255, 154, 61, 0.18)",
    borderColor: "rgba(255, 154, 61, 0.5)",
  },
  warning: {
    label: "Warning zone",
    color: "#ffe16b",
    softColor: "rgba(255, 225, 107, 0.18)",
    borderColor: "rgba(255, 225, 107, 0.45)",
  },
  positive: {
    label: "Beneficiary",
    color: "#59d97d",
    softColor: "rgba(89, 217, 125, 0.18)",
    borderColor: "rgba(89, 217, 125, 0.45)",
  },
};

export const conflictActions: ConflictActionDefinition[] = [
  {
    key: "war",
    label: "War Escalation",
    shortLabel: "War",
    description:
      "Pushes the selected state into direct kinetic conflict and sends shockwaves into logistics, energy, and defense markets.",
    durationHours: 168,
    accentTone: "severe-negative",
    narrativeHint: "Hard power spreads the fastest through shipping and energy corridors.",
    backendActionKey: "war",
  },
  {
    key: "embargo",
    label: "Trade Embargo",
    shortLabel: "Embargo",
    description:
      "Breaks supply routes, squeezes exporters, and reroutes industrial demand into substitute producers.",
    durationHours: 120,
    accentTone: "medium-negative",
    narrativeHint: "Embargoes tend to hit the source economy first, then leak into regional manufacturing.",
    backendActionKey: "embargo",
  },
  {
    key: "sanctions",
    label: "Financial Sanctions",
    shortLabel: "Sanctions",
    description:
      "Constrains settlement rails, funding access, and capital mobility across exposed banking systems.",
    durationHours: 96,
    accentTone: "warning",
    narrativeHint: "Financial sanctions travel through bank balance sheets and safe-haven assets.",
    backendActionKey: "sanctions",
  },
  {
    key: "cyberattack",
    label: "Cyberattack Wave",
    shortLabel: "Cyberattack",
    description:
      "Disrupts payment rails, logistics systems, and communications infrastructure with a digitally propagated shock.",
    durationHours: 72,
    accentTone: "medium-negative",
    narrativeHint: "Digital disruptions ripple toward ports, data centers, and cyber defense suppliers.",
    backendActionKey: "cyberattack",
  },
  {
    key: "alliance",
    label: "Alliance Buildout",
    shortLabel: "Alliance",
    description:
      "Forms a stabilizing coalition that helps the selected country but reshapes regional energy and procurement flows.",
    durationHours: 144,
    accentTone: "positive",
    narrativeHint: "Alliances create localized resilience but shift gains and losses across partners and rivals.",
    backendActionKey: "alliance",
  },
];

export const scenarioTemplates: ScenarioTemplateDefinition[] = [
  {
    id: "taiwan-strait",
    title: "Taiwan Strait Crisis",
    description: "Stress-test semiconductor supply chains, shipping routes, and US-China military escalation risk.",
    countryCode3: "TWN",
    actionKey: "war",
    mode: "simulate",
    badge: "Flashpoint",
  },
  {
    id: "hormuz-closure",
    title: "Strait of Hormuz Closure",
    description: "Model oil transit disruption, energy price cascades, and global shipping rerouting costs.",
    countryCode3: "IRN",
    actionKey: "embargo",
    mode: "forecast",
    badge: "Energy",
  },
  {
    id: "ukraine-escalation",
    title: "Ukraine Conflict Escalation",
    description: "Sanctions tightening, European gas supply risk, grain export disruption, and NATO response dynamics.",
    countryCode3: "UKR",
    actionKey: "war",
    mode: "simulate",
    badge: "Conflict",
  },
  {
    id: "red-sea-disruption",
    title: "Red Sea Shipping Disruption",
    description: "Suez Canal bypass routing costs, container rate surges, and European supply chain delays.",
    countryCode3: "YEM",
    actionKey: "embargo",
    mode: "observed",
    badge: "Trade",
  },
  {
    id: "iran-strike",
    title: "Iran Military Strike",
    description: "Oil price shock, regional contagion, Strait of Hormuz risk, and nuclear escalation scenarios.",
    countryCode3: "IRN",
    actionKey: "war",
    mode: "simulate",
    badge: "Critical",
  },
  {
    id: "estonia-cyber",
    title: "Baltic Cyber Escalation",
    description: "Review live cyber-adjacent signals then model digital infrastructure disruption across NATO's eastern flank.",
    countryCode3: "EST",
    actionKey: "cyberattack",
    mode: "observed",
    badge: "Cyber",
  },
  {
    id: "saudi-alliance",
    title: "Gulf Alliance Buildout",
    description: "Model stabilizing upside and second-order procurement shifts through a regional coalition case.",
    countryCode3: "SAU",
    actionKey: "alliance",
    mode: "simulate",
    badge: "Opportunity",
  },
  {
    id: "china-sanctions",
    title: "China Financial Sanctions",
    description: "Model settlement rail constraints, capital mobility restrictions, and safe-haven asset flows.",
    countryCode3: "CHN",
    actionKey: "sanctions",
    mode: "forecast",
    badge: "Finance",
  },
];

export const actionByKey = new Map<ConflictActionKey, ConflictActionDefinition>(
  conflictActions.map((action) => [action.key, action]),
);

export const backendActionMap = new Map<string, ConflictActionKey>([
  ...conflictActions.map((action) => [action.key, action.key] as const),
  ...conflictActions.flatMap((action) =>
    action.backendActionKey
      ? [[action.backendActionKey, action.key] as const]
      : [],
  ),
  ["blocus_naval", "war"],
  ["embargo_tech", "embargo"],
  ["sanctions_financieres", "sanctions"],
  ["cyber_attack", "cyberattack"],
  ["alliance_energie", "alliance"],
]);
