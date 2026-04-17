package com.geoeconwars.intelligence.api;

import com.geoeconwars.intelligence.service.IntelligenceModels;
import com.geoeconwars.intelligence.service.IntelligenceService;
import com.geoeconwars.shared.web.ClientAddressResolver;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import com.geoeconwars.intelligence.service.IntelligenceStreamService;
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

    public IntelligenceController(
            IntelligenceService intelligenceService,
            IntelligenceStreamService intelligenceStreamService,
            ClientAddressResolver clientAddressResolver
    ) {
        this.intelligenceService = intelligenceService;
        this.intelligenceStreamService = intelligenceStreamService;
        this.clientAddressResolver = clientAddressResolver;
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

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(
            HttpServletRequest request,
            @RequestParam @NotBlank @Pattern(regexp = "^[A-Za-z]{2}$") String countryCode,
            @RequestParam @NotBlank @Pattern(regexp = "^[A-Za-z_-]{2,32}$") String actionKey
    ) {
        return intelligenceStreamService.subscribe(countryCode, actionKey, clientAddressResolver.resolve(request));
    }
}
