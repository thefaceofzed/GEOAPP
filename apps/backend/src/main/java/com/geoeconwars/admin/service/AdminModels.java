package com.geoeconwars.admin.service;

import com.geoeconwars.ingestion.service.SignalIngestionService;
import com.geoeconwars.ingestion.service.SignalModels;
import com.geoeconwars.intelligence.service.IntelligenceService;
import com.geoeconwars.intelligence.service.IntelligenceStreamService;
import java.time.Instant;

public final class AdminModels {

    private AdminModels() {
    }

    public record IngestionStatusView(
            Instant generatedAt,
            SignalIngestionService.RuntimeStatus ingestion,
            IntelligenceService.CacheStatus intelligenceCache,
            IntelligenceStreamService.StreamRuntimeStatus intelligenceStream
    ) {
    }

    public record RefreshSignalsView(
            Instant triggeredAt,
            String sourceKey,
            SignalModels.RefreshSummary summary,
            SignalIngestionService.RefreshRunState refreshState
    ) {
    }

    public record IntelligenceStatusView(
            Instant generatedAt,
            IntelligenceService.CacheStatus cache,
            IntelligenceStreamService.StreamRuntimeStatus stream
    ) {
    }

    public record CacheInvalidationView(
            Instant invalidatedAt,
            IntelligenceService.CacheInvalidationResult invalidation,
            IntelligenceService.CacheStatus cache
    ) {
    }
}
