package com.geoeconwars.rules.domain;

import com.fasterxml.jackson.annotation.JsonAlias;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public record RulesCatalog(
        String version,
        List<CountryRule> countries,
        List<ActionRule> actions
) {
    public Optional<CountryRule> findCountry(String countryCode) {
        if (countries == null) {
            return Optional.empty();
        }

        return countries.stream()
                .filter(candidate -> candidate.countryCode().equalsIgnoreCase(countryCode))
                .findFirst();
    }

    public List<ActionRule> allActions() {
        if (actions != null && !actions.isEmpty()) {
            return actions;
        }

        List<ActionRule> resolved = new ArrayList<>();
        if (countries != null) {
            for (CountryRule country : countries) {
                if (country.actions() != null) {
                    resolved.addAll(country.actions());
                }
            }
        }
        return resolved;
    }

    public Optional<ActionRule> findAction(String key) {
        return allActions().stream()
                .filter(candidate -> candidate.key().equalsIgnoreCase(key))
                .findFirst();
    }

    public record CountryRule(
            String countryCode,
            String countryCode3,
            String countryCodeNumeric,
            String countryName,
            String officialName,
            boolean spotlight,
            double latitude,
            double longitude,
            String region,
            String subregion,
            String capital,
            List<String> borderCountries,
            List<ActionRule> actions
    ) {
    }

    public record ActionRule(
            String key,
            String label,
            String description,
            String replayTitle,
            String visualIntensity,
            BigDecimal baseSeverity,
            @JsonAlias("affectedCountries")
            List<String> beneficiaryCountries,
            NarrativeRule narrative,
            List<AssetRule> assets
    ) {
    }

    public record NarrativeRule(
            String headline,
            String summary
    ) {
    }

    public record AssetRule(
            String key,
            String label,
            String unit,
            BigDecimal baseline,
            BigDecimal delta
    ) {
    }
}
