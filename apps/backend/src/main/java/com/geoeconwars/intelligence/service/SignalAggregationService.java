package com.geoeconwars.intelligence.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.geoeconwars.ingestion.domain.IngestedSignal;
import com.geoeconwars.ingestion.domain.IngestedSignalRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class SignalAggregationService {

    private static final Duration SIGNAL_WINDOW = Duration.ofDays(30);
    private static final long CACHE_TTL_MS = 300_000; // 5 minutes

    private static final Map<String, double[]> COUNTRY_CENTROIDS = Map.ofEntries(
        Map.entry("US", new double[]{39.8283, -98.5795}),
        Map.entry("RU", new double[]{61.5240, 105.3188}),
        Map.entry("CN", new double[]{35.8617, 104.1954}),
        Map.entry("UA", new double[]{48.3794, 31.1656}),
        Map.entry("IR", new double[]{32.4279, 53.6880}),
        Map.entry("IL", new double[]{31.0461, 34.8516}),
        Map.entry("TW", new double[]{23.6978, 120.9605}),
        Map.entry("KP", new double[]{40.3399, 127.5101}),
        Map.entry("SA", new double[]{23.8859, 45.0792}),
        Map.entry("TR", new double[]{38.9637, 35.2433}),
        Map.entry("PL", new double[]{51.9194, 19.1451}),
        Map.entry("DE", new double[]{51.1657, 10.4515}),
        Map.entry("FR", new double[]{46.6034, 1.8883}),
        Map.entry("GB", new double[]{55.3781, -3.4360}),
        Map.entry("IN", new double[]{20.5937, 78.9629}),
        Map.entry("PK", new double[]{30.3753, 69.3451}),
        Map.entry("SY", new double[]{34.8021, 38.9968}),
        Map.entry("YE", new double[]{15.5527, 48.5164}),
        Map.entry("MM", new double[]{21.9162, 95.9560}),
        Map.entry("VE", new double[]{6.4238, -66.5897}),
        Map.entry("CU", new double[]{21.5218, -77.7812}),
        Map.entry("MX", new double[]{23.6345, -102.5528}),
        Map.entry("BR", new double[]{-14.2350, -51.9253}),
        Map.entry("AE", new double[]{23.4241, 53.8478}),
        Map.entry("JP", new double[]{36.2048, 138.2529}),
        Map.entry("KR", new double[]{35.9078, 127.7669}),
        Map.entry("AU", new double[]{-25.2744, 133.7751}),
        Map.entry("NG", new double[]{9.0820, 8.6753}),
        Map.entry("ZA", new double[]{-30.5595, 22.9375}),
        Map.entry("EG", new double[]{26.8206, 30.8025}),
        Map.entry("AR", new double[]{-38.4161, -63.6167}),
        Map.entry("CO", new double[]{4.5709, -74.2973}),
        Map.entry("IQ", new double[]{33.2232, 43.6793}),
        Map.entry("AF", new double[]{33.9391, 67.7100}),
        Map.entry("LY", new double[]{26.3351, 17.2283}),
        Map.entry("SD", new double[]{12.8628, 30.2176})
    );
    private static final double[] DEFAULT_CENTROID = {0.0, 0.0};

    private final IngestedSignalRepository signalRepository;
    private final ObjectMapper objectMapper;
    private final ConcurrentHashMap<String, CachedSignals> cache = new ConcurrentHashMap<>();

    public SignalAggregationService(IngestedSignalRepository signalRepository, ObjectMapper objectMapper) {
        this.signalRepository = signalRepository;
        this.objectMapper = objectMapper;
    }

    public List<GeoSignal> getSignalsForCountry(String countryCode) {
        return getSignalsByCountry().getOrDefault(countryCode.toUpperCase(), List.of());
    }

    public Map<String, List<GeoSignal>> getSignalsByCountry() {
        CachedSignals cached = cache.get("all");
        Instant now = Instant.now();
        if (cached != null && now.isBefore(cached.expiresAt)) {
            return cached.data;
        }

        Instant cutoff = now.minus(SIGNAL_WINDOW);
        List<IngestedSignal> raw = signalRepository.findTop200ByPublishedAtAfterOrderByPublishedAtDesc(cutoff);

        Map<String, List<GeoSignal>> grouped = new HashMap<>();
        for (IngestedSignal signal : raw) {
            GeoSignal geo = toGeoSignal(signal);
            for (String code : parseCountryCodes(signal.getCountryCodesJson())) {
                grouped.computeIfAbsent(code.toUpperCase(), k -> new ArrayList<>()).add(geo);
            }
        }

        cache.put("all", new CachedSignals(grouped, now.plusMillis(CACHE_TTL_MS)));
        return grouped;
    }

    public List<GeoSignal> getRecentSignals(int hours) {
        Instant cutoff = Instant.now().minus(Duration.ofHours(hours));
        List<IngestedSignal> raw = signalRepository.findTop200ByPublishedAtAfterOrderByPublishedAtDesc(cutoff);
        return raw.stream().map(this::toGeoSignal).toList();
    }

    public void invalidateCache() {
        cache.clear();
    }

    private GeoSignal toGeoSignal(IngestedSignal signal) {
        List<String> countryCodes = parseCountryCodes(signal.getCountryCodesJson());
        String primaryCountry = countryCodes.isEmpty() ? "XX" : countryCodes.getFirst().toUpperCase();
        double[] centroid = COUNTRY_CENTROIDS.getOrDefault(primaryCountry, DEFAULT_CENTROID);

        String sourceType = mapSourceType(signal.getSignalType().name());
        double severity = signal.getSeverityScore().doubleValue();

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("sourceName", signal.getSourceName());
        metadata.put("sentiment", signal.getSentiment().value());
        metadata.put("signalType", signal.getSignalType().value());
        metadata.put("url", signal.getUrl());
        metadata.put("countryCodes", countryCodes);

        return new GeoSignal(
            signal.getId() != null ? signal.getId().toString() : signal.getRawReferenceId(),
            sourceType,
            primaryCountry,
            centroid[0],
            centroid[1],
            GeoSignal.severityFromScore(severity),
            severity,
            signal.getExtractedSummary(),
            signal.getPublishedAt(),
            parseTopicTags(signal.getTopicTagsJson()),
            metadata
        );
    }

    private String mapSourceType(String signalTypeName) {
        return switch (signalTypeName) {
            case "NEWS_HEADLINE" -> "NEWS";
            case "COMMODITY_PRICE" -> "COMMODITY_MOVE";
            case "FX_RATE" -> "FX_MOVE";
            case "SANCTIONS_SIGNAL" -> "SANCTIONS_CHANGE";
            case "MACRO_EVENT" -> "MACRO_RELEASE";
            case "TRADE_EXPOSURE" -> "TRADE_FLOW";
            case "CONFLICT_SIGNAL" -> "CONFLICT_EVENT";
            default -> signalTypeName;
        };
    }

    private List<String> parseCountryCodes(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private List<String> parseTopicTags(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private record CachedSignals(Map<String, List<GeoSignal>> data, Instant expiresAt) {}
}
