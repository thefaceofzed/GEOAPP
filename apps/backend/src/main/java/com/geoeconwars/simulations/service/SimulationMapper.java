package com.geoeconwars.simulations.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.geoeconwars.ingestion.service.SignalEnrichmentService;
import com.geoeconwars.rules.domain.RulesCatalog;
import com.geoeconwars.rules.service.ActionKeySupport;
import com.geoeconwars.rules.service.RulesCatalogLoader;
import com.geoeconwars.shared.exception.NotFoundException;
import com.geoeconwars.shared.util.JsonSupport;
import com.geoeconwars.simulations.domain.Simulation;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class SimulationMapper {

    private final JsonSupport jsonSupport;
    private final RulesCatalogLoader rulesCatalogLoader;
    private final SignalEnrichmentService signalEnrichmentService;

    public SimulationMapper(
            JsonSupport jsonSupport,
            RulesCatalogLoader rulesCatalogLoader,
            SignalEnrichmentService signalEnrichmentService
    ) {
        this.jsonSupport = jsonSupport;
        this.rulesCatalogLoader = rulesCatalogLoader;
        this.signalEnrichmentService = signalEnrichmentService;
    }

    public SimulationModels.SimulationView toView(Simulation simulation, String replayToken, Integer simulationsRemaining, boolean unlimited) {
        RulesCatalog catalog = rulesCatalogLoader.activeCatalog();
        RulesCatalog.CountryRule country = catalog.findCountry(simulation.getCountryCode())
                .orElseThrow(() -> new NotFoundException("Country metadata missing for " + simulation.getCountryCode()));
        String canonicalActionKey = ActionKeySupport.canonicalize(simulation.getActionKey());
        RulesCatalog.ActionRule action = catalog.findAction(canonicalActionKey)
                .orElseThrow(() -> new NotFoundException("Action metadata missing for " + simulation.getActionKey()));

        return new SimulationModels.SimulationView(
                simulation.getId(),
                simulation.getCountryCode(),
                country.countryName(),
                canonicalActionKey,
                action.label(),
                action.description(),
                action.replayTitle(),
                action.visualIntensity(),
                simulation.getRulesVersion(),
                simulation.getSeverityScore(),
                readAffectedCountries(simulation.getAffectedCountriesJson()),
                readNarrative(simulation.getNarrativeJson()),
                readAssets(simulation.getImpactsJson()),
                signalEnrichmentService.findRelevantSignals(simulation.getCountryCode(), canonicalActionKey, 5),
                simulation.isCached(),
                replayToken,
                replayToken == null ? null : "/replay/" + replayToken,
                simulationsRemaining,
                unlimited,
                simulation.getCreatedAt()
        );
    }

    public SimulationModels.HistoryItem toHistoryItem(Simulation simulation, String replayToken) {
        RulesCatalog catalog = rulesCatalogLoader.activeCatalog();
        RulesCatalog.CountryRule country = catalog.findCountry(simulation.getCountryCode())
                .orElseThrow(() -> new NotFoundException("Country metadata missing for " + simulation.getCountryCode()));
        String canonicalActionKey = ActionKeySupport.canonicalize(simulation.getActionKey());
        RulesCatalog.ActionRule action = catalog.findAction(canonicalActionKey)
                .orElseThrow(() -> new NotFoundException("Action metadata missing for " + simulation.getActionKey()));

        return new SimulationModels.HistoryItem(
                simulation.getId(),
                replayToken,
                simulation.getCountryCode(),
                country.countryName(),
                canonicalActionKey,
                action.label(),
                simulation.getSeverityScore(),
                simulation.getCreatedAt()
        );
    }

    public List<SimulationModels.AnimatedAsset> readAssets(String json) {
        return jsonSupport.read(json, new TypeReference<>() {
        });
    }

    public SimulationModels.Narrative readNarrative(String json) {
        return jsonSupport.read(json, new TypeReference<>() {
        });
    }

    public List<String> readAffectedCountries(String json) {
        return jsonSupport.read(json, new TypeReference<>() {
        });
    }
}
