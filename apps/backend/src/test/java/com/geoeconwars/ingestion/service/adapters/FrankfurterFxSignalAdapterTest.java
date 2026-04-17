package com.geoeconwars.ingestion.service.adapters;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.geoeconwars.ingestion.domain.SignalType;
import com.geoeconwars.ingestion.service.RawSignalRecord;
import com.geoeconwars.ingestion.support.IngestionTestFixtures;
import java.util.List;
import org.junit.jupiter.api.Test;

class FrankfurterFxSignalAdapterTest {

    @Test
    void parseBodyCreatesOneSignalPerQuoteCurrency() {
        FrankfurterFxSignalAdapter adapter = new FrankfurterFxSignalAdapter(new ObjectMapper(), IngestionTestFixtures.appProperties());
        String body = """
                {
                  "amount": 1.0,
                  "base": "USD",
                  "date": "2026-04-16",
                  "rates": {
                    "EUR": 0.91,
                    "JPY": 152.41
                  }
                }
                """;

        List<RawSignalRecord> records = adapter.parseBody(body, "https://example.test/fx?from=USD");

        assertThat(records).hasSize(2);
        assertThat(records).extracting(RawSignalRecord::signalType).containsOnly(SignalType.FX_RATE);
        assertThat(records).extracting(RawSignalRecord::countryCodes).contains(List.of("DE"), List.of("JP"));
        assertThat(records.getFirst().summary()).contains("USD/");
    }
}
