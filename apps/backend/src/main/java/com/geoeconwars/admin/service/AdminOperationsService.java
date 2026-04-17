package com.geoeconwars.admin.service;

import com.geoeconwars.ingestion.service.SignalIngestionService;
import com.geoeconwars.ingestion.service.SignalModels;
import com.geoeconwars.intelligence.service.IntelligenceService;
import com.geoeconwars.intelligence.service.IntelligenceStreamService;
import com.geoeconwars.shared.domain.SubjectType;
import com.geoeconwars.shared.service.AuditService;
import com.geoeconwars.users.domain.User;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class AdminOperationsService {

    private final SignalIngestionService signalIngestionService;
    private final IntelligenceService intelligenceService;
    private final IntelligenceStreamService intelligenceStreamService;
    private final AuditService auditService;

    public AdminOperationsService(
            SignalIngestionService signalIngestionService,
            IntelligenceService intelligenceService,
            IntelligenceStreamService intelligenceStreamService,
            AuditService auditService
    ) {
        this.signalIngestionService = signalIngestionService;
        this.intelligenceService = intelligenceService;
        this.intelligenceStreamService = intelligenceStreamService;
        this.auditService = auditService;
    }

    public AdminModels.IngestionStatusView ingestionStatus(User admin) {
        auditService.record("admin_ingestion_status_viewed", SubjectType.USER, admin.getId(), Map.of("email", admin.getEmail()));
        return new AdminModels.IngestionStatusView(
                Instant.now(),
                signalIngestionService.runtimeStatus(),
                intelligenceService.cacheStatus(),
                intelligenceStreamService.streamStatus()
        );
    }

    public AdminModels.RefreshSignalsView refreshSignals(User admin, String sourceKey) {
        String normalizedSourceKey = sourceKey == null || sourceKey.isBlank()
                ? null
                : sourceKey.trim().toLowerCase(Locale.ROOT);
        SignalModels.RefreshSummary summary = signalIngestionService.refreshSignals(normalizedSourceKey);
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("email", admin.getEmail());
        if (normalizedSourceKey != null) {
            metadata.put("sourceKey", normalizedSourceKey);
        }
        metadata.put("adapterCount", summary.adapterCount());
        metadata.put("insertedCount", summary.insertedCount());
        metadata.put("updatedCount", summary.updatedCount());
        auditService.record("admin_ingestion_refresh_triggered", SubjectType.USER, admin.getId(), metadata);
        return new AdminModels.RefreshSignalsView(
                Instant.now(),
                normalizedSourceKey,
                summary,
                signalIngestionService.runtimeStatus().lastRefresh()
        );
    }

    public AdminModels.IntelligenceStatusView intelligenceStatus(User admin) {
        auditService.record("admin_intelligence_status_viewed", SubjectType.USER, admin.getId(), Map.of("email", admin.getEmail()));
        return new AdminModels.IntelligenceStatusView(
                Instant.now(),
                intelligenceService.cacheStatus(),
                intelligenceStreamService.streamStatus()
        );
    }

    public AdminModels.CacheInvalidationView invalidateIntelligenceCache(User admin, String countryCode, String actionKey) {
        IntelligenceService.CacheInvalidationResult invalidation = intelligenceService.invalidateCaches(countryCode, actionKey);
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("email", admin.getEmail());
        if (invalidation.countryCode() != null) {
            metadata.put("countryCode", invalidation.countryCode());
        }
        if (invalidation.actionKey() != null) {
            metadata.put("actionKey", invalidation.actionKey());
        }
        metadata.put("observedEntriesRemoved", invalidation.observedEntriesRemoved());
        metadata.put("forecastEntriesRemoved", invalidation.forecastEntriesRemoved());
        auditService.record("admin_intelligence_cache_invalidated", SubjectType.USER, admin.getId(), metadata);
        return new AdminModels.CacheInvalidationView(
                Instant.now(),
                invalidation,
                intelligenceService.cacheStatus()
        );
    }
}
