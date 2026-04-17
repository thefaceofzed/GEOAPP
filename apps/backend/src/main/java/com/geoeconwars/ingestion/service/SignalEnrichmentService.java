package com.geoeconwars.ingestion.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.geoeconwars.ingestion.domain.IngestedSignal;
import com.geoeconwars.ingestion.domain.IngestedSignalRepository;
import com.geoeconwars.shared.util.JsonSupport;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class SignalEnrichmentService {

    private static final TypeReference<List<String>> STRING_LIST = new TypeReference<>() {
    };

    private final IngestedSignalRepository ingestedSignalRepository;
    private final JsonSupport jsonSupport;
    private final ScenarioRelevanceScorer scenarioRelevanceScorer;

    public SignalEnrichmentService(
            IngestedSignalRepository ingestedSignalRepository,
            JsonSupport jsonSupport,
            ScenarioRelevanceScorer scenarioRelevanceScorer
    ) {
        this.ingestedSignalRepository = ingestedSignalRepository;
        this.jsonSupport = jsonSupport;
        this.scenarioRelevanceScorer = scenarioRelevanceScorer;
    }

    public List<SignalModels.RelevantSignalView> findRelevantSignals(String countryCode, String actionKey, int limit) {
        Instant publishedAfter = Instant.now().minus(30, ChronoUnit.DAYS);
        return ingestedSignalRepository.findTop200ByPublishedAtAfterOrderByPublishedAtDesc(publishedAfter).stream()
                .map(signal -> toRelevantSignalView(signal, countryCode, actionKey))
                .filter(signal -> signal.relevanceScore().signum() > 0)
                .sorted(Comparator.comparing(SignalModels.RelevantSignalView::relevanceScore).reversed()
                        .thenComparing(SignalModels.RelevantSignalView::publishedAt, Comparator.reverseOrder()))
                .limit(Math.max(1, limit))
                .toList();
    }

    private SignalModels.RelevantSignalView toRelevantSignalView(IngestedSignal signal, String countryCode, String actionKey) {
        List<String> countryCodes = jsonSupport.read(signal.getCountryCodesJson(), STRING_LIST);
        List<String> topicTags = jsonSupport.read(signal.getTopicTagsJson(), STRING_LIST);
        return new SignalModels.RelevantSignalView(
                signal.getSourceName(),
                signal.getSourceType(),
                signal.getUrl(),
                signal.getPublishedAt(),
                countryCodes,
                topicTags,
                signal.getSignalType(),
                signal.getSentiment(),
                signal.getSeverityScore(),
                signal.getExtractedSummary(),
                signal.getRawReferenceId(),
                scenarioRelevanceScorer.score(
                        countryCode,
                        actionKey,
                        countryCodes,
                        topicTags,
                        signal.getSignalType(),
                        signal.getSeverityScore(),
                        signal.getPublishedAt()
                )
        );
    }
}
