package com.geoeconwars.intelligence.service;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record GeoSignal(
    String id,
    String sourceType,
    String country,
    double lat,
    double lon,
    String severity,
    double severityScore,
    String summary,
    Instant timestamp,
    List<String> topicTags,
    Map<String, Object> metadata
) {
    public enum Severity { LOW, MEDIUM, HIGH, CRITICAL }

    public static String severityFromScore(double score) {
        if (score >= 75) return "CRITICAL";
        if (score >= 50) return "HIGH";
        if (score >= 25) return "MEDIUM";
        return "LOW";
    }
}
