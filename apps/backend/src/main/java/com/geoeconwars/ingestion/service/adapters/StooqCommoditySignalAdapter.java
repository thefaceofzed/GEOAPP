package com.geoeconwars.ingestion.service.adapters;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.geoeconwars.ingestion.domain.SignalSentiment;
import com.geoeconwars.ingestion.domain.SignalSourceType;
import com.geoeconwars.ingestion.domain.SignalType;
import com.geoeconwars.ingestion.service.RawSignalRecord;
import com.geoeconwars.ingestion.service.SignalAdapter;
import com.geoeconwars.shared.config.AppProperties;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class StooqCommoditySignalAdapter extends AbstractSignalAdapter implements SignalAdapter {

    private static final Map<String, String> LABELS = Map.of(
            "cl.f", "WTI Crude",
            "ng.f", "Natural Gas",
            "gc.f", "Gold",
            "hg.f", "Copper"
    );

    private static final Map<String, List<String>> COUNTRY_CODES = Map.of(
            "cl.f", List.of("US", "SA", "AE"),
            "ng.f", List.of("US", "QA", "NO"),
            "gc.f", List.of("US", "CH"),
            "hg.f", List.of("CL", "PE", "CN")
    );

    public StooqCommoditySignalAdapter(ObjectMapper objectMapper, AppProperties properties) {
        super(objectMapper, properties);
    }

    @Override
    public String sourceName() {
        return "Stooq";
    }

    @Override
    public String sourceKey() {
        return "commodities";
    }

    @Override
    public boolean isEnabled() {
        return properties.ingestion().commodities().enabled();
    }

    @Override
    public List<RawSignalRecord> fetchSignals() {
        String url = UriComponentsBuilder.fromUriString(properties.ingestion().commodities().baseUrl())
                .queryParam("s", "cl.f,ng.f,gc.f,hg.f")
                .queryParam("f", "sd2t2ohlcvn")
                .queryParam("e", "csv")
                .toUriString();
        String body = restClient.get().uri(url).retrieve().body(String.class);
        return parseBody(body, url);
    }

    List<RawSignalRecord> parseBody(String body, String requestUrl) {
        List<RawSignalRecord> signals = new ArrayList<>();
        String[] lines = body.split("\\R");
        for (int index = 1; index < lines.length; index++) {
            String line = lines[index].trim();
            if (line.isBlank()) {
                continue;
            }
            String[] columns = line.split(",");
            if (columns.length < 7) {
                continue;
            }
            String symbol = columns[0].trim().toLowerCase();
            String label = LABELS.get(symbol);
            if (label == null) {
                continue;
            }

            BigDecimal open = parseDecimal(columns[3]);
            BigDecimal close = parseDecimal(columns[6]);
            if (open == null || close == null || open.signum() == 0) {
                continue;
            }

            Instant publishedAt = parseTimestamp(columns[1], columns.length > 2 ? columns[2] : null);
            BigDecimal changePercent = close.subtract(open)
                    .divide(open, 6, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
            BigDecimal severity = BigDecimal.valueOf(30)
                    .add(changePercent.abs().multiply(BigDecimal.TEN))
                    .min(BigDecimal.valueOf(80))
                    .setScale(2, RoundingMode.HALF_UP);

            signals.add(new RawSignalRecord(
                    sourceName(),
                    SignalSourceType.SCRAPED,
                    requestUrl,
                    publishedAt,
                    COUNTRY_CODES.getOrDefault(symbol, List.of()),
                    List.of("commodity", symbol.replace(".f", "")),
                    SignalType.COMMODITY_PRICE,
                    changePercent.signum() >= 0 ? SignalSentiment.POSITIVE : SignalSentiment.NEGATIVE,
                    severity,
                    label + " futures move",
                    label + " closed at " + close.setScale(2, RoundingMode.HALF_UP).toPlainString()
                            + " after opening at " + open.setScale(2, RoundingMode.HALF_UP).toPlainString()
                            + " (" + changePercent.setScale(2, RoundingMode.HALF_UP).toPlainString() + "%).",
                    columns[1].trim() + ":" + symbol
            ));
        }
        return signals;
    }

    private Instant parseTimestamp(String dateValue, String timeValue) {
        try {
            LocalDate date = LocalDate.parse(dateValue.trim());
            if (timeValue == null || timeValue.isBlank() || timeValue.contains("N/D")) {
                return date.atStartOfDay().toInstant(ZoneOffset.UTC);
            }
            LocalTime time = LocalTime.parse(timeValue.trim());
            return date.atTime(time).toInstant(ZoneOffset.UTC);
        } catch (Exception exception) {
            return Instant.now();
        }
    }

    private BigDecimal parseDecimal(String value) {
        try {
            return new BigDecimal(value.trim());
        } catch (Exception exception) {
            return null;
        }
    }
}
