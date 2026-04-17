package com.geoeconwars.ingestion.service.adapters;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.geoeconwars.ingestion.domain.SignalSentiment;
import com.geoeconwars.ingestion.domain.SignalSourceType;
import com.geoeconwars.ingestion.service.RawSignalRecord;
import com.geoeconwars.ingestion.support.IngestionTestFixtures;
import java.util.List;
import org.junit.jupiter.api.Test;

class StooqCommoditySignalAdapterTest {

    @Test
    void parseBodyBuildsCommoditySignalsFromCsv() {
        StooqCommoditySignalAdapter adapter = new StooqCommoditySignalAdapter(new ObjectMapper(), IngestionTestFixtures.appProperties());
        String body = """
                Symbol,Date,Time,Open,High,Low,Close,Volume,Name
                cl.f,2026-04-16,15:30:00,82.00,84.00,81.90,84.46,1000,WTI Crude
                gc.f,2026-04-16,15:30:00,2380.00,2395.00,2372.00,2374.20,1000,Gold
                """;

        List<RawSignalRecord> records = adapter.parseBody(body, "https://example.test/commodities");

        assertThat(records).hasSize(2);
        assertThat(records).extracting(RawSignalRecord::sourceType).containsOnly(SignalSourceType.SCRAPED);
        assertThat(records).extracting(RawSignalRecord::sentiment).contains(SignalSentiment.POSITIVE, SignalSentiment.NEGATIVE);
        assertThat(records.getFirst().summary()).contains("%");
        assertThat(records.getFirst().countryCodes()).isNotEmpty();
    }
}
