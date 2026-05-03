package com.geoeconwars.watchlist.service;

import com.geoeconwars.auth.service.ActorContext;
import com.geoeconwars.intelligence.service.IntelligenceModels;
import com.geoeconwars.intelligence.service.IntelligenceService;
import com.geoeconwars.rules.domain.RulesCatalog;
import com.geoeconwars.rules.service.RulesCatalogLoader;
import com.geoeconwars.shared.exception.BadRequestException;
import com.geoeconwars.watchlist.domain.WatchlistItem;
import com.geoeconwars.watchlist.domain.WatchlistItemRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WatchlistDigestService {

    private static final int DEFAULT_LIMIT = 6;
    private static final int DEFAULT_SIGNAL_LIMIT = 4;
    private static final int DEFAULT_HORIZON_DAYS = 14;

    private final WatchlistItemRepository watchlistItemRepository;
    private final RulesCatalogLoader rulesCatalogLoader;
    private final IntelligenceService intelligenceService;

    public WatchlistDigestService(
            WatchlistItemRepository watchlistItemRepository,
            RulesCatalogLoader rulesCatalogLoader,
            IntelligenceService intelligenceService
    ) {
        this.watchlistItemRepository = watchlistItemRepository;
        this.rulesCatalogLoader = rulesCatalogLoader;
        this.intelligenceService = intelligenceService;
    }

    @Transactional(readOnly = true)
    public WatchlistDigestView digest(
            ActorContext actor,
            Integer limit,
            Integer signalLimit,
            Integer horizonDays
    ) {
        RulesCatalog catalog = rulesCatalogLoader.activeCatalog();
        int resolvedLimit = clamp(limit, 1, 12, DEFAULT_LIMIT);
        int resolvedSignalLimit = clamp(signalLimit, 1, 10, DEFAULT_SIGNAL_LIMIT);
        int resolvedHorizonDays = clamp(horizonDays, 1, 60, DEFAULT_HORIZON_DAYS);

        List<WatchlistDigestItemView> items = watchlistItemRepository
                .findBySubjectTypeAndSubjectIdOrderByCreatedAtDesc(actor.subjectType(), actor.subjectId())
                .stream()
                .limit(resolvedLimit)
                .map(item -> buildItem(item, catalog, resolvedSignalLimit, resolvedHorizonDays))
                .sorted(this::compareItems)
                .toList();

        WatchlistDigestSummary summary = summarize(items);
        return new WatchlistDigestView(
                Instant.now(),
                items.size(),
                summary,
                buildBrief(summary, items),
                items
        );
    }

    private WatchlistDigestItemView buildItem(
            WatchlistItem item,
            RulesCatalog catalog,
            int signalLimit,
            int horizonDays
    ) {
        RulesCatalog.CountryRule country = catalog.findCountry(item.getCountryCode())
                .orElseThrow(() -> new BadRequestException("Country metadata missing for " + item.getCountryCode()));
        RulesCatalog.ActionRule action = catalog.findAction(item.getActionKey())
                .orElseThrow(() -> new BadRequestException("Action metadata missing for " + item.getActionKey()));

        IntelligenceModels.ObservedView observed = resolveObserved(item, signalLimit);
        IntelligenceModels.ForecastView forecast = resolveForecast(item, horizonDays);

        IntelligenceModels.ObservedSignal leadSignal = observed != null && !observed.signals().isEmpty()
                ? observed.signals().getFirst()
                : null;
        IntelligenceModels.ForecastDriver leadDriver = forecast != null && !forecast.drivers().isEmpty()
                ? forecast.drivers().getFirst()
                : null;

        BigDecimal riskScore = forecast != null ? forecast.riskScore() : null;
        int signalCount = observed != null ? observed.signalCount() : 0;
        String riskLabel = forecast != null
                ? forecast.riskLabel()
                : signalCount > 0
                        ? "Observed only"
                        : "No live reading";

        BigDecimal confidenceScore = forecast != null
                ? forecast.confidenceScore()
                : leadSignal != null
                        ? leadSignal.confidenceScore()
                        : null;
        String freshnessLabel = freshnessLabel(resolveFreshnessTimestamp(observed, forecast));
        String summary = forecast != null
                ? forecast.summary()
                : leadSignal != null
                        ? leadSignal.extractedSummary()
                        : "No strong live signal is currently mapped for this watched scenario.";
        String leadDriverLabel = leadDriver != null
                ? leadDriver.label()
                : leadSignal != null
                        ? leadSignal.sourceName()
                        : null;

        return new WatchlistDigestItemView(
                item.getId().toString(),
                country.countryCode(),
                country.countryCode3(),
                country.countryName(),
                item.getActionKey(),
                action.label(),
                item.getPreferredMode(),
                item.getCreatedAt(),
                alertState(riskScore, signalCount),
                riskLabel,
                scaleNullable(riskScore),
                signalCount,
                freshnessLabel,
                scaleNullable(confidenceScore),
                summary,
                leadDriverLabel
        );
    }

    private IntelligenceModels.ObservedView resolveObserved(WatchlistItem item, int signalLimit) {
        try {
            return intelligenceService.observedSignals(item.getCountryCode(), item.getActionKey(), signalLimit);
        } catch (BadRequestException exception) {
            return null;
        }
    }

    private IntelligenceModels.ForecastView resolveForecast(WatchlistItem item, int horizonDays) {
        try {
            return intelligenceService.forecast(item.getCountryCode(), item.getActionKey(), horizonDays);
        } catch (BadRequestException exception) {
            return null;
        }
    }

    private int compareItems(WatchlistDigestItemView left, WatchlistDigestItemView right) {
        int alertComparison = Integer.compare(alertRank(right.alertState()), alertRank(left.alertState()));
        if (alertComparison != 0) {
            return alertComparison;
        }

        int riskComparison = compareNullable(right.riskScore(), left.riskScore());
        if (riskComparison != 0) {
            return riskComparison;
        }

        int signalComparison = Integer.compare(right.signalCount(), left.signalCount());
        if (signalComparison != 0) {
            return signalComparison;
        }

        return Comparator.comparing(WatchlistDigestItemView::createdAt).reversed().compare(left, right);
    }

    private WatchlistDigestSummary summarize(List<WatchlistDigestItemView> items) {
        int attentionCount = 0;
        int watchCount = 0;
        int quietCount = 0;
        int coverageGapCount = 0;

        for (WatchlistDigestItemView item : items) {
            switch (item.alertState()) {
                case "attention" -> attentionCount++;
                case "watch" -> watchCount++;
                default -> quietCount++;
            }

            if (item.signalCount() == 0 && item.riskScore() == null) {
                coverageGapCount++;
            }
        }

        return new WatchlistDigestSummary(
                attentionCount,
                watchCount,
                quietCount,
                coverageGapCount
        );
    }

    private String buildBrief(WatchlistDigestSummary summary, List<WatchlistDigestItemView> items) {
        if (items.isEmpty()) {
            return "Watchlist briefing\nNo tracked items are saved yet.";
        }

        List<String> sections = items.stream()
                .map(item -> """
                        %s | %s
                        Alert: %s | Risk: %s%s | Signals: %d | Freshness: %s
                        Confidence: %s
                        Summary: %s
                        """.formatted(
                        item.countryName(),
                        item.actionLabel(),
                        item.alertState().toUpperCase(),
                        item.riskLabel(),
                        item.riskScore() != null
                                ? " (" + item.riskScore().setScale(0, RoundingMode.HALF_UP).toPlainString() + "/100)"
                                : "",
                        item.signalCount(),
                        item.freshnessLabel(),
                        item.confidenceScore() != null
                                ? item.confidenceScore().setScale(0, RoundingMode.HALF_UP).toPlainString() + "/100"
                                : "n/a",
                        item.summary()
                ))
                .toList();

        return """
                Watchlist briefing
                Attention: %d | Watch: %d | Quiet: %d | Coverage gaps: %d

                %s
                """.formatted(
                summary.attentionCount(),
                summary.watchCount(),
                summary.quietCount(),
                summary.coverageGapCount(),
                String.join("\n", sections)
        ).trim();
    }

    private int clamp(Integer value, int min, int max, int defaultValue) {
        int resolved = value == null ? defaultValue : value;
        return Math.min(Math.max(min, resolved), max);
    }

    private String alertState(BigDecimal riskScore, int signalCount) {
        if (riskScore != null && riskScore.compareTo(BigDecimal.valueOf(55)) >= 0) {
            return "attention";
        }
        if (signalCount >= 4) {
            return "attention";
        }
        if ((riskScore != null && riskScore.compareTo(BigDecimal.valueOf(30)) >= 0) || signalCount > 0) {
            return "watch";
        }
        return "quiet";
    }

    private int alertRank(String alertState) {
        return switch (alertState) {
            case "attention" -> 3;
            case "watch" -> 2;
            default -> 1;
        };
    }

    private BigDecimal scaleNullable(BigDecimal value) {
        return value == null ? null : value.setScale(2, RoundingMode.HALF_UP);
    }

    private int compareNullable(BigDecimal left, BigDecimal right) {
        if (left == null && right == null) {
            return 0;
        }
        if (left == null) {
            return -1;
        }
        if (right == null) {
            return 1;
        }
        return left.compareTo(right);
    }

    private Instant resolveFreshnessTimestamp(
            IntelligenceModels.ObservedView observed,
            IntelligenceModels.ForecastView forecast
    ) {
        if (observed != null && !observed.signals().isEmpty()) {
            return observed.signals().getFirst().publishedAt();
        }
        if (observed != null) {
            return observed.generatedAt();
        }
        if (forecast != null) {
            return forecast.generatedAt();
        }
        return null;
    }

    private String freshnessLabel(Instant value) {
        if (value == null) {
            return "Unknown freshness";
        }

        long ageHours = Math.max(0L, Duration.between(value, Instant.now()).toHours());
        if (ageHours <= 6) {
            return "Fresh";
        }
        if (ageHours <= 24) {
            return "Recent";
        }
        if (ageHours <= 72) {
            return "Aging";
        }
        return "Stale";
    }

    public record WatchlistDigestView(
            Instant generatedAt,
            int trackedCount,
            WatchlistDigestSummary summary,
            String brief,
            List<WatchlistDigestItemView> items
    ) {
    }

    public record WatchlistDigestSummary(
            int attentionCount,
            int watchCount,
            int quietCount,
            int coverageGapCount
    ) {
    }

    public record WatchlistDigestItemView(
            String id,
            String countryCode,
            String countryCode3,
            String countryName,
            String actionKey,
            String actionLabel,
            String preferredMode,
            Instant createdAt,
            String alertState,
            String riskLabel,
            BigDecimal riskScore,
            int signalCount,
            String freshnessLabel,
            BigDecimal confidenceScore,
            String summary,
            String leadDriverLabel
    ) {
    }
}
