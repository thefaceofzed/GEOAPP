package com.geoeconwars.shared.config;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        @NotBlank String frontendUrl,
        @NotBlank String baseUrl,
        boolean refreshCookieSecure,
        @NotBlank String rulesPath,
        @Min(5) int accessTokenMinutes,
        @Min(1) int refreshTokenDays,
        @NotEmpty List<String> allowedOrigins,
        Quota quota,
        Jwt jwt,
        Stripe stripe,
        Ingestion ingestion,
        Intelligence intelligence
) {

    public record Quota(
            @Min(1) int guestLifetimeLimit,
            @Min(1) int freeDailyLimit
    ) {
    }

    public record Jwt(
            @NotBlank String accessSecret,
            @NotBlank String refreshSecret
    ) {
    }

    public record Stripe(
            String secretKey,
            String webhookSecret,
            String proPriceId
    ) {
    }

    public record Ingestion(
            boolean enabled,
            boolean scheduleEnabled,
            boolean bootstrapOnStartup,
            @Min(1) int maxSignalsPerSource,
            @Min(120) int maxSummaryLength,
            @Min(60000) long refreshIntervalMs,
            @NotBlank String userAgent,
            Source news,
            Source commodities,
            Source fx,
            Source sanctions,
            Source macro,
            Source trade
    ) {
        public record Source(
                boolean enabled,
                @NotBlank String baseUrl,
                String apiKey
        ) {
        }
    }

    public record Intelligence(
            boolean enabled,
            boolean streamEnabled,
            @Min(1) int observedLimitDefault,
            @Min(1) int observedLimitMax,
            @Min(1) int forecastHorizonDaysDefault,
            @Min(1) int forecastHorizonDaysMax,
            @Min(1000) long streamIntervalMs,
            @Min(1000) long cacheTtlMs,
            @Min(1) int maxConcurrentStreams,
            @Min(1) int maxConcurrentStreamsPerClient,
            RateLimit rateLimit
    ) {
        public record RateLimit(
                boolean enabled,
                @Min(1) int requestsPerWindow,
                @Min(1000) long windowMs
        ) {
        }
    }
}
