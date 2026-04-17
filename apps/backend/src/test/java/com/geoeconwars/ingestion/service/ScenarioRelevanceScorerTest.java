package com.geoeconwars.ingestion.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.geoeconwars.ingestion.domain.SignalType;
import com.geoeconwars.ingestion.support.IngestionTestFixtures;
import com.geoeconwars.rules.service.RulesCatalogLoader;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.junit.jupiter.api.Test;

class ScenarioRelevanceScorerTest {

    @Test
    void scoreRanksDirectRecentAlignedSignalsHigher() {
        RulesCatalogLoader rulesCatalogLoader = mock(RulesCatalogLoader.class);
        when(rulesCatalogLoader.activeCatalog()).thenReturn(IngestionTestFixtures.catalog());
        ScenarioRelevanceScorer scorer = new ScenarioRelevanceScorer(rulesCatalogLoader);

        BigDecimal directScore = scorer.score(
                "MA",
                "sanctions",
                List.of("MA", "DZ"),
                List.of("sanctions", "trade"),
                SignalType.SANCTIONS_SIGNAL,
                BigDecimal.valueOf(82),
                Instant.now().minus(6, ChronoUnit.HOURS)
        );

        BigDecimal distantScore = scorer.score(
                "MA",
                "sanctions",
                List.of("JP"),
                List.of("alliance"),
                SignalType.COMMODITY_PRICE,
                BigDecimal.valueOf(12),
                Instant.now().minus(20, ChronoUnit.DAYS)
        );

        assertThat(directScore).isGreaterThan(BigDecimal.valueOf(0.70));
        assertThat(directScore).isGreaterThan(distantScore);
    }
}
