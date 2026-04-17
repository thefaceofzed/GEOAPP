package com.geoeconwars.simulations.service;

import com.geoeconwars.ingestion.service.SignalModels.RelevantSignalView;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class SimulationModels {

    private SimulationModels() {
    }

    public record CreateSimulationCommand(
            String countryCode,
            String actionKey,
            int durationHours,
            List<String> allyCodes
    ) {
    }

    public record Narrative(
            String headline,
            String summary
    ) {
    }

    public record AnimatedAsset(
            String key,
            String label,
            String unit,
            BigDecimal from,
            BigDecimal to,
            BigDecimal delta
    ) {
    }

    public record SimulationView(
            UUID simulationId,
            String countryCode,
            String countryName,
            String actionKey,
            String actionLabel,
            String actionDescription,
            String replayTitle,
            String visualIntensity,
            String rulesVersion,
            BigDecimal severityScore,
            List<String> affectedCountries,
            Narrative narrative,
            List<AnimatedAsset> assets,
            List<RelevantSignalView> supportingSignals,
            boolean cached,
            String replayToken,
            String replayUrl,
            Integer simulationsRemaining,
            boolean unlimited,
            Instant createdAt
    ) {
    }

    public record HistoryItem(
            UUID simulationId,
            String replayToken,
            String countryCode,
            String countryName,
            String actionKey,
            String actionLabel,
            BigDecimal severityScore,
            Instant createdAt
    ) {
    }
}
