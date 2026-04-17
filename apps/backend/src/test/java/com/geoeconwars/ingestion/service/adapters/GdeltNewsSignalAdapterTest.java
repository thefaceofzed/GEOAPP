package com.geoeconwars.ingestion.service.adapters;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.geoeconwars.ingestion.domain.SignalSourceType;
import com.geoeconwars.ingestion.domain.SignalType;
import com.geoeconwars.ingestion.service.RawSignalRecord;
import com.geoeconwars.ingestion.support.IngestionTestFixtures;
import java.util.List;
import org.junit.jupiter.api.Test;

class GdeltNewsSignalAdapterTest {

    @Test
    void parseBodyExtractsHeadlineSnippetAndTimestamp() {
        GdeltNewsSignalAdapter adapter = new GdeltNewsSignalAdapter(new ObjectMapper(), IngestionTestFixtures.appProperties());
        String body = """
                {
                  "articles": [
                    {
                      "title": "Morocco and Spain discuss sanctions spillover",
                      "url": "https://example.test/news/1",
                      "seendate": "20260416153000",
                      "domain": "ExampleNews.com",
                      "snippet": "Talks focused on shipping lanes and regional trade exposure."
                    }
                  ]
                }
                """;

        List<RawSignalRecord> records = adapter.parseBody(body);

        assertThat(records).hasSize(1);
        RawSignalRecord record = records.getFirst();
        assertThat(record.sourceType()).isEqualTo(SignalSourceType.API);
        assertThat(record.signalType()).isEqualTo(SignalType.NEWS_HEADLINE);
        assertThat(record.topicTags()).contains("news", "geopolitics", "examplenews.com");
        assertThat(record.summary()).contains("shipping lanes");
        assertThat(record.publishedAt()).isNotNull();
    }
}
