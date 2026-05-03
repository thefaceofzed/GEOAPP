package com.geoeconwars.intelligence.service;

import com.geoeconwars.rules.domain.RulesCatalog;
import com.geoeconwars.rules.service.ActionKeySupport;
import com.geoeconwars.rules.service.RulesCatalogLoader;
import com.geoeconwars.shared.exception.BadRequestException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class BriefingService {

    private final RulesCatalogLoader rulesCatalogLoader;
    private final IntelligenceService intelligenceService;
    private final CiiScoringService ciiScoringService;

    public BriefingService(
            RulesCatalogLoader rulesCatalogLoader,
            IntelligenceService intelligenceService,
            CiiScoringService ciiScoringService
    ) {
        this.rulesCatalogLoader = rulesCatalogLoader;
        this.intelligenceService = intelligenceService;
        this.ciiScoringService = ciiScoringService;
    }

    public DecisionBriefing generate(BriefingRequest request) {
        if (request.countryCode() == null || request.countryCode().isBlank()) {
            throw new BadRequestException("countryCode is required");
        }
        if (request.actionKey() == null || request.actionKey().isBlank()) {
            throw new BadRequestException("actionKey is required");
        }

        RulesCatalog catalog = rulesCatalogLoader.activeCatalog();
        String canonicalAction = ActionKeySupport.canonicalize(request.actionKey());

        RulesCatalog.CountryRule country = catalog.findCountry(request.countryCode().trim().toUpperCase())
                .orElseThrow(() -> new BadRequestException("Unsupported country code: " + request.countryCode()));
        RulesCatalog.ActionRule action = catalog.findAction(canonicalAction)
                .orElseThrow(() -> new BadRequestException("Unsupported action key: " + request.actionKey()));

        IntelligenceModels.ObservedView observed = intelligenceService.observedSignals(
                country.countryCode(), canonicalAction, null);
        IntelligenceModels.ForecastView forecast = intelligenceService.forecast(
                country.countryCode(), canonicalAction, null);
        CiiModels.CiiScore ciiScore = ciiScoringService.computeScore(country.countryCode());

        String headline = country.countryName() + " — " + action.label() + " Decision Brief";

        List<BriefingSection> keyRisks = buildKeyRisks(forecast, ciiScore, action);
        List<BriefingSection> evidence = buildEvidence(observed);
        List<String> recommendedActions = buildRecommendedActions(forecast);
        List<String> limitations = buildLimitations();

        BigDecimal confidenceScore = forecast.confidenceScore() != null
                ? forecast.confidenceScore()
                : BigDecimal.ZERO;
        String confidenceLevel = confidenceLevel(confidenceScore);

        return new DecisionBriefing(
                UUID.randomUUID().toString(),
                Instant.now(),
                headline,
                confidenceLevel,
                confidenceScore.setScale(2, RoundingMode.HALF_UP),
                keyRisks,
                evidence,
                recommendedActions,
                limitations,
                catalog.version(),
                request.scenarioId(),
                country.countryCode(),
                country.countryName(),
                canonicalAction,
                action.label(),
                List.of("markdown", "json", "link")
        );
    }

    private List<BriefingSection> buildKeyRisks(
            IntelligenceModels.ForecastView forecast,
            CiiModels.CiiScore ciiScore,
            RulesCatalog.ActionRule action
    ) {
        List<BriefingSection> risks = new ArrayList<>();

        for (IntelligenceModels.ForecastDriver driver : forecast.drivers()) {
            risks.add(new BriefingSection(
                    driver.label(),
                    driver.explanation(),
                    "high"
            ));
        }

        risks.add(new BriefingSection(
                "Country Instability Index",
                "CII combined score: %.1f — unrest: %.1f, conflict: %.1f, security: %.1f, information: %.1f (trend: %s)"
                        .formatted(
                                ciiScore.combinedScore(),
                                ciiScore.unrestScore(),
                                ciiScore.conflictScore(),
                                ciiScore.securityScore(),
                                ciiScore.informationScore(),
                                ciiScore.trend()
                        ),
                "medium"
        ));

        if (action.baseSeverity() != null) {
            BigDecimal baseline = action.baseSeverity().compareTo(BigDecimal.ONE) <= 0
                    ? action.baseSeverity().multiply(BigDecimal.valueOf(100))
                    : action.baseSeverity();
            risks.add(new BriefingSection(
                    "Scenario Baseline",
                    "Deterministic baseline severity for %s is %s/100".formatted(
                            action.label(),
                            baseline.setScale(0, RoundingMode.HALF_UP).toPlainString()
                    ),
                    "medium"
            ));
        }

        return risks;
    }

    private List<BriefingSection> buildEvidence(IntelligenceModels.ObservedView observed) {
        List<BriefingSection> evidence = new ArrayList<>();
        for (IntelligenceModels.ObservedSignal signal : observed.signals()) {
            String content = signal.extractedSummary();
            if (signal.sourceName() != null) {
                content += " [Source: " + signal.sourceName() + "]";
            }
            if (signal.url() != null) {
                content += " (" + signal.url() + ")";
            }
            String priority = signal.severityScore() != null
                    && signal.severityScore().compareTo(BigDecimal.valueOf(70)) >= 0
                    ? "high" : "medium";
            evidence.add(new BriefingSection(
                    signal.signalType().value() + " — " + signal.sourceName(),
                    content,
                    priority
            ));
        }
        return evidence;
    }

    private List<String> buildRecommendedActions(IntelligenceModels.ForecastView forecast) {
        List<String> actions = new ArrayList<>();
        String riskLabel = forecast.riskLabel();

        if ("Severe".equals(riskLabel) || "High".equals(riskLabel)) {
            actions.add("Brief stakeholders immediately with current risk assessment.");
            actions.add("Run comparative scenario analysis against alternative outcomes.");
            actions.add("Review exposure profile and hedging positions.");
            actions.add("Monitor live signals with elevated frequency.");
        } else if ("Elevated".equals(riskLabel)) {
            actions.add("Schedule stakeholder review within 24 hours.");
            actions.add("Run a deterministic scenario to quantify baseline impact.");
            actions.add("Add affected countries to watchlist for continuous monitoring.");
        } else {
            actions.add("Maintain standard monitoring cadence.");
            actions.add("Save lens to watchlist for future reference.");
            actions.add("Recheck after next signal ingestion cycle.");
        }

        return actions;
    }

    private List<String> buildLimitations() {
        return List.of(
                "Deterministic model, not predictive — outputs reflect rule-based scenario logic.",
                "Signal coverage may be incomplete — not all geopolitical events are captured in real time.",
                "Confidence scores reflect source quality and diversity, not forecast accuracy.",
                "CII sub-scores are computed from available signals and may lag real-world events.",
                "This brief does not constitute financial or security advice."
        );
    }

    private String confidenceLevel(BigDecimal confidenceScore) {
        if (confidenceScore.compareTo(BigDecimal.valueOf(75)) >= 0) {
            return "high";
        }
        if (confidenceScore.compareTo(BigDecimal.valueOf(45)) >= 0) {
            return "medium";
        }
        return "low";
    }

    public record BriefingRequest(
            String countryCode,
            String actionKey,
            String scenarioId
    ) {
    }

    public record DecisionBriefing(
            String id,
            Instant generatedAt,
            String headline,
            String confidenceLevel,
            BigDecimal confidenceScore,
            List<BriefingSection> keyRisks,
            List<BriefingSection> evidence,
            List<String> recommendedActions,
            List<String> limitations,
            String rulesVersion,
            String scenarioId,
            String countryCode,
            String countryName,
            String actionKey,
            String actionLabel,
            List<String> exportFormats
    ) {
    }

    public record BriefingSection(
            String title,
            String content,
            String priority
    ) {
    }
}
