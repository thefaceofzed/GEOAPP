package com.geoeconwars.intelligence.service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class ScenarioTemplateService {

    private final Map<String, ScenarioTemplate> templatesById;
    private final List<ScenarioTemplate> templates;

    public ScenarioTemplateService() {
        this.templates = List.of(
                new ScenarioTemplate(
                        "taiwan-strait",
                        "Taiwan Strait Crisis",
                        "US-China flashpoint over semiconductor island",
                        "A military confrontation in the Taiwan Strait triggers global semiconductor supply chain disruption, US-China military escalation, and shipping route rerouting across the Indo-Pacific.",
                        "TWN", "Taiwan",
                        "war", "War",
                        "observed",
                        new Badge("zap", "Flashpoint"),
                        List.of("TWN", "CHN", "USA", "JPN", "KOR"),
                        List.of("CONFLICT_SIGNAL", "SANCTIONS_SIGNAL", "TRADE_EXPOSURE"),
                        List.of(
                                "Semiconductor supply chain disruption",
                                "US-China military escalation",
                                "Global tech sector shock",
                                "Shipping route rerouting"
                        )
                ),
                new ScenarioTemplate(
                        "hormuz-closure",
                        "Strait of Hormuz Closure",
                        "Critical energy chokepoint blockade",
                        "Iran blocks the Strait of Hormuz, disrupting roughly 20% of global oil transit. Oil prices surge, LNG supply chains fracture, and global inflation pressure intensifies.",
                        "IRN", "Iran",
                        "embargo", "Embargo",
                        "observed",
                        new Badge("flame", "Energy"),
                        List.of("IRN", "SAU", "ARE", "QAT", "KWT", "USA"),
                        List.of("COMMODITY_PRICE", "TRADE_EXPOSURE", "CONFLICT_SIGNAL"),
                        List.of(
                                "Oil price surge 40-80%",
                                "LNG supply disruption",
                                "Insurance cost spike",
                                "Global inflation pressure"
                        )
                ),
                new ScenarioTemplate(
                        "ukraine-escalation",
                        "Ukraine Conflict Escalation",
                        "European security and energy crisis deepens",
                        "A major escalation of the Ukraine conflict triggers European energy disruption, grain export collapse, NATO response escalation, and a sanctions cascade affecting global markets.",
                        "UKR", "Ukraine",
                        "war", "War",
                        "observed",
                        new Badge("shield-alert", "Conflict"),
                        List.of("UKR", "RUS", "DEU", "POL", "FRA", "GBR"),
                        List.of("CONFLICT_SIGNAL", "SANCTIONS_SIGNAL", "COMMODITY_PRICE", "FX_RATE"),
                        List.of(
                                "European energy security",
                                "Grain export disruption",
                                "NATO response escalation",
                                "Sanctions cascade"
                        )
                ),
                new ScenarioTemplate(
                        "red-sea-disruption",
                        "Red Sea Shipping Disruption",
                        "Suez bypass forces global trade rerouting",
                        "Persistent attacks on commercial shipping in the Red Sea force Suez Canal bypass, spiking container rates, shipping insurance, and causing European supply delays.",
                        "YEM", "Yemen",
                        "embargo", "Embargo",
                        "observed",
                        new Badge("ship", "Trade"),
                        List.of("YEM", "SAU", "EGY", "ARE", "GBR", "USA"),
                        List.of("TRADE_EXPOSURE", "COMMODITY_PRICE", "CONFLICT_SIGNAL"),
                        List.of(
                                "Suez Canal bypass costs",
                                "Shipping insurance surge",
                                "Container rate spike",
                                "European supply delay"
                        )
                ),
                new ScenarioTemplate(
                        "iran-strike",
                        "Iran Military Strike",
                        "Regional contagion and oil price shock",
                        "A military strike on Iran triggers oil price shock, regional contagion across the Middle East, Strait of Hormuz risk, and nuclear escalation concerns.",
                        "IRN", "Iran",
                        "war", "War",
                        "observed",
                        new Badge("target", "Critical"),
                        List.of("IRN", "ISR", "SAU", "USA", "IRQ", "SYR"),
                        List.of("CONFLICT_SIGNAL", "COMMODITY_PRICE", "FX_RATE", "SANCTIONS_SIGNAL"),
                        List.of(
                                "Oil price shock",
                                "Regional contagion",
                                "Strait of Hormuz risk",
                                "Nuclear escalation"
                        )
                )
        );
        this.templatesById = templates.stream()
                .collect(Collectors.toMap(ScenarioTemplate::id, Function.identity()));
    }

    public List<ScenarioTemplate> getTemplates() {
        return templates;
    }

    public Optional<ScenarioTemplate> getTemplate(String id) {
        return Optional.ofNullable(templatesById.get(id));
    }

    public record ScenarioTemplate(
            String id,
            String title,
            String subtitle,
            String description,
            String countryCode3,
            String countryName,
            String actionKey,
            String actionLabel,
            String mode,
            Badge badge,
            List<String> watchlistItems,
            List<String> keySignals,
            List<String> riskFactors
    ) {
    }

    public record Badge(
            String icon,
            String label
    ) {
    }
}
