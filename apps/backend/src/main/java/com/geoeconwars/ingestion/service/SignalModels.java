package com.geoeconwars.ingestion.service;

import com.geoeconwars.ingestion.domain.SignalSentiment;
import com.geoeconwars.ingestion.domain.SignalSourceType;
import com.geoeconwars.ingestion.domain.SignalType;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class SignalModels {

    private SignalModels() {
    }

    public record RelevantSignalView(
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
            BigDecimal relevanceScore
    ) {
    }

    public record RefreshSummary(
            int adapterCount,
            int rawRecordCount,
            int insertedCount,
            int updatedCount,
            int deduplicatedCount,
            int failedAdapterCount
    ) {
    }
}
