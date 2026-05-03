package com.geoeconwars.intelligence.service;

import com.geoeconwars.ingestion.domain.SignalSentiment;
import com.geoeconwars.ingestion.domain.SignalSourceType;
import com.geoeconwars.ingestion.service.SignalEnrichmentService;
import com.geoeconwars.ingestion.service.SignalModels;
import com.geoeconwars.ingestion.service.SignalsRefreshedEvent;
import com.geoeconwars.rules.domain.RulesCatalog;
import com.geoeconwars.rules.service.ActionKeySupport;
import com.geoeconwars.rules.service.RulesCatalogLoader;
import com.geoeconwars.shared.config.AppProperties;
import com.geoeconwars.shared.exception.BadRequestException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Service
public class IntelligenceService {

    private final SignalEnrichmentService signalEnrichmentService;
    private final RulesCatalogLoader rulesCatalogLoader;
    private final AppProperties properties;
    private final Map<ObservedCacheKey, CachedValue<IntelligenceModels.ObservedView>> observedCache = new ConcurrentHashMap<>();
    private final Map<ForecastCacheKey, CachedValue<IntelligenceModels.ForecastView>> forecastCache = new ConcurrentHashMap<>();

    public IntelligenceService(
            SignalEnrichmentService signalEnrichmentService,
            RulesCatalogLoader rulesCatalogLoader,
            AppProperties properties
    ) {
        this.signalEnrichmentService = signalEnrichmentService;
        this.rulesCatalogLoader = rulesCatalogLoader;
        this.properties = properties;
    }

    public IntelligenceModels.ObservedView observedSignals(String countryCode, String actionKey, Integer limit) {
        ensureEnabled();
        RulesCatalog.CountryRule country = validateCountry(countryCode);
        String canonicalActionKey = validateAction(actionKey);
        int resolvedLimit = clampLimit(limit);
        ObservedCacheKey cacheKey = new ObservedCacheKey(country.countryCode(), canonicalActionKey, resolvedLimit);
        return resolveCached(observedCache, cacheKey, () -> computeObserved(country, canonicalActionKey, resolvedLimit));
    }

    private IntelligenceModels.ObservedView computeObserved(
            RulesCatalog.CountryRule country,
            String canonicalActionKey,
            int resolvedLimit
    ) {
        List<IntelligenceModels.ObservedSignal> signals = signalEnrichmentService
                .findRelevantSignals(country.countryCode(), canonicalActionKey, resolvedLimit)
                .stream()
                .map(this::toObservedSignal)
                .toList();

        return new IntelligenceModels.ObservedView(
                Instant.now(),
                country.countryCode(),
                country.countryName(),
                canonicalActionKey,
                signals.size(),
                signals
        );
    }

    public IntelligenceModels.ForecastView forecast(String countryCode, String actionKey, Integer horizonDays) {
        ensureEnabled();
        RulesCatalog.CountryRule country = validateCountry(countryCode);
        String canonicalActionKey = validateAction(actionKey);
        int resolvedHorizonDays = clampHorizon(horizonDays);
        ForecastCacheKey cacheKey = new ForecastCacheKey(country.countryCode(), canonicalActionKey, resolvedHorizonDays);
        return resolveCached(forecastCache, cacheKey, () -> computeForecast(country, canonicalActionKey, resolvedHorizonDays));
    }

    public IntelligenceModels.PostureView posture(
            String countryCode,
            String actionKey,
            Integer limit,
            Integer horizonDays
    ) {
        ensureEnabled();
        RulesCatalog catalog = rulesCatalogLoader.activeCatalog();
        RulesCatalog.CountryRule country = validateCountry(countryCode);
        String canonicalActionKey = validateAction(actionKey);
        RulesCatalog.ActionRule action = catalog.findAction(canonicalActionKey)
                .orElseThrow(() -> new BadRequestException("Unsupported action key: " + actionKey));

        IntelligenceModels.ObservedView observed = observedSignals(country.countryCode(), canonicalActionKey, limit);
        IntelligenceModels.ForecastView forecast = forecast(country.countryCode(), canonicalActionKey, horizonDays);
        return computePosture(country, action, canonicalActionKey, observed, forecast);
    }

