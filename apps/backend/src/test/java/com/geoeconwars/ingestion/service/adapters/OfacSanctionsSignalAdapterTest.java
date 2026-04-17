package com.geoeconwars.ingestion.service.adapters;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.geoeconwars.ingestion.domain.SignalSentiment;
import com.geoeconwars.ingestion.domain.SignalType;
import com.geoeconwars.ingestion.service.RawSignalRecord;
import com.geoeconwars.ingestion.support.IngestionTestFixtures;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class OfacSanctionsSignalAdapterTest {

    @Test
    void parseBodyBuildsSanctionsSignalsFromXml() {
        OfacSanctionsSignalAdapter adapter = new OfacSanctionsSignalAdapter(new ObjectMapper(), IngestionTestFixtures.appProperties());
        String body = """
                <sdnList>
                  <sdnEntry>
                    <uid>1001</uid>
                    <firstName>Ali</firstName>
                    <lastName>Example</lastName>
                    <programList>
                      <program>IRAN</program>
                    </programList>
                    <remarks>Shipping network tied to restricted procurement.</remarks>
                  </sdnEntry>
                </sdnList>
                """;

        List<RawSignalRecord> records = adapter.parseBody(body, Instant.parse("2026-04-16T10:00:00Z"), "https://example.test/ofac.xml");

        assertThat(records).hasSize(1);
        RawSignalRecord record = records.getFirst();
        assertThat(record.signalType()).isEqualTo(SignalType.SANCTIONS_SIGNAL);
        assertThat(record.sentiment()).isEqualTo(SignalSentiment.NEGATIVE);
        assertThat(record.topicTags()).contains("sanctions", "ofac");
        assertThat(record.rawReferenceId()).isEqualTo("1001");
        assertThat(record.summary()).contains("restricted procurement");
    }
}
