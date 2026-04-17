package com.geoeconwars.ingestion.service.adapters;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.geoeconwars.ingestion.domain.SignalType;
import com.geoeconwars.ingestion.service.RawSignalRecord;
import com.geoeconwars.ingestion.support.IngestionTestFixtures;
import com.geoeconwars.rules.service.RulesCatalogLoader;
import java.util.List;
import org.junit.jupiter.api.Test;

class FredMacroSignalAdapterTest {

    @Test
    void parseBodyBuildsMacroCalendarSignals() {
        RulesCatalogLoader rulesCatalogLoader = mock(RulesCatalogLoader.class);
        when(rulesCatalogLoader.activeCatalog()).thenReturn(IngestionTestFixtures.catalog());
        FredMacroSignalAdapter adapter = new FredMacroSignalAdapter(
                new ObjectMapper(),
                IngestionTestFixtures.appProperties(),
                rulesCatalogLoader
        );
        String body = """
                {
                  "release_dates": [
                    {
                      "release_id": 53,
                      "release_name": "Gross Domestic Product",
                      "date": "2026-04-15"
                    },
                    {
                      "release_id": 269,
                      "release_name": "National Accounts of Japan",
                      "date": "2026-04-14"
                    }
                  ]
                }
                """;

        List<RawSignalRecord> records = adapter.parseBody(body, "https://example.test/fred/releases/dates");

        assertThat(records).hasSize(2);
        assertThat(records).extracting(RawSignalRecord::signalType).containsOnly(SignalType.MACRO_EVENT);
        assertThat(records.get(1).countryCodes()).containsExactly("JP");
        assertThat(records.get(0).topicTags()).contains("macro", "calendar");
    }
}
