package com.geoeconwars.simulations.service;

import com.geoeconwars.auth.service.ActorContext;
import com.geoeconwars.replay.domain.ReplayLink;
import com.geoeconwars.replay.domain.ReplayLinkRepository;
import com.geoeconwars.rules.service.ActionKeySupport;
import com.geoeconwars.rules.service.RulesCatalogLoader;
import com.geoeconwars.rules.service.RulesEngine;
import com.geoeconwars.shared.exception.ForbiddenException;
import com.geoeconwars.shared.exception.NotFoundException;
import com.geoeconwars.shared.service.AuditService;
import com.geoeconwars.shared.util.HashingSupport;
import com.geoeconwars.shared.util.JsonSupport;
import com.geoeconwars.simulations.domain.Simulation;
import com.geoeconwars.simulations.domain.SimulationRepository;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SimulationService {

    private final SimulationRepository simulationRepository;
    private final ReplayLinkRepository replayLinkRepository;
    private final RulesCatalogLoader rulesCatalogLoader;
    private final RulesEngine rulesEngine;
    private final QuotaService quotaService;
    private final JsonSupport jsonSupport;
    private final HashingSupport hashingSupport;
    private final SimulationMapper simulationMapper;
    private final AuditService auditService;

    public SimulationService(
            SimulationRepository simulationRepository,
            ReplayLinkRepository replayLinkRepository,
            RulesCatalogLoader rulesCatalogLoader,
            RulesEngine rulesEngine,
            QuotaService quotaService,
            JsonSupport jsonSupport,
            HashingSupport hashingSupport,
            SimulationMapper simulationMapper,
            AuditService auditService
    ) {
        this.simulationRepository = simulationRepository;
        this.replayLinkRepository = replayLinkRepository;
        this.rulesCatalogLoader = rulesCatalogLoader;
        this.rulesEngine = rulesEngine;
        this.quotaService = quotaService;
        this.jsonSupport = jsonSupport;
        this.hashingSupport = hashingSupport;
        this.simulationMapper = simulationMapper;
        this.auditService = auditService;
    }

    @Transactional
    public SimulationModels.SimulationView createSimulation(ActorContext actor, SimulationModels.CreateSimulationCommand command) {
        var catalog = rulesCatalogLoader.activeCatalog();
        String normalizedCountryCode = command.countryCode().toUpperCase();
        String normalizedActionKey = ActionKeySupport.canonicalize(command.actionKey());
        List<String> normalizedAllies = command.allyCodes() == null ? List.of() : command.allyCodes()
                .stream()
                .map(String::toUpperCase)
                .sorted(Comparator.naturalOrder())
                .toList();
        String requestHash = hashingSupport.sha256(normalizedCountryCode + "|" + normalizedActionKey + "|" + command.durationHours() + "|" + String.join(",", normalizedAllies) + "|" + catalog.version());
        boolean cached = simulationRepository.findFirstByRequestHashAndRulesVersionOrderByCreatedAtDesc(requestHash, catalog.version()).isPresent();
        var computation = rulesEngine.compute(catalog, normalizedCountryCode, normalizedActionKey, command.durationHours(), normalizedAllies);
        QuotaService.QuotaStatus quotaStatus = quotaService.consume(actor);

        Simulation simulation = new Simulation();
        simulation.setSubjectType(actor.subjectType());
        simulation.setSubjectId(actor.subjectId());
        simulation.setCountryCode(computation.countryCode());
        simulation.setActionKey(computation.actionKey());
        simulation.setDurationHours(command.durationHours());
        simulation.setAlliesJson(jsonSupport.write(normalizedAllies));
        simulation.setRulesVersion(computation.rulesVersion());
        simulation.setSeverityScore(computation.severityScore());
        simulation.setImpactsJson(jsonSupport.write(computation.assets().stream()
                .map(asset -> new SimulationModels.AnimatedAsset(asset.key(), asset.label(), asset.unit(), asset.from(), asset.to(), asset.delta()))
                .toList()));
        simulation.setNarrativeJson(jsonSupport.write(new SimulationModels.Narrative(computation.narrative().headline(), computation.narrative().summary())));
        simulation.setAffectedCountriesJson(jsonSupport.write(computation.affectedCountries()));
        simulation.setRequestHash(requestHash);
        simulation.setCached(cached);
        simulationRepository.save(simulation);

        ReplayLink replayLink = new ReplayLink();
        replayLink.setSimulation(simulation);
        replayLink.setPublicToken(generateReplayToken());
        replayLink.setPublic(true);
        replayLinkRepository.save(replayLink);

        auditService.record("simulation_completed", actor.subjectType(), actor.subjectId(), Map.of(
                "simulationId", simulation.getId().toString(),
                "countryCode", simulation.getCountryCode(),
                "actionKey", simulation.getActionKey(),
                "cached", cached
        ));

        return simulationMapper.toView(simulation, replayLink.getPublicToken(), quotaStatus.remaining(), quotaStatus.unlimited());
    }

    @Transactional(readOnly = true)
    public SimulationModels.SimulationView getSimulation(ActorContext actor, UUID simulationId) {
        Simulation simulation = simulationRepository.findById(simulationId)
                .orElseThrow(() -> new NotFoundException("Simulation not found"));
        if (simulation.getSubjectType() != actor.subjectType() || !simulation.getSubjectId().equals(actor.subjectId())) {
            throw new ForbiddenException("This simulation does not belong to the current identity");
        }
        ReplayLink replayLink = replayLinkRepository.findBySimulationId(simulationId).orElse(null);
        QuotaService.QuotaStatus quotaStatus = quotaService.checkRemaining(actor);
        return simulationMapper.toView(simulation, replayLink == null ? null : replayLink.getPublicToken(), quotaStatus.remaining(), quotaStatus.unlimited());
    }

    @Transactional(readOnly = true)
    public List<SimulationModels.HistoryItem> getHistory(ActorContext actor) {
        return simulationRepository.findTop20BySubjectTypeAndSubjectIdOrderByCreatedAtDesc(actor.subjectType(), actor.subjectId())
                .stream()
                .map(simulation -> simulationMapper.toHistoryItem(
                        simulation,
                        replayLinkRepository.findBySimulationId(simulation.getId()).map(ReplayLink::getPublicToken).orElse(null)
                ))
                .toList();
    }

    private String generateReplayToken() {
        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(UUID.randomUUID().toString().replace("-", "").substring(0, 18).getBytes())
                .substring(0, 16);
    }
}
