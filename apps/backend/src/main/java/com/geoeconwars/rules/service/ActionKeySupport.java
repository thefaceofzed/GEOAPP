package com.geoeconwars.rules.service;

import java.util.Map;

public final class ActionKeySupport {

    private static final Map<String, String> CANONICAL_KEYS = Map.ofEntries(
            Map.entry("war", "war"),
            Map.entry("blocus_naval", "war"),
            Map.entry("naval_blockade", "war"),
            Map.entry("embargo", "embargo"),
            Map.entry("embargo_tech", "embargo"),
            Map.entry("trade_embargo", "embargo"),
            Map.entry("sanctions", "sanctions"),
            Map.entry("sanctions_financieres", "sanctions"),
            Map.entry("financial_sanctions", "sanctions"),
            Map.entry("cyberattack", "cyberattack"),
            Map.entry("cyber_attack", "cyberattack"),
            Map.entry("cyber-attack", "cyberattack"),
            Map.entry("alliance", "alliance"),
            Map.entry("alliance_energie", "alliance"),
            Map.entry("energy_alliance", "alliance")
    );

    private ActionKeySupport() {
    }

    public static String canonicalize(String actionKey) {
        if (actionKey == null || actionKey.isBlank()) {
            return actionKey;
        }

        String normalized = actionKey.trim().toLowerCase();
        return CANONICAL_KEYS.getOrDefault(normalized, normalized);
    }
}
