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
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class GdeltNewsSignalAdapter extends AbstractSignalAdapter implements SignalAdapter {

    private static final DateTimeFormatter GDELT_TIMESTAMP = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    public GdeltNewsSignalAdapter(ObjectMapper objectMapper, AppProperties properties) {
        super(objectMapper, properties);
    }

    @Override
    public String sourceName() {
        return "GDELT";
    }

    @Override
    public String sourceKey() {
        return "news";
    }

    @Override
    public boolean isEnabled() {
        return properties.ingestion().news().enabled();
    }

    @Override
    public List<RawSignalRecord> fetchSignals() {
        String url = UriComponentsBuilder.fromUriString(properties.ingestion().news().baseUrl())
                .queryParam("query", "(geopolitical OR sanctions OR embargo OR military OR cyberattack OR alliance OR commodity OR fx)")
                .queryParam("mode", "ArtList")
                .queryParam("maxrecords", maxSignalsPerSource())
                .queryParam("sort", "datedesc")
                .queryParam("format", "json")
                .toUriString();
        String body = restClient.get().uri(url).retrieve().body(String.class);
        return parseBody(body);
    }

    List<RawSignalRecord> parseBody(String body) {
        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode articles = root.path("articles");
            List<RawSignalRecord> signals = new ArrayList<>();
            if (!articles.isArray()) {
                return signals;
            }
            for (JsonNode article : articles) {
                String title = article.path("title").asText(null);
                String url = article.path("url").asText(null);
                if (title == null || url == null) {
                    continue;
                }
                String snippet = article.path("snippet").asText("");
                String domain = article.path("domain").asText("");
                Instant publishedAt = parseTimestamp(article.path("seendate").asText(null));
                List<String> topicTags = new ArrayList<>(List.of("news", "geopolitics"));
                if (!domain.isBlank()) {
                    topicTags.add(domain.toLowerCase(Locale.ROOT));
                }

                signals.add(new RawSignalRecord(
                        sourceName(),
                        SignalSourceType.API,
                        url,
                        publishedAt == null ? Instant.now() : publishedAt,
                        List.of(),
                        topicTags,
                        SignalType.NEWS_HEADLINE,
                        inferSentiment(title),
                        null,
                        title,
                        snippet,
                        url
                ));
            }
            return signals;
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to parse GDELT response", exception);
        }
    }

    private Instant parseTimestamp(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return LocalDateTime.parse(value, GDELT_TIMESTAMP).toInstant(ZoneOffset.UTC);
    }

    private SignalSentiment inferSentiment(String title) {
        String loweredTitle = title.toLowerCase(Locale.ROOT);
        if (containsAny(loweredTitle, List.of("war", "sanction", "embargo", "attack", "conflict"))) {
            return SignalSentiment.NEGATIVE;
        }
        if (containsAny(loweredTitle, List.of("alliance", "deal", "support", "agreement"))) {
            return SignalSentiment.POSITIVE;
        }
        return SignalSentiment.NEUTRAL;
    }

    private boolean containsAny(String text, List<String> keywords) {
        return keywords.stream().anyMatch(text::contains);
    }
}
