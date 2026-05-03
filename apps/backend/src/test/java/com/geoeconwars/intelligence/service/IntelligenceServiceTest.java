package com.geoeconwars.intelligence.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.geoeconwars.ingestion.domain.SignalSentiment;
import com.geoeconwars.ingestion.domain.SignalSourceType;
import com.geoeconwars.ingestion.domain.SignalType;
import com.geoeconwars.ingestion.service.SignalEnrichmentService;
import com.geoeconwars.ingestion.service.SignalModels;
import com.geoeconwars.ingestion.support.IngestionTestFixtures;
import com.geoeconwars.rules.service.RulesCatalogLoader;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.junit.jupiter.api.Test;

class IntelligenceServiceTest {

    @Test
    void postureEscalatesWhenSignalsAndForecastAreStrong() {
        SignalEnrichmentService enrichmentService = mock(SignalEnrichmentService.class);
        RulesCatalogLoader rulesCatalogLoader = mock(RulesCatalogLoader.class);
        when(rulesCatalogLoader.activeCatalog()).thenReturn(IngestionTestFixtures.catalog());
        when(enrichmentService.findRelevantSignals(eq("JP"), eq("war"), anyInt()))
                .thenReturn(List.of(relevantSignal(
                        "GDELT",
                        SignalType.NEWS_HEADLINE,
                        BigDecimal.valueOf(82),
                        BigDecimal.valueOf(0.91)
                )));

        IntelligenceService service = new IntelligenceService(
                enrichmentService,
                rulesCatalogLoader,
                IngestionTestFixtures.appProperties()
        );

        IntelligenceModels.PostureView posture = service.posture("jp", "war", 4, 14);

        assertThat(posture.posture()).isEqualTo("Escalate");
        assertThat(posture.postureTone()).isEqualTo("escalate");
        assertThat(posture.intelligenceScore()).isEqualByComparingTo("82.00");
        assertThat(posture.confidenceScore()).isGreaterThan(BigDecimal.valueOf(80));
        assertThat(posture.evidenceCount()).isEqualTo(2);
        assertThat(posture.sourceCoverage()).extracting(IntelligenceModels.SourceCoverage::label)
                .containsExactly("Observed signals", "Forecast drivers", "Scenario baseline");
    }

    @Test
    void postureShowsCoverageGapWhenLiveEvidenceIsMissing() {
        SignalEnrichmentService enrichmentService = mock(SignalEnrichmentService.class);
        RulesCatalogLoader rulesCatalogLoader = mock(RulesCatalogLoader.class);
        when(rulesCatalogLoader.activeCatalog()).thenReturn(IngestionTestFixtures.catalog());
        when(enrichmentService.findRelevantSignals(eq("MA"), eq("sanctions"), anyInt()))
                .thenReturn(List.of());

        IntelligenceService service = new IntelligenceService(
                enrichmentService,
                rulesCatalogLoader,
                IngestionTestFixtures.appProperties()
        );

        IntelligenceModels.PostureView posture = service.posture("MA", "sanctions", 4, 14);

        assertThat(posture.posture()).isEqualTo("Coverage gap");
        assertThat(posture.confidenceScore()).isNull();
        assertThat(posture.evidenceCount()).isZero();
        assertThat(posture.recommendedAction()).contains("baseline scenario");
        assertThat(posture.scenarioBaselineScore()).isEqualByComparingTo("61.00");
    }

    private static SignalModels.RelevantSignalView relevantSignal(
            String sourceName,
            SignalType signalType,
            BigDecimal severityScore,
            BigDecimal relevanceScore
    ) {
        return new SignalModels.RelevantSignalView(
                sourceName,
                SignalSourceType.API,
                "https://example.test/signal",
                Instant.now().minus(2, ChronoUnit.HOURS),
                List.of("JP"),
                List.of("war", "shipping"),
                signalType,
                SignalSentiment.NEGATIVE,
                severityScore,
                "Regional shipping stress is accelerating.",
                "signal-1",
                relevanceScore
        );
    }
}
