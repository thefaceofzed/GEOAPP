package com.geoeconwars.admin.api;

import com.geoeconwars.admin.service.AdminModels;
import com.geoeconwars.admin.service.AdminOperationsService;
import com.geoeconwars.auth.service.CurrentActorService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminOperationsController {

    private final CurrentActorService currentActorService;
    private final AdminOperationsService adminOperationsService;

    public AdminOperationsController(
            CurrentActorService currentActorService,
            AdminOperationsService adminOperationsService
    ) {
        this.currentActorService = currentActorService;
        this.adminOperationsService = adminOperationsService;
    }

    @GetMapping("/ingestion/status")
    public AdminModels.IngestionStatusView ingestionStatus(Authentication authentication) {
        return adminOperationsService.ingestionStatus(currentActorService.requireAdmin(authentication));
    }

    @PostMapping("/ingestion/refresh")
    public AdminModels.RefreshSignalsView refreshSignals(
            Authentication authentication,
            @RequestBody(required = false) RefreshSignalsRequest request
    ) {
        return adminOperationsService.refreshSignals(
                currentActorService.requireAdmin(authentication),
                request == null ? null : request.sourceKey()
        );
    }

    @GetMapping("/intelligence/status")
    public AdminModels.IntelligenceStatusView intelligenceStatus(Authentication authentication) {
        return adminOperationsService.intelligenceStatus(currentActorService.requireAdmin(authentication));
    }

    @PostMapping("/intelligence/cache/invalidate")
    public AdminModels.CacheInvalidationView invalidateIntelligenceCache(
            Authentication authentication,
            @RequestBody(required = false) CacheInvalidationRequest request
    ) {
        return adminOperationsService.invalidateIntelligenceCache(
                currentActorService.requireAdmin(authentication),
                request == null ? null : request.countryCode(),
                request == null ? null : request.actionKey()
        );
    }

    public record CacheInvalidationRequest(
            String countryCode,
            String actionKey
    ) {
    }

    public record RefreshSignalsRequest(
            String sourceKey
    ) {
    }
}
