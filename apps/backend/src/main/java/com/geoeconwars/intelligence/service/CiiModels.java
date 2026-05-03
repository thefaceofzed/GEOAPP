package com.geoeconwars.intelligence.service;

import java.time.Instant;
import java.util.List;

public final class CiiModels {
    private CiiModels() {}

    public record CiiScore(
        String countryCode, String countryName, double combinedScore,
        double baselineRisk, double eventScore,
        double unrestScore, double conflictScore,
        double securityScore, double informationScore,
        String trend, int signalCount, Instant generatedAt
    ) {}

    public record CiiSnapshot(
        Instant generatedAt, int countryCount, double globalRiskScore,
        String globalRiskLevel, List<CiiScore> scores
    ) {}

    public record CorrelationAlert(
        String id, String type, String severity,
        List<String> countries, String summary,
        List<String> contributingSignalIds,
        Instant detectedAt, double confidence
    ) {}

    public record AnomalyResult(
        String countryCode, String signalType,
        double currentValue, double mean, double stddev,
        double zScore, String severity, Instant detectedAt
    ) {}

    public record IntelligenceDashboard(
        Instant generatedAt,
        CiiSnapshot ciiSnapshot,
        List<CorrelationAlert> correlations,
        List<AnomalyResult> anomalies,
        List<GeoSignal> recentSignals
    ) {}
}
