package com.geoeconwars.intelligence.service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class CorrelationEngine {

    private static final long CACHE_TTL_MS = 300_000; // 5 minutes
    private static final Duration CONVERGENCE_WINDOW = Duration.ofHours(24);
    private static final Duration VELOCITY_WINDOW = Duration.ofHours(2);
    private static final Duration NEWS_LEAD_WINDOW = Duration.ofHours(1);
    private static final int CONVERGENCE_MIN_TYPES = 3;
    private static final int VELOCITY_MIN_SIGNALS = 3;

    private static final Set<String> MARKET_TYPES = Set.of("COMMODITY_MOVE", "FX_MOVE");
    private static final Set<String> NEWS_TYPES = Set.of("NEWS");

    private final SignalAggregationService signalAggregationService;
    private final ConcurrentHashMap<String, CachedCorrelations> cache = new ConcurrentHashMap<>();

    public CorrelationEngine(SignalAggregationService signalAggregationService) {
        this.signalAggregationService = signalAggregationService;
    }

    public List<CiiModels.CorrelationAlert> detectCorrelations() {
        CachedCorrelations cached = cache.get("latest");
        Instant now = Instant.now();
        if (cached != null && now.isBefore(cached.expiresAt)) {
            return cached.alerts;
        }

        List<GeoSignal> recentSignals = signalAggregationService.getRecentSignals(48);
        List<CiiModels.CorrelationAlert> alerts = new ArrayList<>();

        alerts.addAll(detectConvergence(recentSignals));
        alerts.addAll(detectVelocitySpikes(recentSignals));
        alerts.addAll(detectNewsLeadsMarkets(recentSignals));
        alerts.addAll(detectSilentDivergence(recentSignals));

        alerts.sort((a, b) -> b.detectedAt().compareTo(a.detectedAt()));
        cache.put("latest", new CachedCorrelations(alerts, now.plusMillis(CACHE_TTL_MS)));
        return alerts;
    }

    public void invalidateCache() {
        cache.clear();
    }

    private List<CiiModels.CorrelationAlert> detectConvergence(List<GeoSignal> signals) {
        List<CiiModels.CorrelationAlert> alerts = new ArrayList<>();
        Map<String, List<GeoSignal>> byCountry = groupByCountry(signals);

        for (var entry : byCountry.entrySet()) {
            String country = entry.getKey();
            List<GeoSignal> countrySignals = entry.getValue();

            Map<String, List<GeoSignal>> windows = slidingWindowByType(countrySignals, CONVERGENCE_WINDOW);
            if (windows.size() >= CONVERGENCE_MIN_TYPES) {
                List<String> signalIds = countrySignals.stream()
                    .map(GeoSignal::id).toList();
                double confidence = Math.min(1.0, windows.size() / 7.0 + 0.3);
                String severity = confidence >= 0.7 ? "HIGH" : "MEDIUM";

                alerts.add(new CiiModels.CorrelationAlert(
                    UUID.randomUUID().toString(),
                    "CONVERGENCE",
                    severity,
                    List.of(country),
                    "%d signal types converging in %s within 24h window".formatted(windows.size(), country),
                    signalIds,
                    Instant.now(),
                    Math.round(confidence * 100.0) / 100.0
                ));
            }
        }
        return alerts;
    }

    private List<CiiModels.CorrelationAlert> detectVelocitySpikes(List<GeoSignal> signals) {
        List<CiiModels.CorrelationAlert> alerts = new ArrayList<>();
        Map<String, List<GeoSignal>> byCountry = groupByCountry(signals);

        for (var entry : byCountry.entrySet()) {
            String country = entry.getKey();
            List<GeoSignal> countrySignals = entry.getValue();

            List<GeoSignal> sorted = countrySignals.stream()
                .sorted((a, b) -> a.timestamp().compareTo(b.timestamp()))
                .toList();

            for (int i = 0; i < sorted.size(); i++) {
                Instant windowEnd = sorted.get(i).timestamp().plus(VELOCITY_WINDOW);
                Set<String> sources = new HashSet<>();
                List<String> ids = new ArrayList<>();

                for (int j = i; j < sorted.size() && sorted.get(j).timestamp().isBefore(windowEnd); j++) {
                    sources.add(sorted.get(j).sourceType());
                    ids.add(sorted.get(j).id());
                }

                if (sources.size() >= VELOCITY_MIN_SIGNALS) {
                    double confidence = Math.min(1.0, sources.size() / 5.0 + 0.2);
                    alerts.add(new CiiModels.CorrelationAlert(
                        UUID.randomUUID().toString(),
                        "VELOCITY_SPIKE",
                        "HIGH",
                        List.of(country),
                        "%d different source types fired within 2h for %s".formatted(sources.size(), country),
                        ids,
                        Instant.now(),
                        Math.round(confidence * 100.0) / 100.0
                    ));
                    break; // one alert per country
                }
            }
        }
        return alerts;
    }

    private List<CiiModels.CorrelationAlert> detectNewsLeadsMarkets(List<GeoSignal> signals) {
        List<CiiModels.CorrelationAlert> alerts = new ArrayList<>();
        List<GeoSignal> newsSignals = signals.stream()
            .filter(s -> NEWS_TYPES.contains(s.sourceType())).toList();
        List<GeoSignal> marketSignals = signals.stream()
            .filter(s -> MARKET_TYPES.contains(s.sourceType())).toList();

        Map<String, List<GeoSignal>> newsByCountry = new HashMap<>();
        for (GeoSignal ns : newsSignals) {
            newsByCountry.computeIfAbsent(ns.country(), k -> new ArrayList<>()).add(ns);
        }

        Set<String> alerted = new HashSet<>();
        for (GeoSignal ms : marketSignals) {
            if (alerted.contains(ms.country())) continue;
            List<GeoSignal> countryNews = newsByCountry.getOrDefault(ms.country(), List.of());

            List<String> leadingIds = new ArrayList<>();
            for (GeoSignal ns : countryNews) {
                Duration gap = Duration.between(ns.timestamp(), ms.timestamp());
                if (!gap.isNegative() && gap.compareTo(NEWS_LEAD_WINDOW) <= 0) {
                    leadingIds.add(ns.id());
                }
            }

            if (!leadingIds.isEmpty()) {
                leadingIds.add(ms.id());
                alerts.add(new CiiModels.CorrelationAlert(
                    UUID.randomUUID().toString(),
                    "NEWS_LEADS_MARKETS",
                    "MEDIUM",
                    List.of(ms.country()),
                    "News signals preceded %s move in %s".formatted(ms.sourceType(), ms.country()),
                    leadingIds,
                    Instant.now(),
                    0.65
                ));
                alerted.add(ms.country());
            }
        }
        return alerts;
    }

    private List<CiiModels.CorrelationAlert> detectSilentDivergence(List<GeoSignal> signals) {
        List<CiiModels.CorrelationAlert> alerts = new ArrayList<>();
        Map<String, List<GeoSignal>> byCountry = groupByCountry(signals);

        for (var entry : byCountry.entrySet()) {
            String country = entry.getKey();
            List<GeoSignal> countrySignals = entry.getValue();

            boolean hasMarketMove = countrySignals.stream()
                .anyMatch(s -> MARKET_TYPES.contains(s.sourceType()) && s.severityScore() >= 40);
            long newsCount = countrySignals.stream()
                .filter(s -> NEWS_TYPES.contains(s.sourceType())).count();

            if (hasMarketMove && newsCount == 0) {
                List<String> ids = countrySignals.stream()
                    .filter(s -> MARKET_TYPES.contains(s.sourceType()))
                    .map(GeoSignal::id).toList();

                alerts.add(new CiiModels.CorrelationAlert(
                    UUID.randomUUID().toString(),
                    "SILENT_DIVERGENCE",
                    "MEDIUM",
                    List.of(country),
                    "Market move in %s with no corresponding news coverage".formatted(country),
                    ids,
                    Instant.now(),
                    0.55
                ));
            }
        }
        return alerts;
    }

    private Map<String, List<GeoSignal>> groupByCountry(List<GeoSignal> signals) {
        Map<String, List<GeoSignal>> grouped = new HashMap<>();
        for (GeoSignal s : signals) {
            grouped.computeIfAbsent(s.country(), k -> new ArrayList<>()).add(s);
        }
        return grouped;
    }

    private Map<String, List<GeoSignal>> slidingWindowByType(List<GeoSignal> signals, Duration window) {
        Instant cutoff = Instant.now().minus(window);
        Map<String, List<GeoSignal>> byType = new HashMap<>();
        for (GeoSignal s : signals) {
            if (s.timestamp().isAfter(cutoff)) {
                byType.computeIfAbsent(s.sourceType(), k -> new ArrayList<>()).add(s);
            }
        }
        return byType;
    }

    private record CachedCorrelations(List<CiiModels.CorrelationAlert> alerts, Instant expiresAt) {}
}
