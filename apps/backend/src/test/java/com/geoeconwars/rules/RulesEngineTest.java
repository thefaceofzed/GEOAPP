package com.geoeconwars.rules;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.geoeconwars.rules.domain.RulesCatalog;
import com.geoeconwars.rules.service.RulesEngine;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class RulesEngineTest {

    private final RulesEngine rulesEngine = new RulesEngine();

    @Test
    void computesDeterministicImpactsForTheSameInput() {
        RulesCatalog catalog = catalog();

        var first = rulesEngine.compute(catalog, "MA", "war", 168, List.of("ES"));
        var second = rulesEngine.compute(catalog, "MA", "war", 168, List.of("ES"));

        assertThat(first.assets()).isEqualTo(second.assets());
        assertThat(first.narrative()).isEqualTo(second.narrative());
        assertThat(first.severityScore()).isEqualByComparingTo(second.severityScore());
    }

    @Test
    void rejectsUnknownActions() {
        assertThatThrownBy(() -> rulesEngine.compute(catalog(), "MA", "unknown", 48, List.of()))
                .hasMessageContaining("Unsupported action key");
    }

    @Test
    void acceptsLegacyAliasesAndNormalizesThem() {
        var result = rulesEngine.compute(catalog(), "MA", "cyber_attack", 48, List.of());

        assertThat(result.actionKey()).isEqualTo("cyberattack");
    }

    private RulesCatalog catalog() {
        return new RulesCatalog(
                "2026.02",
                List.of(
                        new RulesCatalog.CountryRule(
                                "MA",
                                "MAR",
                                "504",
                                "Morocco",
                                "Kingdom of Morocco",
                                false,
                                31.7917,
                                -7.0926,
                                "Africa",
                                "Northern Africa",
                                "Rabat",
                                List.of("ES", "DZ"),
                                List.of()
                        ),
                        new RulesCatalog.CountryRule(
                                "ES",
                                "ESP",
                                "724",
                                "Spain",
                                "Kingdom of Spain",
                                false,
                                40.4637,
                                -3.7492,
                                "Europe",
                                "Southern Europe",
                                "Madrid",
                                List.of("FR", "PT", "MA"),
                                List.of()
                        ),
                        new RulesCatalog.CountryRule(
                                "DZ",
                                "DZA",
                                "012",
                                "Algeria",
                                "People's Democratic Republic of Algeria",
                                false,
                                28.0339,
                                1.6596,
                                "Africa",
                                "Northern Africa",
                                "Algiers",
                                List.of("MA", "TN"),
                                List.of()
                        )
                ),
                List.of(
                        new RulesCatalog.ActionRule(
                                "war",
                                "War Escalation",
                                "desc {countryName}",
                                "{countryName} Replay",
                                "critical",
                                BigDecimal.valueOf(0.82),
                                List.of("US"),
                                new RulesCatalog.NarrativeRule("Headline {countryName}", "Summary {countryName}"),
                                List.of(
                                        new RulesCatalog.AssetRule("oil", "Oil", "USD", BigDecimal.valueOf(100), BigDecimal.valueOf(18)),
                                        new RulesCatalog.AssetRule("equity", "{countryName} Equity Index", "IDX", BigDecimal.valueOf(17000), BigDecimal.valueOf(-900))
                                )
                        ),
                        new RulesCatalog.ActionRule(
                                "cyberattack",
                                "Cyberattack Wave",
                                "cyber {countryName}",
                                "{countryName} Cyber",
                                "high",
                                BigDecimal.valueOf(0.70),
                                List.of("US"),
                                new RulesCatalog.NarrativeRule("Headline {countryName}", "Summary {countryName}"),
                                List.of(
                                        new RulesCatalog.AssetRule("cyber", "Cyber Defense", "IDX", BigDecimal.valueOf(100), BigDecimal.valueOf(12))
                                )
                        )
                )
        );
    }
}
