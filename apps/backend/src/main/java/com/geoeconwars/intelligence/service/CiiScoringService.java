package com.geoeconwars.intelligence.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class CiiScoringService {

    private static final long CACHE_TTL_MS = 600_000; // 10 minutes

    private static final Map<String, Double> BASELINE_RISK = Map.ofEntries(
        Map.entry("US", 22.0), Map.entry("RU", 42.0), Map.entry("CN", 28.0),
        Map.entry("UA", 48.0), Map.entry("IR", 44.0), Map.entry("IL", 40.0),
        Map.entry("TW", 32.0), Map.entry("KP", 46.0), Map.entry("SA", 34.0),
        Map.entry("TR", 36.0), Map.entry("PL", 20.0), Map.entry("DE", 12.0),
        Map.entry("FR", 14.0), Map.entry("GB", 14.0), Map.entry("IN", 30.0),
        Map.entry("PK", 38.0), Map.entry("SY", 50.0), Map.entry("YE", 48.0),
        Map.entry("MM", 44.0), Map.entry("VE", 40.0), Map.entry("CU", 32.0),
        Map.entry("MX", 34.0), Map.entry("BR", 24.0), Map.entry("AE", 18.0)
    );
    private static final double DEFAULT_BASELINE = 15.0;

    private static final Map<String, Double> EVENT_MULTIPLIER = Map.ofEntries(
        Map.entry("US", 0.5), Map.entry("RU", 1.4), Map.entry("CN", 0.6),
        Map.entry("UA", 1.8), Map.entry("IR", 1.6), Map.entry("IL", 1.5),
        Map.entry("TW", 0.8), Map.entry("KP", 1.7), Map.entry("SA", 0.9),
        Map.entry("TR", 1.1), Map.entry("PL", 0.5), Map.entry("DE", 0.3),
        Map.entry("FR", 0.4), Map.entry("GB", 0.4), Map.entry("IN", 0.7),
        Map.entry("PK", 1.3), Map.entry("SY", 1.9), Map.entry("YE", 1.8),
        Map.entry("MM", 1.5), Map.entry("VE", 1.2), Map.entry("CU", 0.8),
        Map.entry("MX", 1.0), Map.entry("BR", 0.6), Map.entry("AE", 0.4)
    );
    private static final double DEFAULT_MULTIPLIER = 0.7;

    private static final Map<String, String> COUNTRY_NAMES = Map.ofEntries(
        Map.entry("US", "United States"), Map.entry("RU", "Russia"), Map.entry("CN", "China"),
        Map.entry("UA", "Ukraine"), Map.entry("IR", "Iran"), Map.entry("IL", "Israel"),
        Map.entry("TW", "Taiwan"), Map.entry("KP", "North Korea"), Map.entry("SA", "Saudi Arabia"),
        Map.entry("TR", "Turkey"), Map.entry("PL", "Poland"), Map.entry("DE", "Germany"),
        Map.entry("FR", "France"), Map.entry("GB", "United Kingdom"), Map.entry("IN", "India"),
        Map.entry("PK", "Pakistan"), Map.entry("SY", "Syria"), Map.entry("YE", "Yemen"),
        Map.entry("MM", "Myanmar"), Map.entry("VE", "Venezuela"), Map.entry("CU", "Cuba"),
        Map.entry("MX", "Mexico"), Map.entry("BR", "Brazil"), Map.entry("AE", "UAE"),
        Map.entry("JP", "Japan"), Map.entry("KR", "South Korea"), Map.entry("AU", "Australia"),
        Map.entry("NG", "Nigeria"), Map.entry("ZA", "South Africa"), Map.entry("EG", "Egypt"),
        Map.entry("AR", "Argentina"), Map.entry("CO", "Colombia"), Map.entry("IQ", "Iraq"),
        Map.entry("AF", "Afghanistan"), Map.entry("LY", "Libya"), Map.entry("SD", "Sudan")
    );

    private final SignalAggregationService signalAggregationService;
    private final ConcurrentHashMap<String, CachedScore> scoreCache = new ConcurrentHashMap<>();

    public CiiScoringService(SignalAggregationService signalAggregationService) {
        this.signalAggregationService = signalAggregationService;
    }

    public CiiModels.CiiScore computeScore(String countryCode) {
        String code = countryCode.toUpperCase();
        CachedScore cached = scoreCache.get(code);
        Instant now = Instant.now();
        if (cached != null && now.isBefore(cached.expiresAt)) {
            return cached.score;
        }

        List<GeoSignal> signals = signalAggregationService.getSignalsForCountry(code);
        CiiModels.CiiScore score = buildScore(code, signals);
        scoreCache.put(code, new CachedScore(score, now.plusMillis(CACHE_TTL_MS)));
        return score;
    }

    public Map<String, CiiModels.CiiScore> computeScores(List<String> countryCodes) {
        Map<String, CiiModels.CiiScore> results = new HashMap<>();
        for (String code : countryCodes) {
            results.put(code.toUpperCase(), computeScore(code));
        }
        return results;
    }

    public CiiModels.CiiSnapshot snapshot(List<String> countries) {
        List<String> codes = (countries != null && !countries.isEmpty())
            ? countries.stream().map(String::toUpperCase).toList()
            : new ArrayList<>(BASELINE_RISK.keySet());

        Map<String, CiiModels.CiiScore> scores = computeScores(codes);
        List<CiiModels.CiiScore> scoreList = scores.values().stream()
            .sorted((a, b) -> Double.compare(b.combinedScore(), a.combinedScore()))
            .toList();

        double globalRisk = scoreList.isEmpty() ? 0.0
            : scoreList.stream().mapToDouble(CiiModels.CiiScore::combinedScore).average().orElse(0.0);
        String globalLevel = riskLevel(globalRisk);

        return new CiiModels.CiiSnapshot(
            Instant.now(),
            scoreList.size(),
            Math.round(globalRisk * 100.0) / 100.0,
            globalLevel,
            scoreList
        );
    }

    public void invalidateCache() {
        scoreCache.clear();
    }

    private CiiModels.CiiScore buildScore(String countryCode, List<GeoSignal> signals) {
        double baseline = BASELINE_RISK.getOrDefault(countryCode, DEFAULT_BASELINE);
        double multiplier = EVENT_MULTIPLIER.getOrDefault(countryCode, DEFAULT_MULTIPLIER);

        double unrest = computeUnrestScore(signals, multiplier);
        double conflict = computeConflictScore(signals);
        double security = computeSecurityScore(signals);
        double information = computeInformationScore(signals);

        double eventScore = unrest * 0.25 + conflict * 0.30 + security * 0.20 + information * 0.25;
        eventScore = eventScore * multiplier;
        eventScore = Math.min(100.0, Math.max(0.0, eventScore));

        double combined = baseline * 0.40 + eventScore * 0.60;

        combined = applyFloorPins(combined, signals);
        combined = Math.min(100.0, Math.max(0.0, combined));

        String trend = determineTrend(signals);
        String name = COUNTRY_NAMES.getOrDefault(countryCode, countryCode);

        return new CiiModels.CiiScore(
            countryCode, name,
            Math.round(combined * 100.0) / 100.0,
            baseline,
            Math.round(eventScore * 100.0) / 100.0,
            Math.round(unrest * 100.0) / 100.0,
            Math.round(conflict * 100.0) / 100.0,
            Math.round(security * 100.0) / 100.0,
            Math.round(information * 100.0) / 100.0,
            trend, signals.size(), Instant.now()
        );
    }

    private double computeUnrestScore(List<GeoSignal> signals, double multiplier) {
        double score = 0;
        int count = 0;
        for (GeoSignal s : signals) {
            if ("NEWS".equals(s.sourceType()) || "CONFLICT_EVENT".equals(s.sourceType())) {
                score += s.severityScore();
                count++;
            }
        }
        if (count == 0) return 0;
        double avg = score / count;
        if (multiplier < 0.7) {
            avg = Math.log(1 + avg) / Math.log(2) * 10;
        }
        return Math.min(100.0, avg * (1 + Math.log1p(count) * 0.1));
    }

    private double computeConflictScore(List<GeoSignal> signals) {
        double score = 0;
        for (GeoSignal s : signals) {
            double weight = switch (s.sourceType()) {
                case "SANCTIONS_CHANGE" -> 3.0;
                case "CONFLICT_EVENT" -> 5.0;
                default -> 0.0;
            };
            if (weight > 0) {
                score += weight * Math.sqrt(s.severityScore());
            }
        }
        return Math.min(100.0, score);
    }

    private double computeSecurityScore(List<GeoSignal> signals) {
        double score = 0;
        int count = 0;
        for (GeoSignal s : signals) {
            if ("MACRO_RELEASE".equals(s.sourceType()) || "TRADE_FLOW".equals(s.sourceType())) {
                score += s.severityScore();
                count++;
            }
        }
        if (count == 0) return 0;
        return Math.min(100.0, score / count * (1 + Math.log1p(count) * 0.15));
    }

    private double computeInformationScore(List<GeoSignal> signals) {
        int newsCount = 0;
        double severitySum = 0;
        for (GeoSignal s : signals) {
            if ("NEWS".equals(s.sourceType())) {
                newsCount++;
                severitySum += s.severityScore();
            }
        }
        if (newsCount == 0) return 0;
        double avgSeverity = severitySum / newsCount;
        return Math.min(100.0, avgSeverity * (1 + Math.log1p(newsCount) * 0.2));
    }

    private double applyFloorPins(double combined, List<GeoSignal> signals) {
        double maxSeverity = signals.stream()
            .mapToDouble(GeoSignal::severityScore)
            .max().orElse(0);

        if (maxSeverity >= 90 && combined < 70) {
            return 70;
        }
        if (maxSeverity >= 80 && combined < 50) {
            return 50;
        }
        return combined;
    }

    private String determineTrend(List<GeoSignal> signals) {
        if (signals.size() < 2) return "stable";

        Instant now = Instant.now();
        Instant recent = now.minus(java.time.Duration.ofHours(24));
        Instant older = now.minus(java.time.Duration.ofHours(72));

        double recentAvg = signals.stream()
            .filter(s -> s.timestamp().isAfter(recent))
            .mapToDouble(GeoSignal::severityScore)
            .average().orElse(0);
        double olderAvg = signals.stream()
            .filter(s -> s.timestamp().isAfter(older) && s.timestamp().isBefore(recent))
            .mapToDouble(GeoSignal::severityScore)
            .average().orElse(0);

        if (olderAvg == 0) return "stable";
        double change = (recentAvg - olderAvg) / olderAvg;
        if (change > 0.15) return "rising";
        if (change < -0.15) return "falling";
        return "stable";
    }

    private String riskLevel(double score) {
        if (score >= 75) return "CRITICAL";
        if (score >= 50) return "HIGH";
        if (score >= 30) return "ELEVATED";
        if (score >= 15) return "MODERATE";
        return "LOW";
    }

    private record CachedScore(CiiModels.CiiScore score, Instant expiresAt) {}
}
