package com.geoeconwars.intelligence.service;

import com.geoeconwars.ingestion.domain.SignalSentiment;
import com.geoeconwars.ingestion.domain.SignalSourceType;
import com.geoeconwars.ingestion.domain.SignalType;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class IntelligenceModels {

    private IntelligenceModels() {
    }

    public record ObservedSignal(
            String sourceName,
            SignalSourceType sourceType,
            String url,
            Instant publishedAt,
            List<String> countryCodes,
            List<String> topicTags,
            SignalType signalType,
            SignalSentiment sentiment,
            BigDecimal severityScore,
            String extractedSummary,
            String rawReferenceId,
            BigDecimal relevanceScore,
            BigDecimal confidenceScore
    ) {
    }

    public record ObservedView(
            Instant generatedAt,
            String countryCode,
            String countryName,
            String actionKey,
            int signalCount,
            List<ObservedSignal> signals
    ) {
    }

    public record ForecastDriver(
            String factorKey,
            String label,
            BigDecimal weight,
            String explanation,
            String sourceName,
            String rawReferenceId,
            Instant publishedAt
    ) {
    }

    public record ForecastView(
            Instant generatedAt,
            String countryCode,
            String countryName,
            String actionKey,
            int horizonDays,
            BigDecimal riskScore,
            String riskLabel,
            BigDecimal confidenceScore,
            String summary,
            List<ForecastDriver> drivers
    ) {
    }
}