    private IntelligenceModels.ForecastView computeForecast(
            RulesCatalog.CountryRule country,
            String canonicalActionKey,
            int resolvedHorizonDays
    ) {
        List<SignalModels.RelevantSignalView> relevantSignals = signalEnrichmentService.findRelevantSignals(
                country.countryCode(),
                canonicalActionKey,
                properties.intelligence().observedLimitMax()
        );

        List<IntelligenceModels.ForecastDriver> drivers = relevantSignals.stream()
                .sorted(Comparator.comparing(this::driverWeight).reversed())
                .limit(5)
                .map(this::toForecastDriver)
                .toList();

        BigDecimal riskScore = computeRiskScore(relevantSignals, resolvedHorizonDays);
        BigDecimal confidenceScore = computeForecastConfidence(relevantSignals);
        return new IntelligenceModels.ForecastView(
                Instant.now(),
                country.countryCode(),
                country.countryName(),
                canonicalActionKey,
                resolvedHorizonDays,
                riskScore,
                riskLabel(riskScore),
                confidenceScore,
                forecastSummary(country.countryName(), canonicalActionKey, resolvedHorizonDays, riskScore, drivers),
                drivers
        );
    }

    private IntelligenceModels.PostureView computePosture(
            RulesCatalog.CountryRule country,
            RulesCatalog.ActionRule action,
            String canonicalActionKey,
            IntelligenceModels.ObservedView observed,
            IntelligenceModels.ForecastView forecast
    ) {
        BigDecimal scenarioBaselineScore = scenarioBaselineScore(action);
        BigDecimal leadObservedSeverity = observed.signals().isEmpty()
                ? null
                : observed.signals().getFirst().severityScore();
        BigDecimal intelligenceScore = maxScore(List.of(
                nullToZero(scenarioBaselineScore),
                nullToZero(forecast.riskScore()),
                nullToZero(leadObservedSeverity)
        ));
        BigDecimal confidenceScore = postureConfidence(observed, forecast);
        int evidenceCount = observed.signals().size() + forecast.drivers().size();
        String riskLabel = intelligenceScore == null ? "No reading" : riskLabel(intelligenceScore);
        String posture = postureLabel(evidenceCount, intelligenceScore, confidenceScore, observed.signalCount());
        String postureTone = switch (posture) {
            case "Escalate" -> "escalate";
            case "Watch" -> "watch";
            case "Monitor" -> "monitor";
            default -> "gap";
        };
        String freshnessLabel = freshnessLabel(resolveFreshnessTimestamp(observed, forecast));

        return new IntelligenceModels.PostureView(
                Instant.now(),
                country.countryCode(),
                country.countryName(),
                canonicalActionKey,
                action.label(),
                posture,
                postureTone,
                scaleNullable(intelligenceScore),
                scaleNullable(scenarioBaselineScore),
                scaleNullable(confidenceScore),
                evidenceCount,
                observed.signalCount(),
                forecast.drivers().size(),
                freshnessLabel,
                riskLabel,
                primaryFinding(country, observed, forecast),
                recommendedAction(posture),
                nextSteps(evidenceCount, forecast, observed),
                sourceCoverage(action, scenarioBaselineScore, observed, forecast, freshnessLabel),
                observed,
                forecast
        );
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onSignalsRefreshed(SignalsRefreshedEvent event) {
        if (event.hasMutations()) {
            invalidateCaches();
        }
    }

    public void invalidateCaches() {
        observedCache.clear();
        forecastCache.clear();
    }

    public CacheInvalidationResult invalidateCaches(String countryCode, String actionKey) {
        String normalizedCountryCode = normalizeOptionalCountry(countryCode);
        String normalizedActionKey = normalizeOptionalAction(actionKey);

        int observedRemoved = removeMatching(
                observedCache,
                key -> matchesFilter(key.countryCode(), normalizedCountryCode) && matchesFilter(key.actionKey(), normalizedActionKey)
        );
        int forecastRemoved = removeMatching(
                forecastCache,
                key -> matchesFilter(key.countryCode(), normalizedCountryCode) && matchesFilter(key.actionKey(), normalizedActionKey)
        );

        return new CacheInvalidationResult(
                normalizedCountryCode,
                normalizedActionKey,
                observedRemoved,
                forecastRemoved
        );
    }

    public CacheStatus cacheStatus() {
        return new CacheStatus(
                observedCache.size(),
                forecastCache.size(),
                properties.intelligence().cacheTtlMs()
        );
    }

    private IntelligenceModels.ObservedSignal toObservedSignal(SignalModels.RelevantSignalView signal) {
        return new IntelligenceModels.ObservedSignal(
                signal.sourceName(),
                signal.sourceType(),
                signal.url(),
                signal.publishedAt(),
                signal.countryCodes(),
                signal.topicTags(),
                signal.signalType(),
                signal.sentiment(),
                signal.severityScore(),
                signal.extractedSummary(),
                signal.rawReferenceId(),
                signal.relevanceScore().setScale(4, RoundingMode.HALF_UP),
                confidenceForSignal(signal)
        );
    }

    private IntelligenceModels.ForecastDriver toForecastDriver(SignalModels.RelevantSignalView signal) {
        return new IntelligenceModels.ForecastDriver(
                signal.rawReferenceId(),
                signal.sourceName() + " / " + signal.signalType().value(),
                driverWeight(signal),
                signal.extractedSummary(),
                signal.sourceName(),
                signal.rawReferenceId(),
                signal.publishedAt()
        );
    }

    private BigDecimal driverWeight(SignalModels.RelevantSignalView signal) {
        BigDecimal sentimentFactor = switch (signal.sentiment()) {
            case NEGATIVE -> BigDecimal.valueOf(1.00d);
            case NEUTRAL -> BigDecimal.valueOf(0.65d);
            case POSITIVE -> BigDecimal.valueOf(0.35d);
        };
        return signal.relevanceScore()
                .multiply(signal.severityScore().divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP))
                .multiply(sentimentFactor)
                .setScale(4, RoundingMode.HALF_UP);
    }

