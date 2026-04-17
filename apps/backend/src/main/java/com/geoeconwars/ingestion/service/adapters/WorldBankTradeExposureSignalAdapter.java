package com.geoeconwars.ingestion.service.adapters;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.geoeconwars.ingestion.domain.SignalSentiment;
import com.geoeconwars.ingestion.domain.SignalSourceType;
import com.geoeconwars.ingestion.domain.SignalType;
import com.geoeconwars.ingestion.service.RawSignalRecord;
import com.geoeconwars.ingestion.service.SignalAdapter;
import com.geoeconwars.rules.domain.RulesCatalog;
import com.geoeconwars.rules.service.RulesCatalogLoader;
import com.geoeconwars.shared.config.AppProperties;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class WorldBankTradeExposureSignalAdapter extends AbstractSignalAdapter implements SignalAdapter {

    private static final String TRADE_OPENNESS = "NE.TRD.GNFS.ZS";
    private static final String EXPORT_SHARE = "NE.EXP.GNFS.ZS";
    private static final String IMPORT_SHARE = "NE.IMP.GNFS.ZS";

    private final RulesCatalogLoader rulesCatalogLoader;

    public WorldBankTradeExposureSignalAdapter(
            ObjectMapper objectMapper,
            AppProperties properties,
            RulesCatalogLoader rulesCatalogLoader
    ) {
        super(objectMapper, properties);
        this.rulesCatalogLoader = rulesCatalogLoader;
    }

    @Override
    public String sourceName() {
        return "WorldBank";
    }

    @Override
    public String sourceKey() {
        return "trade";
    }

    @Override
    public boolean isEnabled() {
        return properties.ingestion().trade().enabled();
    }

    @Override
    public List<RawSignalRecord> fetchSignals() {
        int currentYear = LocalDate.now(ZoneOffset.UTC).getYear();
        String dateRange = (currentYear - 6) + ":" + currentYear;

        String tradeUrl = buildIndicatorUrl(TRADE_OPENNESS, dateRange);
        String exportUrl = buildIndicatorUrl(EXPORT_SHARE, dateRange);
        String importUrl = buildIndicatorUrl(IMPORT_SHARE, dateRange);

        return aggregateSignals(
                parseIndicatorBody(restClient.get().uri(tradeUrl).retrieve().body(String.class), TRADE_OPENNESS),
                parseIndicatorBody(restClient.get().uri(exportUrl).retrieve().body(String.class), EXPORT_SHARE),
                parseIndicatorBody(restClient.get().uri(importUrl).retrieve().body(String.class), IMPORT_SHARE)
        );
    }

    List<RawSignalRecord> aggregateSignals(
            List<IndicatorObservation> tradeObservations,
            List<IndicatorObservation> exportObservations,
            List<IndicatorObservation> importObservations
    ) {
        CountryTradeMetrics metrics = new CountryTradeMetrics();
        mergeIndicator(metrics, tradeObservations);
        mergeIndicator(metrics, exportObservations);
        mergeIndicator(metrics, importObservations);

        RulesCatalog catalog = rulesCatalogLoader.activeCatalog();
        Map<String, RulesCatalog.CountryRule> countriesByIso3 = new HashMap<>();
        for (RulesCatalog.CountryRule country : catalog.countries()) {
            countriesByIso3.put(country.countryCode3().toUpperCase(Locale.ROOT), country);
        }

        return metrics.byIso3.entrySet().stream()
                .map(entry -> toSignal(entry.getKey(), entry.getValue(), countriesByIso3))
                .filter(signal -> signal != null)
                .sorted(Comparator.comparing((RawSignalRecord record) -> record.severityScore() == null ? BigDecimal.ZERO : record.severityScore()).reversed())
                .limit(maxSignalsPerSource())
                .toList();
    }

    List<IndicatorObservation> parseIndicatorBody(String body, String indicatorCode) {
        try {
            JsonNode root = objectMapper.readTree(body);
            if (!root.isArray() || root.size() < 2 || !root.get(1).isArray()) {
                return List.of();
            }

            List<IndicatorObservation> observations = new ArrayList<>();
            for (JsonNode item : root.get(1)) {
                JsonNode valueNode = item.path("value");
                String countryIso3 = item.path("countryiso3code").asText(null);
                String date = item.path("date").asText(null);
                if (countryIso3 == null || countryIso3.isBlank() || valueNode.isMissingNode() || valueNode.isNull() || date == null) {
                    continue;
                }

                observations.add(new IndicatorObservation(
                        countryIso3.toUpperCase(Locale.ROOT),
                        indicatorCode,
                        valueNode.decimalValue().setScale(2, RoundingMode.HALF_UP),
                        Integer.parseInt(date)
                ));
            }
            return observations;
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to parse World Bank trade exposure response", exception);
        }
    }

    private void mergeIndicator(CountryTradeMetrics metrics, List<IndicatorObservation> observations) {
        for (IndicatorObservation observation : observations) {
            CountryTradeMetric metric = metrics.byIso3.computeIfAbsent(observation.countryIso3(), ignored -> new CountryTradeMetric());
            metric.capture(observation);
        }
    }

    RawSignalRecord toSignal(
            String countryIso3,
            CountryTradeMetric metric,
            Map<String, RulesCatalog.CountryRule> countriesByIso3
    ) {
        RulesCatalog.CountryRule country = countriesByIso3.get(countryIso3);
        if (country == null || metric.tradeShare == null) {
            return null;
        }

        int latestYear = metric.latestYear();
        Instant publishedAt = LocalDate.of(latestYear, 1, 1).atStartOfDay().toInstant(ZoneOffset.UTC);
        BigDecimal severity = metric.tradeShare.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
        if (severity.compareTo(BigDecimal.valueOf(100)) > 0) {
            severity = BigDecimal.valueOf(100).setScale(2, RoundingMode.HALF_UP);
        }

        String summary = "%s trade exposure sits near %s%% of GDP, with exports at %s%% and imports at %s%% in the latest available World Bank data year %s."
                .formatted(
                        country.countryName(),
                        metric.tradeShare.stripTrailingZeros().toPlainString(),
                        metric.exportShare == null ? "n/a" : metric.exportShare.stripTrailingZeros().toPlainString(),
                        metric.importShare == null ? "n/a" : metric.importShare.stripTrailingZeros().toPlainString(),
                        latestYear
                );

        return new RawSignalRecord(
                sourceName(),
                SignalSourceType.API,
                buildIndicatorUrl(TRADE_OPENNESS, (latestYear - 1) + ":" + latestYear),
                publishedAt,
                List.of(country.countryCode()),
                List.of("trade", "exposure", "macro"),
                SignalType.TRADE_EXPOSURE,
                SignalSentiment.NEUTRAL,
                severity,
                "Trade exposure: " + country.countryName(),
                summary,
                "worldbank-trade:" + countryIso3 + ":" + latestYear
        );
    }

    private String buildIndicatorUrl(String indicatorCode, String dateRange) {
        return UriComponentsBuilder.fromUriString(properties.ingestion().trade().baseUrl())
                .path("/all/indicator/{indicatorCode}")
                .queryParam("format", "json")
                .queryParam("per_page", 2000)
                .queryParam("date", dateRange)
                .buildAndExpand(indicatorCode)
                .toUriString();
    }

    record IndicatorObservation(
            String countryIso3,
            String indicatorCode,
            BigDecimal value,
            int year
    ) {
    }

    static final class CountryTradeMetrics {
        private final Map<String, CountryTradeMetric> byIso3 = new HashMap<>();

        Map<String, CountryTradeMetric> byIso3() {
            return byIso3;
        }
    }

    static final class CountryTradeMetric {
        private BigDecimal tradeShare;
        private Integer tradeYear;
        private BigDecimal exportShare;
        private Integer exportYear;
        private BigDecimal importShare;
        private Integer importYear;

        void capture(IndicatorObservation observation) {
            switch (observation.indicatorCode()) {
                case TRADE_OPENNESS -> {
                    if (tradeYear == null || observation.year() > tradeYear) {
                        tradeShare = observation.value();
                        tradeYear = observation.year();
                    }
                }
                case EXPORT_SHARE -> {
                    if (exportYear == null || observation.year() > exportYear) {
                        exportShare = observation.value();
                        exportYear = observation.year();
                    }
                }
                case IMPORT_SHARE -> {
                    if (importYear == null || observation.year() > importYear) {
                        importShare = observation.value();
                        importYear = observation.year();
                    }
                }
                default -> {
                }
            }
        }

        private int latestYear() {
            LinkedHashSet<Integer> years = new LinkedHashSet<>();
            if (tradeYear != null) {
                years.add(tradeYear);
            }
            if (exportYear != null) {
                years.add(exportYear);
            }
            if (importYear != null) {
                years.add(importYear);
            }
            return years.stream().max(Integer::compareTo).orElse(LocalDate.now(ZoneOffset.UTC).getYear());
        }
    }
}
