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
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class FredMacroSignalAdapter extends AbstractSignalAdapter implements SignalAdapter {

    private final RulesCatalogLoader rulesCatalogLoader;

    public FredMacroSignalAdapter(
            ObjectMapper objectMapper,
            AppProperties properties,
            RulesCatalogLoader rulesCatalogLoader
    ) {
        super(objectMapper, properties);
        this.rulesCatalogLoader = rulesCatalogLoader;
    }

    @Override
    public String sourceName() {
        return "FRED";
    }

    @Override
    public String sourceKey() {
        return "macro";
    }

    @Override
    public boolean isEnabled() {
        return properties.ingestion().macro().enabled();
    }

    @Override
    public List<RawSignalRecord> fetchSignals() {
        String apiKey = properties.ingestion().macro().apiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("FRED macro adapter requires APP_INGESTION_MACRO_API_KEY");
        }

        String url = UriComponentsBuilder.fromUriString(properties.ingestion().macro().baseUrl())
                .queryParam("api_key", apiKey)
                .queryParam("file_type", "json")
                .queryParam("limit", maxSignalsPerSource())
                .queryParam("sort_order", "desc")
                .queryParam("order_by", "release_date")
                .toUriString();
        String body = restClient.get().uri(url).retrieve().body(String.class);
        return parseBody(body, url);
    }

    List<RawSignalRecord> parseBody(String body, String requestUrl) {
        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode releases = root.path("release_dates");
            if (!releases.isArray()) {
                return List.of();
            }

            RulesCatalog catalog = rulesCatalogLoader.activeCatalog();
            List<RawSignalRecord> records = new ArrayList<>();
            for (JsonNode release : releases) {
                String releaseName = release.path("release_name").asText(null);
                String releaseId = release.path("release_id").asText(null);
                String date = release.path("date").asText(null);
                if (releaseName == null || releaseId == null || date == null) {
                    continue;
                }

                LocalDate releaseDate = LocalDate.parse(date);
                List<String> topicTags = inferTopicTags(releaseName);
                records.add(new RawSignalRecord(
                        sourceName(),
                        SignalSourceType.API,
                        requestUrl,
                        releaseDate.atStartOfDay().toInstant(ZoneOffset.UTC),
                        inferCountryCodes(releaseName, catalog),
                        topicTags,
                        SignalType.MACRO_EVENT,
                        SignalSentiment.NEUTRAL,
                        null,
                        "Macro calendar: " + releaseName,
                        "FRED release calendar lists " + releaseName + " on " + releaseDate + ".",
                        "fred-release:" + releaseId + ":" + date
                ));
            }
            return records;
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to parse FRED macro response", exception);
        }
    }

    private List<String> inferCountryCodes(String releaseName, RulesCatalog catalog) {
        String normalized = releaseName.toLowerCase(Locale.ROOT);
        LinkedHashSet<String> countryCodes = new LinkedHashSet<>();
        for (RulesCatalog.CountryRule country : catalog.countries()) {
            if (containsReference(normalized, country.countryName())
                    || containsReference(normalized, country.officialName())
                    || containsReference(normalized, country.countryCode3())) {
                countryCodes.add(country.countryCode());
            }
        }
        return List.copyOf(countryCodes);
    }

    private List<String> inferTopicTags(String releaseName) {
        String normalized = releaseName.toLowerCase(Locale.ROOT);
        LinkedHashSet<String> topicTags = new LinkedHashSet<>();
        topicTags.add("macro");
        topicTags.add("calendar");
        if (normalized.contains("gdp") || normalized.contains("gross domestic product") || normalized.contains("national accounts")) {
            topicTags.add("gdp");
        }
        if (normalized.contains("inflation") || normalized.contains("price index") || normalized.contains("cpi")) {
            topicTags.add("inflation");
        }
        if (normalized.contains("employment") || normalized.contains("labor") || normalized.contains("unemployment")) {
            topicTags.add("employment");
        }
        if (normalized.contains("rate") || normalized.contains("interest")) {
            topicTags.add("rates");
        }
        if (normalized.contains("trade")) {
            topicTags.add("trade");
        }
        return List.copyOf(topicTags);
    }

    private boolean containsReference(String text, String value) {
        if (value == null || value.isBlank()) {
            return false;
        }
        String normalizedValue = value.toLowerCase(Locale.ROOT).trim();
        return normalizedValue.length() > 2 && text.contains(normalizedValue);
    }
}
