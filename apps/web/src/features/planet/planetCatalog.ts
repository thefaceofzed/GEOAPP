import type {
  ConflictActionDefinition,
  ConflictActionKey,
  ImpactTone,
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
