package com.geoeconwars.watchlist.api;

import com.geoeconwars.auth.service.CurrentActorService;
import com.geoeconwars.auth.service.ActorContext;
import com.geoeconwars.watchlist.service.SmartAlertEngine;
import com.geoeconwars.watchlist.service.WatchlistDigestService;
import com.geoeconwars.watchlist.service.WatchlistService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/watchlist")
public class WatchlistController {

    private final CurrentActorService currentActorService;
    private final WatchlistService watchlistService;
    private final WatchlistDigestService watchlistDigestService;
    private final SmartAlertEngine smartAlertEngine;

    public WatchlistController(
            CurrentActorService currentActorService,
            WatchlistService watchlistService,
            WatchlistDigestService watchlistDigestService,
            SmartAlertEngine smartAlertEngine
    ) {
        this.currentActorService = currentActorService;
        this.watchlistService = watchlistService;
        this.watchlistDigestService = watchlistDigestService;
        this.smartAlertEngine = smartAlertEngine;
    }

    @GetMapping
    public List<WatchlistService.WatchlistView> list(Authentication authentication) {
        return watchlistService.list(currentActorService.require(authentication));
    }

    @GetMapping("/digest")
    public WatchlistDigestService.WatchlistDigestView digest(
            Authentication authentication,
            @RequestParam(required = false) @Min(1) @Max(12) Integer limit,
            @RequestParam(required = false) @Min(1) @Max(10) Integer signalLimit,
            @RequestParam(required = false) @Min(1) @Max(60) Integer horizonDays
    ) {
        return watchlistDigestService.digest(
                currentActorService.require(authentication),
                limit,
                signalLimit,
                horizonDays
        );
    }

    @PostMapping
    public WatchlistService.WatchlistView upsert(
            Authentication authentication,
            @Valid @RequestBody CreateWatchlistItemRequest request
    ) {
        return watchlistService.upsert(
                currentActorService.require(authentication),
                new WatchlistService.CreateWatchlistItemCommand(
                        request.countryCode(),
                        request.actionKey(),
                        request.preferredMode()
                )
        );
    }

    @DeleteMapping("/{countryCode}/{actionKey}")
    public void delete(
            Authentication authentication,
            @PathVariable @Pattern(regexp = "^[A-Za-z]{2}$") String countryCode,
            @PathVariable @Pattern(regexp = "^[A-Za-z_-]{2,32}$") String actionKey
    ) {
        watchlistService.delete(currentActorService.require(authentication), countryCode, actionKey);
    }

    @GetMapping("/alerts")
    public SmartAlertEngine.AlertBatch alerts(Authentication authentication) {
        ActorContext actor = currentActorService.require(authentication);
        return smartAlertEngine.generateAlerts(actor.subjectType(), actor.subjectId());
    }

    public record CreateWatchlistItemRequest(
            @NotBlank @Pattern(regexp = "^[A-Za-z]{2}$") String countryCode,
            @NotBlank @Pattern(regexp = "^[A-Za-z_-]{2,32}$") String actionKey,
            @NotBlank String preferredMode
    ) {
    }
}
