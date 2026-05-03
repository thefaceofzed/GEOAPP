export type PlanTier = "GUEST" | "FREE" | "PRO" | "ADMIN";
export type SubjectType = "GUEST" | "USER";
export type UserRole = "USER" | "ADMIN";

export interface AuthResponse {
  accessToken: string;
  subjectType: SubjectType;
  planTier: PlanTier;
  role: UserRole | null;
  email: string | null;
  simulationsRemaining: number | null;
  unlimited: boolean;
}

export interface Profile {
  subjectType: SubjectType;
  planTier: PlanTier;
  role: UserRole | null;
  email: string | null;
  simulationsRemaining: number | null;
  unlimited: boolean;
}

export interface AnimatedAsset {
  key: string;
  label: string;
  unit: string;
  from: number;
  to: number;
  delta: number;
}

export interface Narrative {
  headline: string;
  summary: string;
}

export interface RelevantSignal {
  sourceName: string;
  sourceType: "api" | "scraped";
  url: string;
  publishedAt: string;
  countryCodes: string[];
  topicTags: string[];
  signalType: string;
  sentiment: "positive" | "neutral" | "negative";
  severityScore: number;
  extractedSummary: string;
  rawReferenceId: string;
  relevanceScore: number;
}

export interface SimulationView {
  simulationId: string;
  countryCode: string;
  countryName: string;
  actionKey: string;
  actionLabel: string;
  actionDescription: string;
  replayTitle: string;
  visualIntensity: string;
  rulesVersion: string;
  severityScore: number;
  affectedCountries: string[];
  narrative: Narrative;
  assets: AnimatedAsset[];
  supportingSignals: RelevantSignal[];
  cached: boolean;
  replayToken: string | null;
  replayUrl: string | null;
  simulationsRemaining: number | null;
  unlimited: boolean;
  createdAt: string;
}

export interface ObservedSignal extends RelevantSignal {
  confidenceScore: number;
}

export interface ObservedView {
  generatedAt: string;
  countryCode: string;
  countryName: string;
  actionKey: string;
  signalCount: number;
  signals: ObservedSignal[];
}

export interface ForecastDriver {
  factorKey: string;
  label: string;
  weight: number;
  explanation: string;
  sourceName: string;
  rawReferenceId: string;
  publishedAt: string;
}

export interface ForecastView {
  generatedAt: string;
  countryCode: string;
  countryName: string;
  actionKey: string;
  horizonDays: number;
  riskScore: number;
  riskLabel: string;
  confidenceScore: number;
  summary: string;
  drivers: ForecastDriver[];
}

export interface IntelligenceSourceCoverage {
  label: string;
  value: string;
  detail: string;
  state: "ready" | "partial" | "missing";
}

export interface IntelligencePostureView {
  generatedAt: string;
  countryCode: string;
  countryName: string;
  actionKey: string;
  actionLabel: string;
  posture: string;
  postureTone: string;
  intelligenceScore: number | null;
  scenarioBaselineScore: number | null;
  confidenceScore: number | null;
  evidenceCount: number;
  signalCount: number;
  driverCount: number;
  freshnessLabel: string;
  riskLabel: string;
  primaryFinding: string;
  recommendedAction: string;
  nextSteps: string[];
  sourceCoverage: IntelligenceSourceCoverage[];
  observed: ObservedView;
  forecast: ForecastView;
}

export interface HistoryItem {
  simulationId: string;
  replayToken: string | null;
  countryCode: string;
  countryName: string;
  actionKey: string;
  actionLabel: string;
  severityScore: number;
  createdAt: string;
}

export interface CheckoutSession {
  id: string;
  url: string;
}

export interface RefreshSummary {
  adapterCount: number;
  rawRecordCount: number;
  insertedCount: number;
  updatedCount: number;
  deduplicatedCount: number;
  failedAdapterCount: number;
}

export interface AdapterRuntimeStatus {
  sourceKey: string;
  sourceName: string;
  enabled: boolean;
}

export interface RefreshRunState {
  startedAt: string | null;
  completedAt: string | null;
  inProgress: boolean;
  summary: RefreshSummary | null;
  failureMessage: string | null;
}

export interface IngestionRuntimeStatus {
  enabled: boolean;
  scheduleEnabled: boolean;
  bootstrapOnStartup: boolean;
  refreshIntervalMs: number;
  storedSignalCount: number;
  latestSignalPublishedAt: string | null;
  lastRefresh: RefreshRunState;
  adapters: AdapterRuntimeStatus[];
}

export interface IntelligenceCacheStatus {
  observedEntries: number;
  forecastEntries: number;
  ttlMs: number;
}

export interface IntelligenceStreamStatus {
  activeSubscriptions: number;
  activeClients: number;
  maxConcurrentStreams: number;
  maxConcurrentStreamsPerClient: number;
  streamIntervalMs: number;
  lastBroadcastAt: string | null;
}

export interface AdminIngestionStatusView {
  generatedAt: string;
  ingestion: IngestionRuntimeStatus;
  intelligenceCache: IntelligenceCacheStatus;
  intelligenceStream: IntelligenceStreamStatus;
}

export interface AdminRefreshSignalsView {
  triggeredAt: string;
  sourceKey: string | null;
  summary: RefreshSummary;
  refreshState: RefreshRunState;
}

export interface CacheInvalidationResult {
  countryCode: string | null;
  actionKey: string | null;
  observedEntriesRemoved: number;
  forecastEntriesRemoved: number;
}

export interface AdminCacheInvalidationView {
  invalidatedAt: string;
  invalidation: CacheInvalidationResult;
  cache: IntelligenceCacheStatus;
}

export interface WatchlistEntry {
  id: string;
  countryCode: string;
  countryCode3: string;
  countryName: string;
  actionKey: string;
  actionLabel: string;
  preferredMode: "observed" | "simulate" | "forecast";
  createdAt: string;
}

export interface WatchlistDigestSummary {
  attentionCount: number;
  watchCount: number;
  quietCount: number;
  coverageGapCount: number;
}

export interface WatchlistDigestItem {
  id: string;
  countryCode: string;
  countryCode3: string;
  countryName: string;
  actionKey: string;
  actionLabel: string;
  preferredMode: "observed" | "simulate" | "forecast";
  createdAt: string;
  alertState: "attention" | "watch" | "quiet";
  riskLabel: string;
  riskScore: number | null;
  signalCount: number;
  freshnessLabel: string;
  confidenceScore: number | null;
  summary: string;
  leadDriverLabel: string | null;
}

export interface WatchlistDigestView {
  generatedAt: string;
  trackedCount: number;
  summary: WatchlistDigestSummary;
  brief: string;
  items: WatchlistDigestItem[];
}
