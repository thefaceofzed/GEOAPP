package com.geoeconwars.rules.service;

import com.geoeconwars.rules.domain.RulesCatalog;
import com.geoeconwars.shared.exception.BadRequestException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;

@Service
public class RulesEngine {

    private static final List<String> GLOBAL_MARKET_CODES = List.of(
            "US", "CN", "JP", "DE", "GB", "IN", "FR", "BR", "AU", "CA", "SG", "KR", "AE", "SA", "CH"
    );

    public SimulationComputation compute(RulesCatalog catalog, String countryCode, String actionKey, int durationHours, List<String> allyCodes) {
        String normalizedCountryCode = countryCode == null ? null : countryCode.trim().toUpperCase();
        RulesCatalog.CountryRule countryRule = catalog.findCountry(normalizedCountryCode)
                .orElseThrow(() -> new BadRequestException("Unsupported country code: " + countryCode));
        String normalizedActionKey = ActionKeySupport.canonicalize(actionKey);
        RulesCatalog.ActionRule actionRule = catalog.findAction(normalizedActionKey)
                .orElseThrow(() -> new BadRequestException("Unsupported action key: " + actionKey));

        List<String> normalizedAllies = normalizeAllies(catalog, countryRule.countryCode(), allyCodes);

        BigDecimal durationMultiplier = durationMultiplier(durationHours);
        BigDecimal allyMultiplier = allyMultiplier(normalizedAllies.size());
        BigDecimal totalMultiplier = durationMultiplier.multiply(allyMultiplier).setScale(4, RoundingMode.HALF_UP);

        List<ComputedAssetImpact> assets = new ArrayList<>();
        for (RulesCatalog.AssetRule asset : actionRule.assets()) {
            BigDecimal delta = asset.delta().multiply(totalMultiplier).setScale(2, RoundingMode.HALF_UP);
            BigDecimal target = asset.baseline().add(delta).setScale(2, RoundingMode.HALF_UP);
            assets.add(new ComputedAssetImpact(
                    asset.key(),
                    renderTemplate(asset.label(), countryRule),
                    asset.unit(),
                    asset.baseline().setScale(2, RoundingMode.HALF_UP),
                    target,
                    delta
            ));
        }

        BigDecimal severity = actionRule.baseSeverity()
                .multiply(BigDecimal.valueOf(0.96d).add(BigDecimal.valueOf(Math.min(durationHours, 336) / 336.0d * 0.18d)))
                .multiply(BigDecimal.valueOf(1.0d + Math.min(normalizedAllies.size(), 3) * 0.025d))
                .setScale(2, RoundingMode.HALF_UP);
        if (severity.compareTo(BigDecimal.ONE) > 0) {
            severity = BigDecimal.ONE;
        }

        String summary = "%s Duration %dh. Allied backing: %d partner(s).".formatted(
                renderTemplate(actionRule.narrative().summary(), countryRule),
                durationHours,
                normalizedAllies.size()
        );

        return new SimulationComputation(
                catalog.version(),
                countryRule.countryCode(),
                countryRule.countryName(),
                normalizedActionKey,
                renderTemplate(actionRule.label(), countryRule),
                renderTemplate(actionRule.description(), countryRule),
                renderTemplate(actionRule.replayTitle(), countryRule),
                actionRule.visualIntensity(),
                severity,
                computeAffectedCountries(catalog, countryRule, actionRule, normalizedAllies),
                new ComputedNarrative(renderTemplate(actionRule.narrative().headline(), countryRule), summary),
                assets
        );
    }

    private List<String> normalizeAllies(RulesCatalog catalog, String sourceCountryCode, List<String> allyCodes) {
        if (allyCodes == null || allyCodes.isEmpty()) {
            return List.of();
        }

        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        for (String allyCode : allyCodes) {
            if (allyCode == null || allyCode.isBlank()) {
                continue;
            }

            String candidate = allyCode.trim().toUpperCase();
            if (candidate.equalsIgnoreCase(sourceCountryCode)) {
                continue;
            }

            if (catalog.findCountry(candidate).isEmpty()) {
                throw new BadRequestException("Unsupported ally code: " + allyCode);
            }

            normalized.add(candidate);
        }

        return List.copyOf(normalized);
    }

