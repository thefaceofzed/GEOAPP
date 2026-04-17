package com.geoeconwars.ingestion.service;

import com.geoeconwars.ingestion.domain.SignalType;
import com.geoeconwars.rules.domain.RulesCatalog;
import com.geoeconwars.rules.service.ActionKeySupport;
import com.geoeconwars.rules.service.RulesCatalogLoader;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class ScenarioRelevanceScorer {

    private final RulesCatalogLoader rulesCatalogLoader;

    public ScenarioRelevanceScorer(RulesCatalogLoader rulesCatalogLoader) {
        this.rulesCatalogLoader = rulesCatalogLoader;
    }

    public BigDecimal score(
            String selectedCountryCode,
            String actionKey,
            List<String> signalCountryCodes,
            List<String> signalTopicTags,
            SignalType signalType,
            BigDecimal severityScore,
            Instant publishedAt
    ) {
        RulesCatalog catalog = rulesCatalogLoader.activeCatalog();
        String normalizedCountryCode = selectedCountryCode == null ? null : selectedCountryCode.trim().toUpperCase(Locale.ROOT);
        String canonicalActionKey = ActionKeySupport.canonicalize(actionKey);

        BigDecimal total = BigDecimal.ZERO;
        total = total.add(countryScore(catalog, normalizedCountryCode, signalCountryCodes).multiply(BigDecimal.valueOf(0.40d)));
        total = total.add(topicScore(canonicalActionKey, signalTopicTags).multiply(BigDecimal.valueOf(0.20d)));
        total = total.add(typeScore(canonicalActionKey, signalType).multiply(BigDecimal.valueOf(0.15d)));
        total = total.add(recencyScore(publishedAt).multiply(BigDecimal.valueOf(0.15d)));
        total = total.add(severityScore(severityScore).multiply(BigDecimal.valueOf(0.10d)));
        return total.setScale(4, RoundingMode.HALF_UP);
    }

    private BigDecimal countryScore(RulesCatalog catalog, String selectedCountryCode, List<String> signalCountryCodes) {
        if (selectedCountryCode == null || selectedCountryCode.isBlank() || signalCountryCodes == null || signalCountryCodes.isEmpty()) {
            return BigDecimal.ZERO;
        }
        Set<String> normalizedCodes = new LinkedHashSet<>();
        for (String signalCountryCode : signalCountryCodes) {
            if (signalCountryCode != null && !signalCountryCode.isBlank()) {
                normalizedCodes.add(signalCountryCode.trim().toUpperCase(Locale.ROOT));
            }
        }
        if (normalizedCodes.contains(selectedCountryCode)) {
            return BigDecimal.ONE;
        }

        RulesCatalog.CountryRule selectedCountry = catalog.findCountry(selectedCountryCode).orElse(null);
        if (selectedCountry == null) {
            return BigDecimal.ZERO;
        }

        if (selectedCountry.borderCountries() != null) {
            for (String borderCountry : selectedCountry.borderCountries()) {
                if (normalizedCodes.contains(borderCountry.toUpperCase(Locale.ROOT))) {
                    return BigDecimal.valueOf(0.75d);
                }
            }
        }

        for (String code : normalizedCodes) {
            RulesCatalog.CountryRule candidate = catalog.findCountry(code).orElse(null);
            if (candidate == null) {
                continue;
            }
            if (equalsIgnoreCase(selectedCountry.subregion(), candidate.subregion())) {
                return BigDecimal.valueOf(0.55d);
            }
            if (equalsIgnoreCase(selectedCountry.region(), candidate.region())) {
                return BigDecimal.valueOf(0.35d);
            }
        }
        return BigDecimal.ZERO;
    }

    private BigDecimal topicScore(String actionKey, List<String> signalTopicTags) {
        if (signalTopicTags == null || signalTopicTags.isEmpty()) {
            return BigDecimal.ZERO;
        }
        Set<String> normalizedTags = signalTopicTags.stream()
                .filter(tag -> tag != null && !tag.isBlank())
                .map(tag -> tag.trim().toLowerCase(Locale.ROOT))
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        Set<String> actionTags = switch (actionKey) {
            case "war" -> Set.of("war", "trade", "commodity", "sanctions");
            case "embargo" -> Set.of("embargo", "trade", "commodity", "fx");
            case "sanctions" -> Set.of("sanctions", "trade", "fx", "macro");
            case "cyberattack" -> Set.of("cyber", "war", "macro", "fx");
            case "alliance" -> Set.of("alliance", "trade", "commodity", "macro");
            default -> Set.of();
        };
        if (actionTags.isEmpty()) {
            return BigDecimal.ZERO;
        }

        long overlap = normalizedTags.stream().filter(actionTags::contains).count();
        if (overlap == 0) {
            return BigDecimal.ZERO;
        }
        return BigDecimal.valueOf((double) overlap / (double) actionTags.size()).setScale(4, RoundingMode.HALF_UP);
    }

    private BigDecimal typeScore(String actionKey, SignalType signalType) {
        if (signalType == null) {
            return BigDecimal.ZERO;
        }
        Set<SignalType> alignedTypes = switch (actionKey) {
            case "war" -> Set.of(SignalType.NEWS_HEADLINE, SignalType.CONFLICT_SIGNAL, SignalType.COMMODITY_PRICE, SignalType.SANCTIONS_SIGNAL);
            case "embargo" -> Set.of(SignalType.NEWS_HEADLINE, SignalType.COMMODITY_PRICE, SignalType.TRADE_EXPOSURE, SignalType.FX_RATE);
            case "sanctions" -> Set.of(SignalType.SANCTIONS_SIGNAL, SignalType.NEWS_HEADLINE, SignalType.FX_RATE, SignalType.MACRO_EVENT);
            case "cyberattack" -> Set.of(SignalType.NEWS_HEADLINE, SignalType.CONFLICT_SIGNAL, SignalType.FX_RATE, SignalType.MACRO_EVENT);
            case "alliance" -> Set.of(SignalType.NEWS_HEADLINE, SignalType.TRADE_EXPOSURE, SignalType.COMMODITY_PRICE, SignalType.MACRO_EVENT);
            default -> Set.of();
        };
        return alignedTypes.contains(signalType) ? BigDecimal.ONE : BigDecimal.valueOf(0.20d);
    }

    private BigDecimal recencyScore(Instant publishedAt) {
        if (publishedAt == null) {
            return BigDecimal.ZERO;
        }
        long ageHours = Math.max(0L, Duration.between(publishedAt, Instant.now()).toHours());
        if (ageHours <= 24) {
            return BigDecimal.ONE;
        }
        if (ageHours <= 72) {
            return BigDecimal.valueOf(0.80d);
        }
        if (ageHours <= 168) {
            return BigDecimal.valueOf(0.55d);
        }
        if (ageHours <= 720) {
            return BigDecimal.valueOf(0.25d);
        }
        return BigDecimal.valueOf(0.10d);
    }

    private BigDecimal severityScore(BigDecimal severityScore) {
        if (severityScore == null) {
            return BigDecimal.ZERO;
        }
        BigDecimal normalized = severityScore.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        if (normalized.compareTo(BigDecimal.ONE) > 0) {
            return BigDecimal.ONE;
        }
        if (normalized.compareTo(BigDecimal.ZERO) < 0) {
            return BigDecimal.ZERO;
        }
        return normalized;
    }

    private boolean equalsIgnoreCase(String left, String right) {
        if (left == null || right == null) {
            return false;
        }
        return left.equalsIgnoreCase(right);
    }
}
