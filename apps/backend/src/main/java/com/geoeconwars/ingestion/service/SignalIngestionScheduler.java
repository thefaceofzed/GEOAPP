package com.geoeconwars.ingestion.service;

import com.geoeconwars.shared.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class SignalIngestionScheduler {

    private final Logger logger = LoggerFactory.getLogger(getClass());

    private final SignalIngestionService signalIngestionService;
    private final AppProperties properties;

    public SignalIngestionScheduler(SignalIngestionService signalIngestionService, AppProperties properties) {
        this.signalIngestionService = signalIngestionService;
        this.properties = properties;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void bootstrapOnStartup() {
        if (!properties.ingestion().enabled() || !properties.ingestion().bootstrapOnStartup()) {
            return;
        }
        logSummary("startup bootstrap", signalIngestionService.refreshSignals());
    }

    @Scheduled(fixedDelayString = "${app.ingestion.refresh-interval-ms:1800000}")
    public void scheduledRefresh() {
        if (!properties.ingestion().enabled() || !properties.ingestion().scheduleEnabled()) {
            return;
        }
        logSummary("scheduled refresh", signalIngestionService.refreshSignals());
    }

    private void logSummary(String trigger, SignalModels.RefreshSummary summary) {
        logger.info(
                "Signal ingestion {} completed: adapters={}, raw={}, inserted={}, updated={}, deduplicated={}, failedAdapters={}",
                trigger,
                summary.adapterCount(),
                summary.rawRecordCount(),
                summary.insertedCount(),
                summary.updatedCount(),
                summary.deduplicatedCount(),
                summary.failedAdapterCount()
        );
    }
}