    private BigDecimal computeRiskScore(List<SignalModels.RelevantSignalView> signals, int horizonDays) {
        if (signals.isEmpty()) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal aggregate = BigDecimal.ZERO;
        for (SignalModels.RelevantSignalView signal : signals) {
            BigDecimal normalizedSeverity = signal.severityScore()
                    .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
            BigDecimal direction = switch (signal.sentiment()) {
                case NEGATIVE -> BigDecimal.valueOf(1.00d);
                case NEUTRAL -> BigDecimal.valueOf(0.55d);
                case POSITIVE -> BigDecimal.valueOf(-0.35d);
            };
            BigDecimal recencyBoost = recencyBoost(signal.publishedAt());
            aggregate = aggregate.add(
                    signal.relevanceScore()
                            .multiply(normalizedSeverity)
                            .multiply(direction)
                            .multiply(recencyBoost)
            );
        }

        BigDecimal horizonFactor = BigDecimal.valueOf(Math.min(horizonDays, 180))
                .divide(BigDecimal.valueOf(180), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(0.18d))
                .add(BigDecimal.valueOf(0.92d));

        BigDecimal scaled = aggregate
                .divide(BigDecimal.valueOf(Math.max(1, signals.size())), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .multiply(horizonFactor)
                .add(BigDecimal.valueOf(12));

        if (scaled.compareTo(BigDecimal.ZERO) < 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        if (scaled.compareTo(BigDecimal.valueOf(100)) > 0) {
            return BigDecimal.valueOf(100).setScale(2, RoundingMode.HALF_UP);
        }
        return scaled.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal computeForecastConfidence(List<SignalModels.RelevantSignalView> signals) {
        if (signals.isEmpty()) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal confidence = signals.stream()
                .map(this::confidenceForSignal)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(signals.size()), 4, RoundingMode.HALF_UP);

        BigDecimal diversityBonus = BigDecimal.valueOf(
                signals.stream().map(SignalModels.RelevantSignalView::sourceName).distinct().count()
        ).multiply(BigDecimal.valueOf(2.5d));

        BigDecimal bounded = confidence.add(diversityBonus);
        if (bounded.compareTo(BigDecimal.valueOf(100)) > 0) {
            return BigDecimal.valueOf(100).setScale(2, RoundingMode.HALF_UP);
        }
        return bounded.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal postureConfidence(
            IntelligenceModels.ObservedView observed,
            IntelligenceModels.ForecastView forecast
    ) {
        List<BigDecimal> values = new java.util.ArrayList<>();
        if (forecast.confidenceScore() != null && !forecast.drivers().isEmpty()) {
            values.add(forecast.confidenceScore());
        }
        observed.signals().stream()
                .limit(4)
                .map(IntelligenceModels.ObservedSignal::confidenceScore)
                .forEach(values::add);

        if (values.isEmpty()) {
            return null;
        }

        BigDecimal total = values.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        return total.divide(BigDecimal.valueOf(values.size()), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal confidenceForSignal(SignalModels.RelevantSignalView signal) {
        BigDecimal sourceBase = signal.sourceType() == SignalSourceType.API
                ? BigDecimal.valueOf(74)
                : BigDecimal.valueOf(61);
        BigDecimal relevanceFactor = signal.relevanceScore().multiply(BigDecimal.valueOf(18));
        BigDecimal agePenalty = BigDecimal.valueOf(Math.min(Duration.between(signal.publishedAt(), Instant.now()).toDays(), 30))
                .multiply(BigDecimal.valueOf(1.2d));
        BigDecimal bounded = sourceBase.add(relevanceFactor).subtract(agePenalty);
        if (bounded.compareTo(BigDecimal.valueOf(15)) < 0) {
            return BigDecimal.valueOf(15).setScale(2, RoundingMode.HALF_UP);
        }
        if (bounded.compareTo(BigDecimal.valueOf(100)) > 0) {
            return BigDecimal.valueOf(100).setScale(2, RoundingMode.HALF_UP);
        }
        return bounded.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal recencyBoost(Instant publishedAt) {
        long hours = Math.max(0L, Duration.between(publishedAt, Instant.now()).toHours());
        if (hours <= 24) {
            return BigDecimal.valueOf(1.00d);
        }
        if (hours <= 72) {
            return BigDecimal.valueOf(0.88d);
        }
        if (hours <= 168) {
            return BigDecimal.valueOf(0.72d);
        }
        return BigDecimal.valueOf(0.56d);
    }

    private String riskLabel(BigDecimal riskScore) {
        if (riskScore.compareTo(BigDecimal.valueOf(75)) >= 0) {
            return "Severe";
        }
        if (riskScore.compareTo(BigDecimal.valueOf(55)) >= 0) {
            return "High";
        }
        if (riskScore.compareTo(BigDecimal.valueOf(30)) >= 0) {
            return "Elevated";
        }
        return "Low";
    }

    private String postureLabel(
            int evidenceCount,
            BigDecimal intelligenceScore,
            BigDecimal confidenceScore,
            int signalCount
    ) {
        if (evidenceCount == 0) {
            return "Coverage gap";
        }
        if (
                intelligenceScore != null
                        && confidenceScore != null
                        && intelligenceScore.compareTo(BigDecimal.valueOf(72)) >= 0
                        && confidenceScore.compareTo(BigDecimal.valueOf(50)) >= 0
        ) {
            return "Escalate";
        }
        if (
                (intelligenceScore != null && intelligenceScore.compareTo(BigDecimal.valueOf(48)) >= 0)
                        || signalCount >= 3
        ) {
            return "Watch";
        }
        return "Monitor";
    }

    private String primaryFinding(
            RulesCatalog.CountryRule country,
            IntelligenceModels.ObservedView observed,
            IntelligenceModels.ForecastView forecast
    ) {
        if (!forecast.drivers().isEmpty()) {
            return forecast.summary();
        }
        if (!observed.signals().isEmpty()) {
            return observed.signals().getFirst().extractedSummary();
        }
        return "No strong live signal is currently mapped for " + country.countryName() + ".";
    }

    private String recommendedAction(String posture) {
        return switch (posture) {
            case "Escalate" -> "Brief stakeholders and compare adverse scenarios.";
            case "Watch" -> "Keep this hotspot in daily review and run a deterministic scenario.";
            case "Monitor" -> "Track evidence and save the lens if it matters to your exposure.";
            default -> "Create a baseline scenario, then wait for stronger evidence.";
        };
    }

    private List<String> nextSteps(
            int evidenceCount,
            IntelligenceModels.ForecastView forecast,
            IntelligenceModels.ObservedView observed
    ) {
        java.util.ArrayList<String> steps = new java.util.ArrayList<>();
        if (evidenceCount == 0) {
            steps.add("Run a deterministic baseline scenario.");
            steps.add("Save the country and action lens to the watchlist.");
            steps.add("Recheck observed signals after the next ingestion refresh.");
            return steps;
        }

        if (!observed.signals().isEmpty()) {
            steps.add("Review source provenance on the lead observed signals.");
        }
        if (!forecast.drivers().isEmpty()) {
            steps.add("Inspect forecast drivers before escalating the brief.");
        }
        steps.add("Compare this case with at least one alternative scenario.");
        steps.add("Export a concise decision brief with confidence and limitations.");
        return steps;
    }

    private List<IntelligenceModels.SourceCoverage> sourceCoverage(
            RulesCatalog.ActionRule action,
            BigDecimal scenarioBaselineScore,
            IntelligenceModels.ObservedView observed,
            IntelligenceModels.ForecastView forecast,
            String freshnessLabel
    ) {
        return List.of(
                new IntelligenceModels.SourceCoverage(
                        "Observed signals",
                        String.valueOf(observed.signalCount()),
                        observed.signalCount() > 0
                                ? freshnessLabel + " evidence mapped to " + action.label()
                                : "No current signal match for this lens",
                        observed.signalCount() > 0 ? "ready" : "missing"
                ),
                new IntelligenceModels.SourceCoverage(
                        "Forecast drivers",
                        String.valueOf(forecast.drivers().size()),
                        forecast.drivers().isEmpty()
                                ? "Forecast waits for enough signal coverage"
                                : forecast.horizonDays() + "-day horizon at "
                                        + forecast.confidenceScore().setScale(0, RoundingMode.HALF_UP).toPlainString()
                                        + "/100 confidence",
                        forecast.drivers().isEmpty() ? "partial" : "ready"
                ),
                new IntelligenceModels.SourceCoverage(
                        "Scenario baseline",
                        scenarioBaselineScore == null
                                ? "n/a"
                                : scenarioBaselineScore.setScale(0, RoundingMode.HALF_UP).toPlainString(),
                        "Deterministic baseline from the active rules catalog",
                        scenarioBaselineScore == null ? "missing" : "ready"
                )
        );
    }

    private BigDecimal scenarioBaselineScore(RulesCatalog.ActionRule action) {
        if (action.baseSeverity() == null) {
            return null;
        }

        BigDecimal raw = action.baseSeverity().compareTo(BigDecimal.ONE) <= 0
                ? action.baseSeverity().multiply(BigDecimal.valueOf(100))
                : action.baseSeverity();
        return clampScore(raw);
    }

    private BigDecimal maxScore(List<BigDecimal> values) {
        return values.stream()
                .filter(value -> value != null && value.compareTo(BigDecimal.ZERO) > 0)
                .max(BigDecimal::compareTo)
                .orElse(null);
    }

    private BigDecimal nullToZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private BigDecimal clampScore(BigDecimal value) {
        if (value.compareTo(BigDecimal.ZERO) < 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        if (value.compareTo(BigDecimal.valueOf(100)) > 0) {
            return BigDecimal.valueOf(100).setScale(2, RoundingMode.HALF_UP);
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal scaleNullable(BigDecimal value) {
        return value == null ? null : value.setScale(2, RoundingMode.HALF_UP);
    }

    private Instant resolveFreshnessTimestamp(
            IntelligenceModels.ObservedView observed,
            IntelligenceModels.ForecastView forecast
    ) {
        if (!observed.signals().isEmpty()) {
            return observed.signals().getFirst().publishedAt();
        }
        if (!forecast.drivers().isEmpty()) {
            return forecast.drivers().getFirst().publishedAt();
        }
        return null;
    }

    private String freshnessLabel(Instant value) {
        if (value == null) {
            return "Unknown freshness";
        }

        long ageHours = Math.max(0L, Duration.between(value, Instant.now()).toHours());
        if (ageHours <= 6) {
            return "Fresh";
        }
        if (ageHours <= 24) {
            return "Recent";
        }
        if (ageHours <= 72) {
            return "Aging";
        }
        return "Stale";
    }

    private String forecastSummary(
            String countryName,
            String actionKey,
            int horizonDays,
            BigDecimal riskScore,
            List<IntelligenceModels.ForecastDriver> drivers
    ) {
        if (drivers.isEmpty()) {
            return "No recent live signal is strong enough to support an evidence-based forecast yet.";
        }
        return "%s risk over %d day(s) is %s at %s/100, driven by %s."
                .formatted(
                        actionKey + " around " + countryName,
                        horizonDays,
                        riskLabel(riskScore).toLowerCase(),
                        riskScore.setScale(0, RoundingMode.HALF_UP).toPlainString(),
                        drivers.getFirst().explanation().toLowerCase()
                );
    }

    private RulesCatalog.CountryRule validateCountry(String countryCode) {
        return rulesCatalogLoader.activeCatalog()
                .findCountry(countryCode == null ? null : countryCode.trim().toUpperCase())
                .orElseThrow(() -> new BadRequestException("Unsupported country code: " + countryCode));
    }

    private String validateAction(String actionKey) {
        String canonicalActionKey = ActionKeySupport.canonicalize(actionKey);
        rulesCatalogLoader.activeCatalog()
                .findAction(canonicalActionKey)
                .orElseThrow(() -> new BadRequestException("Unsupported action key: " + actionKey));
        return canonicalActionKey;
    }

    private void ensureEnabled() {
        if (!properties.intelligence().enabled()) {
            throw new BadRequestException("Intelligence endpoints are disabled");
        }
    }

    private int clampLimit(Integer limit) {
        int resolved = limit == null ? properties.intelligence().observedLimitDefault() : limit;
        return Math.min(Math.max(1, resolved), properties.intelligence().observedLimitMax());
    }

    private int clampHorizon(Integer horizonDays) {
        int resolved = horizonDays == null ? properties.intelligence().forecastHorizonDaysDefault() : horizonDays;
        return Math.min(Math.max(1, resolved), properties.intelligence().forecastHorizonDaysMax());
    }

    private String normalizeOptionalCountry(String countryCode) {
        if (countryCode == null || countryCode.isBlank()) {
            return null;
        }
        return validateCountry(countryCode).countryCode();
    }

    private String normalizeOptionalAction(String actionKey) {
        if (actionKey == null || actionKey.isBlank()) {
            return null;
        }
        return validateAction(actionKey);
    }

    private boolean matchesFilter(String actualValue, String expectedValue) {
        return expectedValue == null || expectedValue.equals(actualValue);
    }

    private <K> int removeMatching(Map<K, ?> cache, java.util.function.Predicate<K> predicate) {
        int removed = 0;
        for (K key : List.copyOf(cache.keySet())) {
            if (predicate.test(key) && cache.remove(key) != null) {
                removed++;
            }
        }
        return removed;
    }

    private <K, V> V resolveCached(Map<K, CachedValue<V>> cache, K key, ValueSupplier<V> supplier) {
        CachedValue<V> current = cache.get(key);
        Instant now = Instant.now();
        if (current != null && now.isBefore(current.expiresAt())) {
            return current.value();
        }

        V freshValue = supplier.get();
        cache.put(key, new CachedValue<>(
                freshValue,
                now.plusMillis(properties.intelligence().cacheTtlMs())
        ));
        return freshValue;
    }

    @FunctionalInterface
    private interface ValueSupplier<V> {
        V get();
    }

    private record CachedValue<V>(V value, Instant expiresAt) {
    }

    private record ObservedCacheKey(String countryCode, String actionKey, int limit) {
    }

    private record ForecastCacheKey(String countryCode, String actionKey, int horizonDays) {
    }

    public record CacheStatus(
            int observedEntries,
            int forecastEntries,
            long ttlMs
    ) {
    }

    public record CacheInvalidationResult(
            String countryCode,
            String actionKey,
            int observedEntriesRemoved,
            int forecastEntriesRemoved
    ) {
    }
}
