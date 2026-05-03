package com.geoeconwars.intelligence.api;

import com.geoeconwars.intelligence.service.AnomalyDetector;
import com.geoeconwars.intelligence.service.CiiModels;
import com.geoeconwars.intelligence.service.CiiScoringService;
import com.geoeconwars.intelligence.service.CorrelationEngine;
import com.geoeconwars.intelligence.service.GeoSignal;
import com.geoeconwars.intelligence.service.IntelligenceModels;
import com.geoeconwars.intelligence.service.IntelligenceService;
import com.geoeconwars.intelligence.service.IntelligenceStreamService;
import com.geoeconwars.intelligence.service.SignalAggregationService;
import com.geoeconwars.shared.web.ClientAddressResolver;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.time.Instant;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Validated
@RestController
@RequestMapping("/api/intelligence")
public class IntelligenceController {

    private final IntelligenceService intelligenceService;
    private final IntelligenceStreamService intelligenceStreamService;
    private final ClientAddressResolver clientAddressResolver;
    private final CiiScoringService ciiScoringService;
    private final CorrelationEngine correlationEngine;
    private final AnomalyDetector anomalyDetector;
    private final SignalAggregationService signalAggregationService;

    public IntelligenceController(
            IntelligenceService intelligenceService,
            IntelligenceStreamService intelligenceStreamService,
            ClientAddressResolver clientAddressResolver,
            CiiScoringService ciiScoringService,
            CorrelationEngine correlationEngine,
            AnomalyDetector anomalyDetector,
            SignalAggregationService signalAggregationService
    ) {
        this.intelligenceService = intelligenceService;
        this.intelligenceStreamService = intelligenceStreamService;
        this.clientAddressResolver = clientAddressResolver;
        this.ciiScoringService = ciiScoringService;
        this.correlationEngine = correlationEngine;
        this.anomalyDetector = anomalyDetector;
        this.signalAggregationService = signalAggregationService;
    }

    @GetMapping("/observed")
    public IntelligenceModels.ObservedView observed(
            @RequestParam @NotBlank @Pattern(regexp = "^[A-Za-z]{2}$") String countryCode,
            @RequestParam @NotBlank @Pattern(regexp = "^[A-Za-z_-]{2,32}$") String actionKey,
            @RequestParam(required = false) @Min(1) @Max(50) Integer limit
    ) {
        return intelligenceService.observedSignals(countryCode, actionKey, limit);
    }

    @GetMapping("/forecast")
    public IntelligenceModels.ForecastView forecast(
            @RequestParam @NotBlank @Pattern(regexp = "^[A-Za-z]{2}$") String countryCode,
            @RequestParam @NotBlank @Pattern(regexp = "^[A-Za-z_-]{2,32}$") String actionKey,
            @RequestParam(required = false) @Min(1) @Max(365) Integer horizonDays
    ) {
        return intelligenceService.forecast(countryCode, actionKey, horizonDays);
    }

    @GetMapping("/posture")
    public IntelligenceModels.PostureView posture(
            @RequestParam @NotBlank @Pattern(regexp = "^[A-Za-z]{2}$") String countryCode,
            @RequestParam @NotBlank @Pattern(regexp = "^[A-Za-z_-]{2,32}$") String actionKey,
            @RequestParam(required = false) @Min(1) @Max(50) Integer limit,
            @RequestParam(required = false) @Min(1) @Max(365) Integer horizonDays
    ) {
        return intelligenceService.posture(countryCode, actionKey, limit, horizonDays);
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(
            HttpServletRequest request,
            @RequestParam @NotBlank @Pattern(regexp = "^[A-Za-z]{2}$") String countryCode,
            @RequestParam @NotBlank @Pattern(regexp = "^[A-Za-z_-]{2,32}$") String actionKey
    ) {
        return intelligenceStreamService.subscribe(countryCode, actionKey, clientAddressResolver.resolve(request));
    }

    @GetMapping("/cii")
    public CiiModels.CiiSnapshot ciiScores(
            @RequestParam(required = false) List<String> countries
    ) {
        return ciiScoringService.snapshot(countries);
    }

    @GetMapping("/correlations")
    public List<CiiModels.CorrelationAlert> correlations() {
        return correlationEngine.detectCorrelations();
    }

    @GetMapping("/anomalies")
    public List<CiiModels.AnomalyResult> anomalies() {
        return anomalyDetector.detectAnomalies();
    }

    @GetMapping("/dashboard")
    public CiiModels.IntelligenceDashboard dashboard(
            @RequestParam(required = false) List<String> countries
    ) {
        CiiModels.CiiSnapshot ciiSnapshot = ciiScoringService.snapshot(countries);
        List<CiiModels.CorrelationAlert> correlations = correlationEngine.detectCorrelations();
        List<CiiModels.AnomalyResult> anomalies = anomalyDetector.detectAnomalies();
        List<GeoSignal> recentSignals = signalAggregationService.getRecentSignals(24);

        return new CiiModels.IntelligenceDashboard(
                Instant.now(),
                ciiSnapshot,
                correlations,
                anomalies,
                recentSignals
        );
    }

    @GetMapping("/signals")
    public List<GeoSignal> signals(
            @RequestParam(required = false) String countryCode,
            @RequestParam(required = false, defaultValue = "24") int hours
    ) {
        if (countryCode != null && !countryCode.isBlank()) {
            return signalAggregationService.getSignalsForCountry(countryCode);
        }
        return signalAggregationService.getRecentSignals(hours);
    }
}
