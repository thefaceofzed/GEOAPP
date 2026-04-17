package com.geoeconwars.ingestion.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.geoeconwars.ingestion.domain.SignalSourceType;
import com.geoeconwars.ingestion.domain.SignalType;
import com.geoeconwars.ingestion.support.IngestionTestFixtures;
import com.geoeconwars.rules.service.RulesCatalogLoader;
import com.geoeconwars.shared.util.HashingSupport;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class SignalNormalizationServiceTest {

    @Test
    void normalizeInfersCountryCodesTopicsAndSummary() {
        RulesCatalogLoader rulesCatalogLoader = mock(RulesCatalogLoader.class);
        when(rulesCatalogLoader.activeCatalog()).thenReturn(IngestionTestFixtures.catalog());

        SignalNormalizationService service = new SignalNormalizationService(
                rulesCatalogLoader,
                new HashingSupport(),
                IngestionTestFixtures.appProperties()
        );

        RawSignalRecord rawSignal = new RawSignalRecord(
                "GDELT",
                SignalSourceType.API,
                "https://example.test/article",
                Instant.parse("2026-04-16T12:00:00Z"),
                null,
                null,
                SignalType.NEWS_HEADLINE,
                null,
                null,
                "Spain and Algeria review energy routes as Morocco faces new sanctions pressure",
                "Officials said the dispute could disrupt regional trade, gas flows, and alliance planning across North Africa and Southern Europe.",
                null
        );

        NormalizedSignalCandidate normalized = service.normalize(rawSignal);

        assertThat(normalized.countryCodes()).contains("ES", "DZ", "MA");
        assertThat(normalized.topicTags()).contains("sanctions", "trade", "alliance");
        assertThat(normalized.extractedSummary()).hasSizeLessThanOrEqualTo(IngestionTestFixtures.appProperties().ingestion().maxSummaryLength());
        assertThat(normalized.sentiment().value()).isEqualTo("negative");
        assertThat(normalized.severityScore()).isBetween(java.math.BigDecimal.ZERO, java.math.BigDecimal.valueOf(100));
        assertThat(normalized.rawReferenceId()).isNotBlank();
        assertThat(normalized.dedupeHash()).hasSize(64);
    }
}
