package com.geoeconwars.watchlist.service;

import com.geoeconwars.auth.service.ActorContext;
import com.geoeconwars.rules.domain.RulesCatalog;
import com.geoeconwars.rules.service.ActionKeySupport;
import com.geoeconwars.rules.service.RulesCatalogLoader;
import com.geoeconwars.shared.exception.BadRequestException;
import com.geoeconwars.shared.service.AuditService;
import com.geoeconwars.watchlist.domain.WatchlistItem;
import com.geoeconwars.watchlist.domain.WatchlistItemRepository;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WatchlistService {

    private static final List<String> ALLOWED_MODES = List.of("observed", "simulate", "forecast");

    private final WatchlistItemRepository watchlistItemRepository;
    private final RulesCatalogLoader rulesCatalogLoader;
    private final AuditService auditService;

    public WatchlistService(
            WatchlistItemRepository watchlistItemRepository,
            RulesCatalogLoader rulesCatalogLoader,
            AuditService auditService
    ) {
        this.watchlistItemRepository = watchlistItemRepository;
        this.rulesCatalogLoader = rulesCatalogLoader;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<WatchlistView> list(ActorContext actor) {
        RulesCatalog catalog = rulesCatalogLoader.activeCatalog();
        return watchlistItemRepository.findBySubjectTypeAndSubjectIdOrderByCreatedAtDesc(actor.subjectType(), actor.subjectId()).stream()
                .map(item -> toView(item, catalog))
                .toList();
    }

    @Transactional
    public WatchlistView upsert(ActorContext actor, CreateWatchlistItemCommand command) {
        RulesCatalog catalog = rulesCatalogLoader.activeCatalog();
        RulesCatalog.CountryRule country = catalog.findCountry(normalizeCountryCode(command.countryCode()))
                .orElseThrow(() -> new BadRequestException("Unsupported country code: " + command.countryCode()));
        String canonicalActionKey = validateAction(catalog, command.actionKey());
        String preferredMode = validateMode(command.preferredMode());

        WatchlistItem item = watchlistItemRepository.findBySubjectTypeAndSubjectIdAndCountryCodeAndActionKey(
                        actor.subjectType(),
                        actor.subjectId(),
                        country.countryCode(),
                        canonicalActionKey
                )
                .orElseGet(WatchlistItem::new);
        item.setSubjectType(actor.subjectType());
        item.setSubjectId(actor.subjectId());
        item.setCountryCode(country.countryCode());
        item.setActionKey(canonicalActionKey);
        item.setPreferredMode(preferredMode);
        watchlistItemRepository.save(item);

        auditService.record(
                "watchlist_item_upserted",
                actor.subjectType(),
                actor.subjectId(),
                Map.of(
                        "countryCode", item.getCountryCode(),
                        "actionKey", item.getActionKey(),
                        "preferredMode", item.getPreferredMode()
                )
        );

        return toView(item, catalog);
    }

    @Transactional
    public void delete(ActorContext actor, String countryCode, String actionKey) {
        RulesCatalog catalog = rulesCatalogLoader.activeCatalog();
        String normalizedCountryCode = normalizeCountryCode(countryCode);
        String canonicalActionKey = validateAction(catalog, actionKey);

        WatchlistItem item = watchlistItemRepository.findBySubjectTypeAndSubjectIdAndCountryCodeAndActionKey(
                        actor.subjectType(),
                        actor.subjectId(),
                        normalizedCountryCode,
                        canonicalActionKey
                )
                .orElse(null);

        if (item == null) {
            return;
        }

        watchlistItemRepository.delete(item);
        auditService.record(
                "watchlist_item_deleted",
                actor.subjectType(),
                actor.subjectId(),
                Map.of(
                        "countryCode", normalizedCountryCode,
                        "actionKey", canonicalActionKey
                )
        );
    }

    private WatchlistView toView(WatchlistItem item, RulesCatalog catalog) {
        RulesCatalog.CountryRule country = catalog.findCountry(item.getCountryCode())
                .orElseThrow(() -> new BadRequestException("Country metadata missing for " + item.getCountryCode()));
        RulesCatalog.ActionRule action = catalog.findAction(item.getActionKey())
                .orElseThrow(() -> new BadRequestException("Action metadata missing for " + item.getActionKey()));

        return new WatchlistView(
                item.getId().toString(),
                country.countryCode(),
                country.countryCode3(),
                country.countryName(),
                item.getActionKey(),
                action.label(),
                item.getPreferredMode(),
                item.getCreatedAt()
        );
    }

    private String validateAction(RulesCatalog catalog, String actionKey) {
        String canonicalActionKey = ActionKeySupport.canonicalize(actionKey);
        return catalog.findAction(canonicalActionKey)
                .map(RulesCatalog.ActionRule::key)
                .orElseThrow(() -> new BadRequestException("Unsupported action key: " + actionKey));
    }

    private String validateMode(String preferredMode) {
        String normalized = preferredMode == null ? null : preferredMode.trim().toLowerCase(Locale.ROOT);
        if (normalized == null || normalized.isBlank() || !ALLOWED_MODES.contains(normalized)) {
            throw new BadRequestException("preferredMode must be one of observed, simulate, or forecast");
        }
        return normalized;
    }

    private String normalizeCountryCode(String countryCode) {
        if (countryCode == null || countryCode.isBlank()) {
            throw new BadRequestException("countryCode is required");
        }
        return countryCode.trim().toUpperCase(Locale.ROOT);
    }

    public record CreateWatchlistItemCommand(
            String countryCode,
            String actionKey,
            String preferredMode
    ) {
    }

    public record WatchlistView(
            String id,
            String countryCode,
            String countryCode3,
            String countryName,
            String actionKey,
            String actionLabel,
            String preferredMode,
            java.time.Instant createdAt
    ) {
    }
}
