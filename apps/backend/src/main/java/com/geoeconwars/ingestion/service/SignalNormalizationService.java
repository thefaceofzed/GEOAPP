package com.geoeconwars.ingestion.service;

import com.geoeconwars.ingestion.domain.SignalSentiment;
import com.geoeconwars.rules.domain.RulesCatalog;
import com.geoeconwars.rules.service.RulesCatalogLoader;
import com.geoeconwars.shared.config.AppProperties;
import com.geoeconwars.shared.util.HashingSupport;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class SignalNormalizationService {

    private static final Map<String, List<String>> TOPIC_KEYWORDS = Map.ofEntries(
            Map.entry("war", List.of("war", "military", "troops", "missile", "battle", "conflict", "invasion")),
            Map.entry("embargo", List.of("embargo", "tariff", "trade restriction", "blockade", "export control")),
            Map.entry("sanctions", List.of("sanction", "blacklist", "ofac", "asset freeze")),
            Map.entry("cyber", List.of("cyber", "hack", "ransomware", "malware", "network breach")),
            Map.entry("alliance", List.of("alliance", "coalition", "partnership", "joint statement", "deal")),
            Map.entry("commodity", List.of("oil", "crude", "gas", "gold", "copper", "commodity")),
            Map.entry("fx", List.of("fx", "currency", "exchange rate", "usd/", "eur/", "jpy/", "gbp/")),
            Map.entry("macro", List.of("inflation", "gdp", "rate decision", "central bank", "employment", "pmi", "cpi")),
            Map.entry("trade", List.of("trade", "shipping", "exports", "imports", "supply chain"))
    );

    private final RulesCatalogLoader rulesCatalogLoader;
    private final HashingSupport hashingSupport;
    private final AppProperties properties;

    public SignalNormalizationService(
            RulesCatalogLoader rulesCatalogLoader,
            HashingSupport hashingSupport,
            AppProperties properties
    ) {
        this.rulesCatalogLoader = rulesCatalogLoader;
        this.hashingSupport = hashingSupport;
        this.properties = properties;
    }

    public NormalizedSignalCandidate normalize(RawSignalRecord rawSignal) {
        if (rawSignal == null) {
            throw new IllegalArgumentException("Raw signal is required");
        }
        if (isBlank(rawSignal.sourceName())) {
            throw new IllegalArgumentException("sourceName is required");
        }
        if (rawSignal.sourceType() == null) {
            throw new IllegalArgumentException("sourceType is required");
        }
        if (isBlank(rawSignal.url())) {
            throw new IllegalArgumentException("url is required");
        }
        if (rawSignal.publishedAt() == null) {
            throw new IllegalArgumentException("publishedAt is required");
        }
        if (rawSignal.signalType() == null) {
            throw new IllegalArgumentException("signalType is required");
        }

        RulesCatalog catalog = rulesCatalogLoader.activeCatalog();
        String text = combinedText(rawSignal);
        List<String> countryCodes = normalizeCountryCodes(rawSignal.countryCodes(), text, catalog);
        List<String> topicTags = normalizeTopicTags(rawSignal.topicTags(), text, rawSignal);
        SignalSentiment sentiment = rawSignal.sentiment() == null ? inferSentiment(text) : rawSignal.sentiment();
        BigDecimal severityScore = normalizeSeverity(rawSignal.severityScore(), text, rawSignal);
        String extractedSummary = buildSummary(rawSignal);
        String rawReferenceId = rawReferenceId(rawSignal, extractedSummary);
        String dedupeHash = hashingSupport.sha256(
                String.join("|",
                        rawSignal.sourceName().trim(),
                        rawSignal.sourceType().value(),
                        rawSignal.url().trim(),
                        rawSignal.signalType().value(),
                        rawSignal.publishedAt().toString(),
                        String.join(",", countryCodes),
                        extractedSummary.toLowerCase(Locale.ROOT)
                )
        );

        return new NormalizedSignalCandidate(
                rawSignal.sourceName().trim(),
                rawSignal.sourceType(),
                rawSignal.url().trim(),
                rawSignal.publishedAt(),
                countryCodes,
                topicTags,
                rawSignal.signalType(),
                sentiment,
                severityScore,
                extractedSummary,
                rawReferenceId,
                dedupeHash
        );
    }

    private List<String> normalizeCountryCodes(List<String> inputCodes, String text, RulesCatalog catalog) {
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        if (inputCodes != null) {
            for (String inputCode : inputCodes) {
                if (inputCode == null || inputCode.isBlank()) {
                    continue;
                }
                String code = inputCode.trim().toUpperCase(Locale.ROOT);
                if (catalog.findCountry(code).isPresent()) {
                    normalized.add(code);
                }
            }
        }
        if (!normalized.isEmpty()) {
            return List.copyOf(normalized);
        }

        String loweredText = text.toLowerCase(Locale.ROOT);
        for (RulesCatalog.CountryRule country : catalog.countries()) {
            if (containsCountryReference(loweredText, country)) {
                normalized.add(country.countryCode());
            }
        }
        return List.copyOf(normalized);
    }

    private boolean containsCountryReference(String loweredText, RulesCatalog.CountryRule country) {
        return containsPhrase(loweredText, country.countryName())
                || containsPhrase(loweredText, country.officialName())
                || containsCode3(loweredText, country.countryCode3());
    }

    private List<String> normalizeTopicTags(List<String> inputTags, String text, RawSignalRecord rawSignal) {
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        if (inputTags != null) {
            for (String inputTag : inputTags) {
                if (inputTag == null || inputTag.isBlank()) {
                    continue;
                }
                normalized.add(inputTag.trim().toLowerCase(Locale.ROOT));
            }
        }

        String loweredText = text.toLowerCase(Locale.ROOT);
        for (Map.Entry<String, List<String>> entry : TOPIC_KEYWORDS.entrySet()) {
            if (entry.getValue().stream().anyMatch(loweredText::contains)) {
                normalized.add(entry.getKey());
            }
        }

        switch (rawSignal.signalType()) {
            case NEWS_HEADLINE -> normalized.add("news");
            case COMMODITY_PRICE -> normalized.add("commodity");
            case FX_RATE -> normalized.add("fx");
            case MACRO_EVENT -> normalized.add("macro");
            case SANCTIONS_SIGNAL -> normalized.add("sanctions");
            case CONFLICT_SIGNAL -> normalized.add("war");
            case TRADE_EXPOSURE -> normalized.add("trade");
        }

        return List.copyOf(normalized);
    }

    private SignalSentiment inferSentiment(String text) {
        String loweredText = text.toLowerCase(Locale.ROOT);
        if (containsAny(loweredText, List.of("war", "conflict", "attack", "sanction", "embargo", "blacklist", "breach"))) {
            return SignalSentiment.NEGATIVE;
        }
        if (containsAny(loweredText, List.of("alliance", "agreement", "cooperation", "relief", "recovery"))) {
            return SignalSentiment.POSITIVE;
        }
        int negativeHits = countHits(loweredText, List.of(
                "war", "conflict", "attack", "sanction", "embargo", "freeze", "shock", "disruption", "crisis", "breach"
        ));
        int positiveHits = countHits(loweredText, List.of(
                "alliance", "deal", "support", "cooperation", "relief", "recovery", "agreement", "growth"
        ));
        if (negativeHits > positiveHits) {
            return SignalSentiment.NEGATIVE;
        }
        if (positiveHits > negativeHits) {
            return SignalSentiment.POSITIVE;
        }
        return SignalSentiment.NEUTRAL;
    }

    private BigDecimal normalizeSeverity(BigDecimal rawSeverity, String text, RawSignalRecord rawSignal) {
        if (rawSeverity != null) {
            return clampSeverity(rawSeverity);
        }

        BigDecimal score = switch (rawSignal.signalType()) {
            case SANCTIONS_SIGNAL, CONFLICT_SIGNAL -> BigDecimal.valueOf(72);
            case NEWS_HEADLINE -> BigDecimal.valueOf(46);
            case COMMODITY_PRICE, FX_RATE -> BigDecimal.valueOf(38);
            case MACRO_EVENT, TRADE_EXPOSURE -> BigDecimal.valueOf(34);
        };

        String loweredText = text.toLowerCase(Locale.ROOT);
        score = score.add(BigDecimal.valueOf(countHits(loweredText, List.of(
                "urgent", "escalation", "military", "missile", "blacklist", "breach", "default"
        )) * 6L));
        score = score.add(BigDecimal.valueOf(countHits(loweredText, List.of(
                "warning", "volatility", "slowdown", "pressure"
        )) * 3L));
        score = score.subtract(BigDecimal.valueOf(countHits(loweredText, List.of(
                "agreement", "support", "relief", "stabilize"
        )) * 4L));

        return clampSeverity(score);
    }

    private BigDecimal clampSeverity(BigDecimal value) {
        if (value.compareTo(BigDecimal.ZERO) < 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        if (value.compareTo(BigDecimal.valueOf(100)) > 0) {
            return BigDecimal.valueOf(100).setScale(2, RoundingMode.HALF_UP);
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private String buildSummary(RawSignalRecord rawSignal) {
        List<String> parts = new ArrayList<>();
        if (!isBlank(rawSignal.headline())) {
            parts.add(rawSignal.headline().trim());
        }
        if (!isBlank(rawSignal.summary())) {
            String normalizedSummary = rawSignal.summary().trim();
            if (parts.isEmpty() || !normalizedSummary.equalsIgnoreCase(parts.getFirst())) {
                parts.add(normalizedSummary);
            }
        }
        String combined = String.join(" ", parts)
                .replaceAll("\\s+", " ")
                .trim();
        if (combined.isBlank()) {
            combined = "Signal captured for scenario enrichment.";
        }

        int maxLength = properties.ingestion().maxSummaryLength();
        if (combined.length() <= maxLength) {
            return combined;
        }
        return combined.substring(0, Math.max(0, maxLength - 3)).trim() + "...";
    }

    private String rawReferenceId(RawSignalRecord rawSignal, String extractedSummary) {
        if (!isBlank(rawSignal.rawReferenceId())) {
            return rawSignal.rawReferenceId().trim();
        }
        return rawSignal.sourceName().trim().toLowerCase(Locale.ROOT)
                + ":"
                + hashingSupport.sha256(rawSignal.url().trim() + "|" + rawSignal.publishedAt() + "|" + extractedSummary).substring(0, 16);
    }

    private String combinedText(RawSignalRecord rawSignal) {
        StringBuilder builder = new StringBuilder();
        if (!isBlank(rawSignal.headline())) {
            builder.append(rawSignal.headline().trim()).append(' ');
        }
        if (!isBlank(rawSignal.summary())) {
            builder.append(rawSignal.summary().trim());
        }
        return builder.toString().trim();
    }

    private int countHits(String text, List<String> keywords) {
        int hits = 0;
        for (String keyword : keywords) {
            if (text.contains(keyword)) {
                hits++;
            }
        }
        return hits;
    }

    private boolean containsAny(String text, List<String> keywords) {
        return keywords.stream().anyMatch(text::contains);
    }

    private boolean containsPhrase(String loweredText, String value) {
        if (isBlank(value)) {
            return false;
        }
        String normalized = value.toLowerCase(Locale.ROOT).trim();
        return normalized.length() > 3 && loweredText.contains(normalized);
    }

    private boolean containsCode3(String loweredText, String code3) {
        if (isBlank(code3) || code3.length() != 3) {
            return false;
        }
        String normalized = code3.toLowerCase(Locale.ROOT);
        return loweredText.matches(".*(^|[^a-z])" + normalized + "([^a-z]|$).*");
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