    private List<String> computeAffectedCountries(
            RulesCatalog catalog,
            RulesCatalog.CountryRule sourceCountry,
            RulesCatalog.ActionRule actionRule,
            List<String> allyCodes
    ) {
        LinkedHashSet<String> affected = new LinkedHashSet<>();

        addCodes(affected, sourceCountry.borderCountries(), catalog, sourceCountry.countryCode());
        addCodes(affected, allyCodes, catalog, sourceCountry.countryCode());
        addRankedCountries(
                affected,
                rankedCountries(
                        catalog,
                        sourceCountry,
                        actionRule.key(),
                        country -> Objects.equals(country.subregion(), sourceCountry.subregion()),
                        4
                ),
                sourceCountry.countryCode()
        );
        addRankedCountries(
                affected,
                rankedCountries(
                        catalog,
                        sourceCountry,
                        actionRule.key(),
                        country -> Objects.equals(country.region(), sourceCountry.region())
                                && !Objects.equals(country.subregion(), sourceCountry.subregion()),
                        4
                ),
                sourceCountry.countryCode()
        );
        addCodes(affected, actionRule.beneficiaryCountries(), catalog, sourceCountry.countryCode());
        addCodes(affected, GLOBAL_MARKET_CODES, catalog, sourceCountry.countryCode());

        return affected.stream()
                .limit(14)
                .toList();
    }

    private void addCodes(
            LinkedHashSet<String> accumulator,
            List<String> countryCodes,
            RulesCatalog catalog,
            String sourceCountryCode
    ) {
        if (countryCodes == null) {
            return;
        }

        for (String countryCode : countryCodes) {
            if (countryCode == null || countryCode.isBlank()) {
                continue;
            }

            String normalized = countryCode.trim().toUpperCase();
            if (normalized.equalsIgnoreCase(sourceCountryCode)) {
                continue;
            }

            if (catalog.findCountry(normalized).isPresent()) {
                accumulator.add(normalized);
            }
        }
    }

    private void addRankedCountries(
            LinkedHashSet<String> accumulator,
            List<RulesCatalog.CountryRule> rankedCountries,
            String sourceCountryCode
    ) {
        for (RulesCatalog.CountryRule country : rankedCountries) {
            if (!country.countryCode().equalsIgnoreCase(sourceCountryCode)) {
                accumulator.add(country.countryCode());
            }
        }
    }

    private List<RulesCatalog.CountryRule> rankedCountries(
            RulesCatalog catalog,
            RulesCatalog.CountryRule sourceCountry,
            String actionKey,
            java.util.function.Predicate<RulesCatalog.CountryRule> predicate,
            int limit
    ) {
        return catalog.countries().stream()
                .filter(country -> !country.countryCode().equalsIgnoreCase(sourceCountry.countryCode()))
                .filter(predicate)
                .sorted(Comparator.comparingInt(country -> deterministicRank(sourceCountry.countryCode(), actionKey, country.countryCode())))
                .limit(limit)
                .toList();
    }

    private int deterministicRank(String sourceCountryCode, String actionKey, String targetCountryCode) {
        return Math.abs((sourceCountryCode + "|" + actionKey + "|" + targetCountryCode).hashCode());
    }

    private String renderTemplate(String value, RulesCatalog.CountryRule countryRule) {
        if (value == null) {
            return null;
        }

        return value
                .replace("{countryName}", countryRule.countryName())
                .replace("{countryCode}", countryRule.countryCode())
                .replace("{region}", countryRule.region() == null ? "" : countryRule.region());
    }

    private BigDecimal durationMultiplier(int durationHours) {
        if (durationHours < 1 || durationHours > 720) {
            throw new BadRequestException("durationHours must be between 1 and 720");
        }
        double normalized = Math.min(durationHours, 336) / 336.0d;
        return BigDecimal.valueOf(0.90d + normalized * 0.30d);
    }

    private BigDecimal allyMultiplier(int allyCount) {
        return BigDecimal.valueOf(1.0d + Math.min(allyCount, 3) * 0.04d);
    }

    public record SimulationComputation(
            String rulesVersion,
            String countryCode,
            String countryName,
            String actionKey,
            String actionLabel,
            String actionDescription,
            String replayTitle,
            String visualIntensity,
            BigDecimal severityScore,
            List<String> affectedCountries,
            ComputedNarrative narrative,
            List<ComputedAssetImpact> assets
    ) {
    }

    public record ComputedNarrative(
            String headline,
            String summary
    ) {
    }

    public record ComputedAssetImpact(
            String key,
            String label,
            String unit,
            BigDecimal from,
            BigDecimal to,
            BigDecimal delta
    ) {
    }
}
