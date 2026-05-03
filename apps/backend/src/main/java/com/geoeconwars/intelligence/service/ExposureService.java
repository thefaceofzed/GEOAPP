package com.geoeconwars.intelligence.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.geoeconwars.shared.exception.NotFoundException;
import com.geoeconwars.shared.util.JsonSupport;
import com.geoeconwars.simulations.domain.Simulation;
import com.geoeconwars.simulations.domain.SimulationRepository;
import com.geoeconwars.simulations.service.SimulationModels;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class ExposureService {

    private final SimulationRepository simulationRepository;
    private final JsonSupport jsonSupport;

    public ExposureService(SimulationRepository simulationRepository, JsonSupport jsonSupport) {
        this.simulationRepository = simulationRepository;
        this.jsonSupport = jsonSupport;
    }

    public ExposureAnalysis analyze(String scenarioId, ExposureProfile profile) {
        if (scenarioId == null || scenarioId.isBlank()) {
            return emptyAnalysis(null, profile);
        }

        UUID simulationUuid;
        try {
            simulationUuid = UUID.fromString(scenarioId);
        } catch (IllegalArgumentException e) {
            throw new NotFoundException("Invalid scenario ID format: " + scenarioId);
        }

        Simulation simulation = simulationRepository.findById(simulationUuid)
                .orElseThrow(() -> new NotFoundException("Simulation not found: " + scenarioId));

        List<SimulationModels.AnimatedAsset> assets = readAssets(simulation.getImpactsJson());
        List<String> affectedCountries = readCountries(simulation.getAffectedCountriesJson());

        List<ExposureImpact> impacts = new ArrayList<>();

        Set<String> profileCountriesUpper = toUpperSet(profile.countries());
        Set<String> profileCommoditiesLower = toLowerSet(profile.commodities());
        Set<String> profileFxLower = toLowerSet(profile.fxPairs());

        for (SimulationModels.AnimatedAsset asset : assets) {
            String assetKeyLower = asset.key().toLowerCase();

            boolean matched = false;
            if (profileCommoditiesLower.stream().anyMatch(c -> assetKeyLower.contains(c.replace(" ", "_").toLowerCase()))) {
                matched = true;
            }
            if (!matched && profileFxLower.stream().anyMatch(fx -> assetKeyLower.contains(fx.replace("/", "_").toLowerCase()))) {
                matched = true;
            }

            if (matched) {
                impacts.add(toImpact(asset));
            }
        }

        Set<String> affectedUpper = toUpperSet(affectedCountries);
        for (String profileCountry : profileCountriesUpper) {
            if (affectedUpper.contains(profileCountry)) {
                impacts.add(new ExposureImpact(
                        "country_" + profileCountry.toLowerCase(),
                        profileCountry + " exposure",
                        "index",
                        0.0,
                        0.0,
                        "indirect"
                ));
            }
        }

        String overallSeverity = computeOverallSeverity(impacts);
        int totalWatched = (profile.countries() != null ? profile.countries().size() : 0)
                + (profile.commodities() != null ? profile.commodities().size() : 0)
                + (profile.fxPairs() != null ? profile.fxPairs().size() : 0)
                + (profile.sectors() != null ? profile.sectors().size() : 0);
        String summary = "This scenario affects %d of your %d watched assets.".formatted(impacts.size(), totalWatched);

        return new ExposureAnalysis(
                Instant.now(),
                scenarioId,
                profile,
                impacts,
                overallSeverity,
                summary
        );
    }

    private ExposureImpact toImpact(SimulationModels.AnimatedAsset asset) {
        double delta = asset.delta() != null ? asset.delta().doubleValue() : 0.0;
        double from = asset.from() != null ? asset.from().doubleValue() : 0.0;
        double percentChange = from != 0.0
                ? BigDecimal.valueOf(delta / from * 100).setScale(2, RoundingMode.HALF_UP).doubleValue()
                : 0.0;
        double absPct = Math.abs(percentChange);
        String severity;
        if (absPct >= 20) {
            severity = "critical";
        } else if (absPct >= 10) {
            severity = "high";
        } else if (absPct >= 5) {
            severity = "medium";
        } else {
            severity = "low";
        }

        return new ExposureImpact(
                asset.key(),
                asset.label(),
                asset.unit(),
                delta,
                percentChange,
                severity
        );
    }

    private String computeOverallSeverity(List<ExposureImpact> impacts) {
        if (impacts.isEmpty()) {
            return "none";
        }
        boolean hasCritical = impacts.stream().anyMatch(i -> "critical".equals(i.severity()));
        if (hasCritical) return "critical";
        boolean hasHigh = impacts.stream().anyMatch(i -> "high".equals(i.severity()));
        if (hasHigh) return "high";
        boolean hasMedium = impacts.stream().anyMatch(i -> "medium".equals(i.severity()));
        if (hasMedium) return "medium";
        return "low";
    }

    private ExposureAnalysis emptyAnalysis(String scenarioId, ExposureProfile profile) {
        return new ExposureAnalysis(
                Instant.now(),
                scenarioId,
                profile,
                List.of(),
                "none",
                "No scenario provided — run a simulation first to assess exposure."
        );
    }

    private List<SimulationModels.AnimatedAsset> readAssets(String json) {
        return jsonSupport.read(json, new TypeReference<>() {
        });
    }

    private List<String> readCountries(String json) {
        return jsonSupport.read(json, new TypeReference<>() {
        });
    }

    private Set<String> toUpperSet(List<String> values) {
        if (values == null) return Set.of();
        Set<String> result = new HashSet<>();
        for (String v : values) {
            if (v != null) result.add(v.trim().toUpperCase());
        }
        return result;
    }

    private Set<String> toLowerSet(List<String> values) {
        if (values == null) return Set.of();
        Set<String> result = new HashSet<>();
        for (String v : values) {
            if (v != null) result.add(v.trim().toLowerCase());
        }
        return result;
    }

    public record ExposureProfile(
            String id,
            String label,
            List<String> countries,
            List<String> commodities,
            List<String> fxPairs,
            List<String> sectors
    ) {
    }

    public record ExposureImpact(
            String assetKey,
            String assetLabel,
            String unit,
            double delta,
            double percentChange,
            String severity
    ) {
    }

    public record ExposureAnalysis(
            Instant generatedAt,
            String scenarioId,
            ExposureProfile profile,
            List<ExposureImpact> impacts,
            String overallSeverity,
            String summary
    ) {
    }
}
