package com.geoeconwars.intelligence.api;

import com.geoeconwars.intelligence.service.BriefingService;
import com.geoeconwars.intelligence.service.BriefingService.BriefingRequest;
import com.geoeconwars.intelligence.service.BriefingService.DecisionBriefing;
import com.geoeconwars.intelligence.service.ExposureService;
import com.geoeconwars.intelligence.service.ExposureService.ExposureAnalysis;
import com.geoeconwars.intelligence.service.ExposureService.ExposureProfile;
import com.geoeconwars.intelligence.service.ScenarioTemplateService;
import com.geoeconwars.intelligence.service.ScenarioTemplateService.ScenarioTemplate;
import com.geoeconwars.shared.exception.NotFoundException;
import java.util.List;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api")
public class ScenarioIntelligenceController {

    private final ScenarioTemplateService scenarioTemplateService;
    private final BriefingService briefingService;
    private final ExposureService exposureService;

    public ScenarioIntelligenceController(
            ScenarioTemplateService scenarioTemplateService,
            BriefingService briefingService,
            ExposureService exposureService
    ) {
        this.scenarioTemplateService = scenarioTemplateService;
        this.briefingService = briefingService;
        this.exposureService = exposureService;
    }

    @GetMapping("/scenarios/templates")
    public List<ScenarioTemplate> templates() {
        return scenarioTemplateService.getTemplates();
    }

    @GetMapping("/scenarios/templates/{id}")
    public ScenarioTemplate template(@PathVariable String id) {
        return scenarioTemplateService.getTemplate(id)
                .orElseThrow(() -> new NotFoundException("Scenario template not found: " + id));
    }

    @PostMapping("/briefings/generate")
    public DecisionBriefing generateBriefing(@RequestBody BriefingRequest request) {
        return briefingService.generate(request);
    }

    @PostMapping("/exposure/analyze")
    public ExposureAnalysis analyzeExposure(@RequestBody ExposureAnalyzeRequest request) {
        return exposureService.analyze(request.scenarioId(), request.profile());
    }

    public record ExposureAnalyzeRequest(
            String scenarioId,
            ExposureProfile profile
    ) {
    }
}
