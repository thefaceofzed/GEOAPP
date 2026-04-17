package com.geoeconwars.ingestion.service;

import com.geoeconwars.ingestion.domain.IngestedSignal;
import com.geoeconwars.ingestion.domain.IngestedSignalRepository;
import com.geoeconwars.shared.config.AppProperties;
import com.geoeconwars.shared.exception.BadRequestException;
import com.geoeconwars.shared.exception.ConflictException;
import com.geoeconwars.shared.util.JsonSupport;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.locks.ReentrantLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SignalIngestionService {

    private final Logger logger = LoggerFactory.getLogger(getClass());

    private final List<SignalAdapter> signalAdapters;
    private final SignalNormalizationService signalNormalizationService;
    private final IngestedSignalRepository ingestedSignalRepository;
    private final JsonSupport jsonSupport;
    private final AppProperties properties;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final ReentrantLock refreshLock = new ReentrantLock();
    private final AtomicReference<RefreshRunState> lastRefreshState =
            new AtomicReference<>(new RefreshRunState(null, null, false, null, null));

    public SignalIngestionService(
            List<SignalAdapter> signalAdapters,
            SignalNormalizationService signalNormalizationService,
            IngestedSignalRepository ingestedSignalRepository,
            JsonSupport jsonSupport,
            AppProperties properties,
            ApplicationEventPublisher applicationEventPublisher
    ) {
        this.signalAdapters = signalAdapters;
        this.signalNormalizationService = signalNormalizationService;
        this.ingestedSignalRepository = ingestedSignalRepository;
        this.jsonSupport = jsonSupport;
        this.properties = properties;
        this.applicationEventPublisher = applicationEventPublisher;
    }

    @Transactional
    public SignalModels.RefreshSummary refreshSignals() {
        return refreshSignals(null);
    }

    @Transactional
    public SignalModels.RefreshSummary refreshSignals(String sourceKey) {
        if (!refreshLock.tryLock()) {
            throw new ConflictException("Signal refresh is already running");
        }

        Instant startedAt = Instant.now();
        SignalModels.RefreshSummary previousSummary = lastRefreshState.get().summary();
        lastRefreshState.set(new RefreshRunState(startedAt, null, true, previousSummary, null));

        try {
            if (!properties.ingestion().enabled()) {
                SignalModels.RefreshSummary disabledSummary = new SignalModels.RefreshSummary(0, 0, 0, 0, 0, 0);
                lastRefreshState.set(new RefreshRunState(startedAt, Instant.now(), false, disabledSummary, null));
                return disabledSummary;
            }

            List<SignalAdapter> adaptersToRun = selectAdapters(normalizeSourceKey(sourceKey));

            int adapterCount = 0;
            int rawRecordCount = 0;
            int insertedCount = 0;
            int updatedCount = 0;
            int deduplicatedCount = 0;
            int failedAdapterCount = 0;

            for (SignalAdapter adapter : adaptersToRun) {
                if (!adapter.isEnabled()) {
                    continue;
                }
                adapterCount++;
                try {
                    List<RawSignalRecord> rawSignals = adapter.fetchSignals();
                    rawRecordCount += rawSignals.size();
                    for (RawSignalRecord rawSignal : rawSignals) {
                        try {
                            NormalizedSignalCandidate candidate = signalNormalizationService.normalize(rawSignal);
                            IngestedSignal existing = ingestedSignalRepository.findByDedupeHash(candidate.dedupeHash()).orElse(null);
                            if (existing == null) {
                                ingestedSignalRepository.save(newEntity(candidate));
                                insertedCount++;
                                continue;
                            }
                            if (applyUpdates(existing, candidate)) {
                                ingestedSignalRepository.save(existing);
                                updatedCount++;
                            } else {
                                deduplicatedCount++;
                            }
                        } catch (RuntimeException exception) {
                            logger.warn("Skipping invalid signal from {}: {}", adapter.sourceName(), exception.getMessage());
                        }
                    }
                } catch (RuntimeException exception) {
                    failedAdapterCount++;
                    logger.warn("Signal adapter {} failed: {}", adapter.sourceName(), exception.getMessage(), exception);
                }
            }

            SignalModels.RefreshSummary summary = new SignalModels.RefreshSummary(
                    adapterCount,
                    rawRecordCount,
                    insertedCount,
                    updatedCount,
                    deduplicatedCount,
                    failedAdapterCount
            );

            lastRefreshState.set(new RefreshRunState(startedAt, Instant.now(), false, summary, null));

            if (insertedCount > 0 || updatedCount > 0) {
                applicationEventPublisher.publishEvent(new SignalsRefreshedEvent(
                        Instant.now(),
                        insertedCount,
                        updatedCount
                ));
            }

            return summary;
        } catch (RuntimeException exception) {
            lastRefreshState.set(new RefreshRunState(startedAt, Instant.now(), false, previousSummary, exception.getMessage()));
            throw exception;
        } finally {
            refreshLock.unlock();
        }
    }

    public RuntimeStatus runtimeStatus() {
        Instant latestSignalPublishedAt = ingestedSignalRepository.findTopByOrderByPublishedAtDesc()
                .map(IngestedSignal::getPublishedAt)
                .orElse(null);

        return new RuntimeStatus(
                properties.ingestion().enabled(),
                properties.ingestion().scheduleEnabled(),
                properties.ingestion().bootstrapOnStartup(),
                properties.ingestion().refreshIntervalMs(),
                ingestedSignalRepository.count(),
                latestSignalPublishedAt,
                lastRefreshState.get(),
                signalAdapters.stream()
                        .map(adapter -> new AdapterRuntimeStatus(adapter.sourceKey(), adapter.sourceName(), adapter.isEnabled()))
                        .toList()
        );
    }

    private List<SignalAdapter> selectAdapters(String sourceKey) {
        if (sourceKey == null) {
            return signalAdapters;
        }

        List<SignalAdapter> matchingAdapters = signalAdapters.stream()
                .filter(adapter -> sourceKey.equals(adapter.sourceKey()))
                .toList();
        if (matchingAdapters.isEmpty()) {
            throw new BadRequestException("Unsupported ingestion source: " + sourceKey);
        }
        return matchingAdapters;
    }

    private String normalizeSourceKey(String sourceKey) {
        if (sourceKey == null || sourceKey.isBlank()) {
            return null;
        }
        return sourceKey.trim().toLowerCase(Locale.ROOT);
    }

    private IngestedSignal newEntity(NormalizedSignalCandidate candidate) {
        IngestedSignal signal = new IngestedSignal();
        apply(signal, candidate);
        return signal;
    }

    private boolean applyUpdates(IngestedSignal existing, NormalizedSignalCandidate candidate) {
        String countryCodesJson = jsonSupport.write(candidate.countryCodes());
        String topicTagsJson = jsonSupport.write(candidate.topicTags());
        boolean changed = !existing.getSourceName().equals(candidate.sourceName())
                || existing.getSourceType() != candidate.sourceType()
                || !existing.getUrl().equals(candidate.url())
                || !existing.getPublishedAt().equals(candidate.publishedAt())
                || !existing.getCountryCodesJson().equals(countryCodesJson)
                || !existing.getTopicTagsJson().equals(topicTagsJson)
                || existing.getSignalType() != candidate.signalType()
                || existing.getSentiment() != candidate.sentiment()
                || existing.getSeverityScore().compareTo(candidate.severityScore()) != 0
                || !existing.getExtractedSummary().equals(candidate.extractedSummary())
                || !existing.getRawReferenceId().equals(candidate.rawReferenceId());
        if (changed) {
            apply(existing, candidate);
        }
        return changed;
    }

    private void apply(IngestedSignal signal, NormalizedSignalCandidate candidate) {
        signal.setSourceName(candidate.sourceName());
        signal.setSourceType(candidate.sourceType());
        signal.setUrl(candidate.url());
        signal.setPublishedAt(candidate.publishedAt());
        signal.setCountryCodesJson(jsonSupport.write(candidate.countryCodes()));
        signal.setTopicTagsJson(jsonSupport.write(candidate.topicTags()));
        signal.setSignalType(candidate.signalType());
        signal.setSentiment(candidate.sentiment());
        signal.setSeverityScore(candidate.severityScore());
        signal.setExtractedSummary(candidate.extractedSummary());
        signal.setRawReferenceId(candidate.rawReferenceId());
        signal.setDedupeHash(candidate.dedupeHash());
    }

    public record RuntimeStatus(
            boolean enabled,
            boolean scheduleEnabled,
            boolean bootstrapOnStartup,
            long refreshIntervalMs,
            long storedSignalCount,
            Instant latestSignalPublishedAt,
            RefreshRunState lastRefresh,
            List<AdapterRuntimeStatus> adapters
    ) {
    }

    public record AdapterRuntimeStatus(
            String sourceKey,
            String sourceName,
            boolean enabled
    ) {
    }

    public record RefreshRunState(
            Instant startedAt,
            Instant completedAt,
            boolean inProgress,
            SignalModels.RefreshSummary summary,
            String failureMessage
    ) {
    }
}
