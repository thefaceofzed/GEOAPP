export interface CiiScore {
  countryCode: string;
  countryName: string;
  combinedScore: number;
  baselineRisk: number;
  eventScore: number;
  unrestScore: number;
  conflictScore: number;
  securityScore: number;
  informationScore: number;
  trend: "rising" | "stable" | "falling";
  signalCount: number;
  generatedAt: string;
}

export interface CiiSnapshot {
  generatedAt: string;
  countryCount: number;
  globalRiskScore: number;
  globalRiskLevel: string;
  scores: CiiScore[];
}

export interface GeoSignal {
  id: string;
  sourceType: string;
  country: string;
  lat: number;
  lon: number;
  severity: string;
  severityScore: number;
  summary: string;
  timestamp: string;
  topicTags: string[];
  metadata: Record<string, unknown>;
}

export interface CorrelationAlert {
  id: string;
  type: string;
  severity: string;
  countries: string[];
  summary: string;
  contributingSignalIds: string[];
  detectedAt: string;
  confidence: number;
}

export interface AnomalyResult {
  countryCode: string;
  signalType: string;
  currentValue: number;
  mean: number;
  stddev: number;
  zScore: number;
  severity: string;
  detectedAt: string;
}

export interface IntelligenceDashboard {
  generatedAt: string;
  ciiSnapshot: CiiSnapshot;
  correlations: CorrelationAlert[];
  anomalies: AnomalyResult[];
  recentSignals: GeoSignal[];
}

export interface ExposureProfile {
  id: string;
  label: string;
  countries: string[];
  commodities: string[];
  fxPairs: string[];
  sectors: string[];
}

export interface ExposureImpact {
  assetKey: string;
  assetLabel: string;
  unit: string;
  delta: number;
  percentChange: number;
  severity: string;
}

export interface ExposureAnalysis {
  generatedAt: string;
  scenarioId: string;
  profile: ExposureProfile;
  impacts: ExposureImpact[];
  overallSeverity: string;
  summary: string;
}

export interface BriefingSection {
  title: string;
  content: string;
  priority: "high" | "medium" | "low";
}

export interface DecisionBriefing {
  id: string;
  generatedAt: string;
  headline: string;
  confidenceLevel: string;
  confidenceScore: number;
  keyRisks: BriefingSection[];
  evidence: BriefingSection[];
  recommendedActions: string[];
  limitations: string[];
  rulesVersion: string;
  scenarioId: string | null;
  countryCode: string;
  countryName: string;
  actionKey: string;
  actionLabel: string;
  exportFormats: string[];
}

export interface ScenarioTemplateDetail {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  countryCode3: string;
  countryName: string;
  actionKey: string;
  actionLabel: string;
  mode: string;
  badge: string;
  watchlistItems: string[];
  keySignals: string[];
  riskFactors: string[];
}
