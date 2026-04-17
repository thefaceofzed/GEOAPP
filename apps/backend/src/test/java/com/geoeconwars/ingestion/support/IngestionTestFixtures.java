package com.geoeconwars.ingestion.support;

import com.geoeconwars.rules.domain.RulesCatalog;
import com.geoeconwars.shared.config.AppProperties;
import java.math.BigDecimal;
import java.util.List;

public final class IngestionTestFixtures {

    private IngestionTestFixtures() {
    }

    public static AppProperties appProperties() {
        return new AppProperties(
                "http://localhost:5173",
                "http://localhost:8080",
                false,
                "packages/scenario-rules/rules",
                15,
                7,
                List.of("http://localhost:5173"),
                new AppProperties.Quota(3, 3),
                new AppProperties.Jwt("access-secret-for-tests-1234567890", "refresh-secret-for-tests-1234567890"),
                new AppProperties.Stripe(null, null, null),
                new AppProperties.Ingestion(
                        true,
                        false,
                        false,
                        25,
                        140,
                        1_800_000L,
                        "GeoEconWarsTests/1.0",
                        new AppProperties.Ingestion.Source(true, "https://example.test/news", null),
                        new AppProperties.Ingestion.Source(true, "https://example.test/commodities", null),
                        new AppProperties.Ingestion.Source(true, "https://example.test/fx", null),
                        new AppProperties.Ingestion.Source(true, "https://example.test/sanctions", null),
                        new AppProperties.Ingestion.Source(true, "https://example.test/macro", "fred-api-key"),
                        new AppProperties.Ingestion.Source(true, "https://example.test/trade", null)
                ),
                new AppProperties.Intelligence(
                        true,
                        true,
                        8,
                        20,
                        30,
                        180,
                        15_000L,
                        20_000L,
                        50,
                        3,
                        new AppProperties.Intelligence.RateLimit(true, 120, 60_000L)
                )
        );
    }

    public static RulesCatalog catalog() {
        RulesCatalog.ActionRule war = new RulesCatalog.ActionRule(
                "war",
                "War in {countryName}",
                "Conflict pressure centered on {countryName}",
                "War replay for {countryName}",
                "high",
                BigDecimal.valueOf(0.82),
                List.of("US", "CN"),
                new RulesCatalog.NarrativeRule(
                        "Conflict pressure expands from {countryName}",
                        "{countryName} enters a new conflict escalation cycle."
                ),
                List.of(new RulesCatalog.AssetRule("oil", "Oil", "USD", BigDecimal.valueOf(78), BigDecimal.valueOf(7)))
        );
        RulesCatalog.ActionRule sanctions = new RulesCatalog.ActionRule(
                "sanctions",
                "Sanctions on {countryName}",
                "Financial pressure on {countryName}",
                "Sanctions replay for {countryName}",
                "medium",
                BigDecimal.valueOf(0.61),
                List.of("US", "GB"),
                new RulesCatalog.NarrativeRule(
                        "Sanctions pressure rises around {countryName}",
                        "{countryName} faces new financial restrictions."
                ),
                List.of(new RulesCatalog.AssetRule("fx", "USD/{countryCode}", "rate", BigDecimal.ONE, BigDecimal.valueOf(-0.04)))
        );

        return new RulesCatalog(
                "test-2026.04",
                List.of(
                        new RulesCatalog.CountryRule("MA", "MAR", "504", "Morocco", "Kingdom of Morocco", false, 31.79, -7.09, "Africa", "Northern Africa", "Rabat", List.of("DZ", "ES"), List.of(war, sanctions)),
                        new RulesCatalog.CountryRule("DZ", "DZA", "012", "Algeria", "People's Democratic Republic of Algeria", false, 28.03, 1.65, "Africa", "Northern Africa", "Algiers", List.of("MA", "TN"), List.of(war, sanctions)),
                        new RulesCatalog.CountryRule("ES", "ESP", "724", "Spain", "Kingdom of Spain", false, 40.46, -3.75, "Europe", "Southern Europe", "Madrid", List.of("FR"), List.of(war, sanctions)),
                        new RulesCatalog.CountryRule("FR", "FRA", "250", "France", "French Republic", false, 46.22, 2.21, "Europe", "Western Europe", "Paris", List.of("ES"), List.of(war, sanctions)),
                        new RulesCatalog.CountryRule("JP", "JPN", "392", "Japan", "Japan", false, 36.2, 138.25, "Asia", "Eastern Asia", "Tokyo", List.of(), List.of(war, sanctions))
                ),
                List.of(war, sanctions)
        );
    }
}
