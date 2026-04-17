package com.geoeconwars.ingestion.service.adapters;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.geoeconwars.ingestion.domain.SignalSentiment;
import com.geoeconwars.ingestion.domain.SignalType;
import com.geoeconwars.ingestion.support.IngestionTestFixtures;
import com.geoeconwars.rules.service.RulesCatalogLoader;
import java.util.List;
import org.junit.jupiter.api.Test;

class WorldBankTradeExposureSignalAdapterTest {

    @Test
    void parseIndicatorBodyBuildsObservationsAndAggregatesTradeExposure() {
        RulesCatalogLoader rulesCatalogLoader = mock(RulesCatalogLoader.class);
        when(rulesCatalogLoader.activeCatalog()).thenReturn(IngestionTestFixtures.catalog());
        WorldBankTradeExposureSignalAdapter adapter = new WorldBankTradeExposureSignalAdapter(
                new ObjectMapper(),
                IngestionTestFixtures.appProperties(),
                rulesCatalogLoader
        );

        String tradeBody = """
                [
                  { "page": 1, "pages": 1, "per_page": "50", "total": 2 },
                  [
                    {
                      "indicator": { "id": "NE.TRD.GNFS.ZS", "value": "Trade (% of GDP)" },
                      "country": { "id": "MA", "value": "Morocco" },
                      "countryiso3code": "MAR",
                      "date": "2024",
                      "value": 83.4
                    },
                    {
                      "indicator": { "id": "NE.TRD.GNFS.ZS", "value": "Trade (% of GDP)" },
                      "country": { "id": "JP", "value": "Japan" },
                      "countryiso3code": "JPN",
                      "date": "2024",
                      "value": 37.1
                    }
                  ]
                ]
                """;

        List<WorldBankTradeExposureSignalAdapter.IndicatorObservation> observations =
                adapter.parseIndicatorBody(tradeBody, "NE.TRD.GNFS.ZS");

        assertThat(observations).hasSize(2);
        assertThat(observations.getFirst().countryIso3()).isEqualTo("MAR");
        assertThat(observations.getFirst().indicatorCode()).isEqualTo("NE.TRD.GNFS.ZS");
    }

    @Test
    void fetchStyleAggregationProducesTradeExposureSignal() {
        RulesCatalogLoader rulesCatalogLoader = mock(RulesCatalogLoader.class);
        when(rulesCatalogLoader.activeCatalog()).thenReturn(IngestionTestFixtures.catalog());
        WorldBankTradeExposureSignalAdapter adapter = new WorldBankTradeExposureSignalAdapter(
                new ObjectMapper(),
                IngestionTestFixtures.appProperties(),
                rulesCatalogLoader
        );

        String tradeBody = """
                [
                  { "page": 1, "pages": 1, "per_page": "50", "total": 1 },
                  [
                    {
                      "countryiso3code": "MAR",
                      "date": "2024",
                      "value": 83.4
                    }
                  ]
                ]
                """;
        String exportBody = """
                [
                  { "page": 1, "pages": 1, "per_page": "50", "total": 1 },
                  [
                    {
                      "countryiso3code": "MAR",
                      "date": "2024",
                      "value": 41.8
                    }
                  ]
                ]
                """;
        String importBody = """
                [
                  { "page": 1, "pages": 1, "per_page": "50", "total": 1 },
                  [
                    {
                      "countryiso3code": "MAR",
                      "date": "2024",
                      "value": 41.6
                    }
                  ]
                ]
                """;

        var trade = adapter.parseIndicatorBody(tradeBody, "NE.TRD.GNFS.ZS");
        var exports = adapter.parseIndicatorBody(exportBody, "NE.EXP.GNFS.ZS");
        var imports = adapter.parseIndicatorBody(importBody, "NE.IMP.GNFS.ZS");

        var records = adapter.aggregateSignals(trade, exports, imports);
        var record = records.getFirst();

        assertThat(record).isNotNull();
        assertThat(record.signalType()).isEqualTo(SignalType.TRADE_EXPOSURE);
        assertThat(record.sentiment()).isEqualTo(SignalSentiment.NEUTRAL);
        assertThat(record.countryCodes()).containsExactly("MA");
        assertThat(record.summary()).contains("83.4");
    }
}
