import type { AnimatedAsset } from "../../lib/types";
import type { MultiPolygon, Polygon } from "geojson";

export type ConflictActionKey =
  | "war"
  | "embargo"
  | "sanctions"
  | "cyberattack"
  | "alliance";

export type ImpactTone =
  | "severe-negative"
  | "medium-negative"
  | "warning"
  | "positive";

export type ExperienceMode = "observed" | "simulate" | "forecast";

export type CountryGeometry = Polygon | MultiPolygon;

export interface CountryFeatureProperties {
  A3: string;
}

export interface PlanetCountry {
  cca2: string;
  cca3: string;
  ccn3: string;
  name: string;
  officialName: string;
  region: string;
  subregion: string;
  lat: number;
  lng: number;
  flag: string;
  capital: string | null;
  borders: string[];
}

export interface RenderablePlanetCountry extends PlanetCountry {
  geometry: CountryGeometry;
}

export interface QuotaSnapshot {
  simulationsRemaining: number | null;
  unlimited: boolean;
}

export interface CountryImpact {
  id: string;
  countryCode: string;
  countryCode3: string;
  countryName: string;
  lat: number;
  lng: number;
  tone: ImpactTone;
  score: number;
  label: string;
  detail: string;
  delayMs: number;
}

export interface ImpactArc {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  tone: ImpactTone;
  delayMs: number;
  dashTimeMs: number;
  label: string;
}

export interface ImpactRing {
  id: string;
  lat: number;
  lng: number;
  tone: ImpactTone;
  delayMs: number;
  maxRadius: number;
  propagationSpeed: number;
  repeatPeriod: number;
}

export interface NarrativeSummary {
  headline: string;
  summary: string;
}

export interface PlanetSimulation {
  id: string;
  countryCode: string;
  countryCode3: string;
  countryName: string;
  actionKey: ConflictActionKey;
  actionLabel: string;
  createdAt: string;
  severityScore: number;
  narrative: NarrativeSummary;
  assets: AnimatedAsset[];
  impacts: CountryImpact[];
  arcs: ImpactArc[];
  rings: ImpactRing[];
  replayUrl: string;
  mode: "local" | "persisted" | "observed" | "forecast";
  replayToken: string | null;
  simulationId: string | null;
  simulationsRemaining: number | null;
  unlimited: boolean;
}

export interface LocalReplaySeed {
  id: string;
  countryCode: string;
  actionKey: ConflictActionKey;
  createdAt: string;
  simulationsRemaining: number | null;
  unlimited: boolean;
}

export interface ReplayHistoryItem {
  id: string;
  href: string;
  countryCode: string;
  countryName: string;
  actionKey: string;
  actionLabel: string;
  severityScore: number;
  createdAt: string;
  source: "local" | "backend";
  note: string;
}

export interface ConflictActionDefinition {
  key: ConflictActionKey;
  label: string;
  shortLabel: string;
  description: string;
  durationHours: number;
  accentTone: ImpactTone;
  narrativeHint: string;
  backendActionKey?: string;
}
