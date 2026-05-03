package com.geoeconwars.watchlist.service;

import com.geoeconwars.intelligence.service.CiiModels;
import com.geoeconwars.intelligence.service.CiiScoringService;
import com.geoeconwars.intelligence.service.CorrelationEngine;
import com.geoeconwars.intelligence.service.AnomalyDetector;
import com.geoeconwars.watchlist.domain.WatchlistItem;
import com.geoeconwars.watchlist.domain.WatchlistItemRepository;
import com.geoeconwars.shared.domain.SubjectType;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SmartAlertEngine {

    private static final double CII_ATTENTION_THRESHOLD = 55.0;
    private static final double CII_CRITICAL_THRESHOLD = 75.0;
    private static final Duration COOLDOWN_SAME_TYPE = Duration.ofHours(6);
    private static final Duration COOLDOWN_SAME_COUNTRY = Duration.ofMinutes(30);
    private static final int MAX_ALERTS_PER_BATCH = 20;

    private final WatchlistItemRepository watchlistItemRepository;
    private final CiiScoringService ciiScoringService;
    private final CorrelationEngine correlationEngine;
    private final AnomalyDetector anomalyDetector;
    private final ConcurrentHashMap<String, Instant> cooldowns = new ConcurrentHashMap<>();

    public SmartAlertEngine(
            WatchlistItemRepository watchlistItemRepository,
            CiiScoringService ciiScoringService,
            CorrelationEngine correlationEngine,
            AnomalyDetector anomalyDetector
    ) {
        this.watchlistItemRepository = watchlistItemRepository;
        this.ciiScoringService = ciiScoringService;
        this.correlationEngine = correlationEngine;
        this.anomalyDetector = anomalyDetector;
    }

    @Transactional(readOnly = true)
    public AlertBatch generateAlerts(SubjectType subjectType, UUID subjectId) {
        List<WatchlistItem> items = watchlistItemRepository
                .findBySubjectTypeAndSubjectIdOrderByCreatedAtDesc(subjectType, subjectId);

        List<SmartAlert> alerts = new ArrayList<>();
        Instant now = Instant.now();

        for (WatchlistItem item : items) {
            alerts.addAll(checkCiiThresholds(item, now));
            alerts.addAll(checkCorrelationTriggers(item, now));
            alerts.addAll(checkAnomalyTriggers(item, now));
        }

        alerts.sort((a, b) -> {
            int severityCompare = severityRank(b.severity) - severityRank(a.severity);
            if (severityCompare != 0) return severityCompare;
            return b.detectedAt.compareTo(a.detectedAt);
        });

        List<SmartAlert> deduped = applyAntiNoise(alerts, now);
        List<SmartAlert> limited = deduped.size() > MAX_ALERTS_PER_BATCH
                ? deduped.subList(0, MAX_ALERTS_PER_BATCH) : deduped;

        return new AlertBatch(
                now,
                items.size(),
                limited.size(),
                limited
        );
    }

    private List<SmartAlert> checkCiiThresholds(WatchlistItem item, Instant now) {
        List<SmartAlert> alerts = new ArrayList<>();
        try {
            CiiModels.CiiScore score = ciiScoringService.computeScore(item.getCountryCode());
            if (score.combinedScore() >= CII_CRITICAL_THRESHOLD) {
                alerts.add(new SmartAlert(
                        UUID.randomUUID().toString(),
                        "CII_CRITICAL",
                        "critical",
                        item.getCountryCode(),
                        item.getActionKey(),
                        "CII for %s has reached critical level: %.0f/100 (trend: %s)"
                                .formatted(score.countryName(), score.combinedScore(), score.trend()),
                        score.combinedScore(),
                        now
                ));
            } else if (score.combinedScore() >= CII_ATTENTION_THRESHOLD) {
                alerts.add(new SmartAlert(
                        UUID.randomUUID().toString(),
                        "CII_ATTENTION",
                        "high",
                        item.getCountryCode(),
                        item.getActionKey(),
                        "CII for %s requires attention: %.0f/100 (trend: %s)"
                                .formatted(score.countryName(), score.combinedScore(), score.trend()),
                        score.combinedScore(),
                        now
                ));
            }

            if ("rising".equals(score.trend()) && score.combinedScore() >= 40) {
                alerts.add(new SmartAlert(
                        UUID.randomUUID().toString(),
                        "CII_TREND_RISING",
                        "medium",
                        item.getCountryCode(),
                        item.getActionKey(),
                        "CII trend rising for %s: %.0f/100 and accelerating"
                                .formatted(score.countryName(), score.combinedScore()),
                        score.combinedScore(),
                        now
                ));
            }
        } catch (Exception ignored) {
        }
        return alerts;
    }

    private List<SmartAlert> checkCorrelationTriggers(WatchlistItem item, Instant now) {
        List<SmartAlert> alerts = new ArrayList<>();
        try {
            List<CiiModels.CorrelationAlert> correlations = correlationEngine.detectCorrelations();
            for (CiiModels.CorrelationAlert corr : correlations) {
                if (corr.countries().contains(item.getCountryCode())) {
                    alerts.add(new SmartAlert(
                            UUID.randomUUID().toString(),
                            "CORRELATION_" + corr.type(),
                            mapCorrelationSeverity(corr.severity()),
                            item.getCountryCode(),
                            item.getActionKey(),
                            "Cross-stream %s detected involving watched country %s: %s"
                                    .formatted(corr.type().toLowerCase().replace("_", " "),
                                            item.getCountryCode(), corr.summary()),
                            corr.confidence() * 100,
                            now
                    ));
                }
            }
        } catch (Exception ignored) {
        }
        return alerts;
    }

    private List<SmartAlert> checkAnomalyTriggers(WatchlistItem item, Instant now) {
        List<SmartAlert> alerts = new ArrayList<>();
        try {
            List<CiiModels.AnomalyResult> anomalies = anomalyDetector.detectAnomalies();
            for (CiiModels.AnomalyResult anomaly : anomalies) {
                if (anomaly.countryCode().equals(item.getCountryCode())) {
                    alerts.add(new SmartAlert(
                            UUID.randomUUID().toString(),
                            "ANOMALY_" + anomaly.signalType(),
                            mapAnomalySeverity(anomaly.severity()),
                            item.getCountryCode(),
                            item.getActionKey(),
                            "Anomaly detected in %s for %s: z-score %.1f (value: %.1f vs mean: %.1f)"
                                    .formatted(anomaly.signalType(), item.getCountryCode(),
                                            anomaly.zScore(), anomaly.currentValue(), anomaly.mean()),
                            Math.abs(anomaly.zScore()) * 20,
                            now
                    ));
                }
            }
        } catch (Exception ignored) {
        }
        return alerts;
    }

    private List<SmartAlert> applyAntiNoise(List<SmartAlert> alerts, Instant now) {
        List<SmartAlert> filtered = new ArrayList<>();
        for (SmartAlert alert : alerts) {
            String typeKey = alert.countryCode + ":" + alert.type;
            String countryKey = alert.countryCode + ":any";

            Instant typeLastFired = cooldowns.get(typeKey);
            Instant countryLastFired = cooldowns.get(countryKey);

            boolean typeCooled = typeLastFired == null ||
                    Duration.between(typeLastFired, now).compareTo(COOLDOWN_SAME_TYPE) > 0;
            boolean countryCooled = countryLastFired == null ||
                    Duration.between(countryLastFired, now).compareTo(COOLDOWN_SAME_COUNTRY) > 0;

            if (typeCooled && countryCooled) {
                filtered.add(alert);
                cooldowns.put(typeKey, now);
                cooldowns.put(countryKey, now);
            }
        }

        evictExpiredCooldowns(now);
        return filtered;
    }

    private void evictExpiredCooldowns(Instant now) {
        cooldowns.entrySet().removeIf(entry ->
                Duration.between(entry.getValue(), now).compareTo(COOLDOWN_SAME_TYPE.multipliedBy(2)) > 0);
    }

    private String mapCorrelationSeverity(String correlationSeverity) {
        return switch (correlationSeverity) {
            case "CRITICAL" -> "critical";
            case "HIGH" -> "high";
            case "MEDIUM" -> "medium";
            default -> "low";
        };
    }

    private String mapAnomalySeverity(String anomalySeverity) {
        return switch (anomalySeverity) {
            case "HIGH" -> "high";
            case "MEDIUM" -> "medium";
            default -> "low";
        };
    }

    private int severityRank(String severity) {
        return switch (severity) {
            case "critical" -> 4;
            case "high" -> 3;
            case "medium" -> 2;
            case "low" -> 1;
            default -> 0;
        };
    }

    public record SmartAlert(
            String id,
            String type,
            String severity,
            String countryCode,
            String actionKey,
            String message,
            double score,
            Instant detectedAt
    ) {
    }

    public record AlertBatch(
            Instant generatedAt,
            int watchedCount,
            int alertCount,
            List<SmartAlert> alerts
    ) {
    }
}
