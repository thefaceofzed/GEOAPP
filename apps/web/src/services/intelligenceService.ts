import { api } from "../lib/api";
import type {
  CiiSnapshot,
  CorrelationAlert,
  AnomalyResult,
  IntelligenceDashboard,
  GeoSignal,
  ExposureAnalysis,
  ExposureProfile,
  DecisionBriefing,
  ScenarioTemplateDetail,
} from "../lib/intelligenceTypes";

export async function fetchCiiScores(countries?: string[]) {
  const { data } = await api.get<CiiSnapshot>("/intelligence/cii", {
    params: countries?.length ? { countries: countries.join(",") } : undefined,
  });
  return data;
}

export async function fetchCorrelations() {
  const { data } = await api.get<CorrelationAlert[]>("/intelligence/correlations");
  return data;
}

export async function fetchAnomalies() {
  const { data } = await api.get<AnomalyResult[]>("/intelligence/anomalies");
  return data;
}

export async function fetchIntelligenceDashboard(countries?: string[]) {
  const { data } = await api.get<IntelligenceDashboard>("/intelligence/dashboard", {
    params: countries?.length ? { countries: countries.join(",") } : undefined,
  });
  return data;
}

export async function fetchGeoSignals(countryCode?: string, hours = 24) {
  const { data } = await api.get<GeoSignal[]>("/intelligence/signals", {
    params: { countryCode, hours },
  });
  return data;
}

export async function analyzeExposure(scenarioId: string, profile: ExposureProfile) {
  const { data } = await api.post<ExposureAnalysis>("/exposure/analyze", {
    scenarioId,
    profile,
  });
  return data;
}

export async function generateBriefing(params: {
  countryCode: string;
  actionKey: string;
  scenarioId?: string;
}) {
  const { data } = await api.post<DecisionBriefing>("/briefings/generate", params);
  return data;
}

export async function fetchScenarioTemplates() {
  const { data } = await api.get<ScenarioTemplateDetail[]>("/scenarios/templates");
  return data;
}
