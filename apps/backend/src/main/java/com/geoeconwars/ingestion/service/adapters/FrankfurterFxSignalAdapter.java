package com.geoeconwars.ingestion.service.adapters;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.geoeconwars.ingestion.domain.SignalSentiment;
import com.geoeconwars.ingestion.domain.SignalSourceType;
import com.geoeconwars.ingestion.domain.SignalType;
import com.geoeconwars.ingestion.service.RawSignalRecord;
import com.geoeconwars.ingestion.service.SignalAdapter;
import com.geoeconwars.shared.config.AppProperties;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class FrankfurterFxSignalAdapter extends AbstractSignalAdapter implements SignalAdapter {

    private static final Map<String, String> REPRESENTATIVE_COUNTRY_BY_CURRENCY = Map.of(
            "USD", "US",
            "EUR", "DE",
            "JPY", "JP",
            "GBP", "GB",
            "CHF", "CH",
            "CNY", "CN",
            "MAD", "MA"
    );

    public FrankfurterFxSignalAdapter(ObjectMapper objectMapper, AppProperties properties) {
        super(objectMapper, properties);
    }

    @Override
    public String sourceName() {
        return "Frankfurter";
    }

    @Override
    public String sourceKey() {
        return "fx";
    }

    @Override
    public boolean isEnabled() {
        return properties.ingestion().fx().enabled();
    }

    @Override
    public List<RawSignalRecord> fetchSignals() {
        String url = UriComponentsBuilder.fromUriString(properties.ingestion().fx().baseUrl())
                .queryParam("from", "USD")
                .queryParam("to", "EUR,JPY,GBP,CHF,CNY,MAD")
                .toUriString();
        String body = restClient.get().uri(url).retrieve().body(String.class);
        return parseBody(body, url);
    }

    List<RawSignalRecord> parseBody(String body, String requestUrl) {
        try {
            JsonNode root = objectMapper.readTree(body);
            LocalDate date = LocalDate.parse(root.path("date").asText());
            Instant publishedAt = date.atStartOfDay().toInstant(ZoneOffset.UTC);
            JsonNode rates = root.path("rates");
            List<RawSignalRecord> signals = new ArrayList<>();
            rates.fields().forEachRemaining(entry -> signals.add(new RawSignalRecord(
                    sourceName(),
                    SignalSourceType.API,
                    requestUrl,
                    publishedAt,
                    representativeCountry(entry.getKey()),
                    List.of("fx", "currency", entry.getKey().toLowerCase()),
                    SignalType.FX_RATE,
                    SignalSentiment.NEUTRAL,
                    null,
                    "FX reference: USD/" + entry.getKey(),
                    "USD/" + entry.getKey() + " fixed at " + entry.getValue().decimalValue().stripTrailingZeros().toPlainString() + " for the latest reference day.",
                    date + ":" + entry.getKey()
            )));
            return signals;
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to parse Frankfurter response", exception);
        }
    }

    private List<String> representativeCountry(String currencyCode) {
        String countryCode = REPRESENTATIVE_COUNTRY_BY_CURRENCY.get(currencyCode);
        return countryCode == null ? List.of() : List.of(countryCode);
    }
}
