package com.geoeconwars.intelligence.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class AnomalyDetector {

    private static final int MIN_SAMPLES = 10;
    private static final double Z_HIGH = 3.0;
    private static final double Z_MEDIUM = 2.0;
    private static final double Z_LOW = 1.5;
    private static final long CACHE_TTL_MS = 300_000; // 5 minutes

    private final SignalAggregationService signalAggregationService;
    private final ConcurrentHashMap<AccumulatorKey, WelfordAccumulator> accumulators = new ConcurrentHashMap<>();
    private volatile CachedAnomalies cachedAnomalies;

    public AnomalyDetector(SignalAggregationService signalAggregationService) {
        this.signalAggregationService = signalAggregationService;
    }

    public List<CiiModels.AnomalyResult> detectAnomalies() {
        CachedAnomalies cached = this.cachedAnomalies;
        Instant now = Instant.now();
        if (cached != null && now.isBefore(cached.expiresAt)) {
            return cached.results;
        }

        Map<String, List<GeoSignal>> byCountry = signalAggregationService.getSignalsByCountry();
        List<CiiModels.AnomalyResult> results = new ArrayList<>();

        for (var entry : byCountry.entrySet()) {
            String country = entry.getKey();
            Map<String, List<GeoSignal>> byType = groupByType(entry.getValue());

            for (var typeEntry : byType.entrySet()) {
                String signalType = typeEntry.getKey();
                List<GeoSignal> signals = typeEntry.getValue();

                AccumulatorKey key = new AccumulatorKey(country, signalType);
                WelfordAccumulator acc = accumulators.computeIfAbsent(key, k -> new WelfordAccumulator());

                for (GeoSignal s : signals) {
                    acc.update(s.severityScore());
                }

                if (acc.count() < MIN_SAMPLES) continue;

                double latestValue = signals.getLast().severityScore();
                double z = acc.zScore(latestValue);
                double absZ = Math.abs(z);

                if (absZ >= Z_LOW) {
                    String severity = severityFromZ(absZ);
                    results.add(new CiiModels.AnomalyResult(
                        country,
                        signalType,
                        latestValue,
                        Math.round(acc.mean() * 100.0) / 100.0,
                        Math.round(acc.stddev() * 100.0) / 100.0,
                        Math.round(z * 100.0) / 100.0,
                        severity,
                        Instant.now()
                    ));
                }
            }
        }

        results.sort((a, b) -> Double.compare(Math.abs(b.zScore()), Math.abs(a.zScore())));
        this.cachedAnomalies = new CachedAnomalies(results, now.plusMillis(CACHE_TTL_MS));
        return results;
    }

    public void invalidateCache() {
        this.cachedAnomalies = null;
    }

    public void resetAccumulators() {
        accumulators.clear();
        this.cachedAnomalies = null;
    }

    private Map<String, List<GeoSignal>> groupByType(List<GeoSignal> signals) {
        Map<String, List<GeoSignal>> grouped = new ConcurrentHashMap<>();
        for (GeoSignal s : signals) {
            grouped.computeIfAbsent(s.sourceType(), k -> new ArrayList<>()).add(s);
        }
        return grouped;
    }

    private String severityFromZ(double absZ) {
        if (absZ >= Z_HIGH) return "HIGH";
        if (absZ >= Z_MEDIUM) return "MEDIUM";
        return "LOW";
    }

    static class WelfordAccumulator {
        private long count;
        private double mean;
        private double m2;

        public synchronized void update(double value) {
            count++;
            double delta = value - mean;
            mean += delta / count;
            double delta2 = value - mean;
            m2 += delta * delta2;
        }

        public synchronized long count() {
            return count;
        }

        public synchronized double mean() {
            return mean;
        }

        public synchronized double variance() {
            if (count < 2) return 0.0;
            return m2 / (count - 1);
        }

        public synchronized double stddev() {
            return Math.sqrt(variance());
        }

        public synchronized double zScore(double value) {
            double sd = stddev();
            if (sd == 0) return 0.0;
            return (value - mean) / sd;
        }
    }

    private record AccumulatorKey(String countryCode, String signalType) {}

    private record CachedAnomalies(List<CiiModels.AnomalyResult> results, Instant expiresAt) {}
}
