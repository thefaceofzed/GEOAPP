package com.geoeconwars.intelligence.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.geoeconwars.shared.config.AppProperties;
import com.geoeconwars.ingestion.support.IngestionTestFixtures;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;

class IntelligenceRequestRateLimiterTest {

    @Test
    void blocksRequestsAfterConfiguredWindowLimit() {
        AtomicLong now = new AtomicLong(1_000L);
        IntelligenceRequestRateLimiter limiter = new IntelligenceRequestRateLimiter(properties(2, 1_000L), now::get);

        assertThat(limiter.check("client-1").allowed()).isTrue();
        assertThat(limiter.check("client-1").allowed()).isTrue();

        IntelligenceRequestRateLimiter.RateLimitDecision decision = limiter.check("client-1");
        assertThat(decision.allowed()).isFalse();
        assertThat(decision.remaining()).isZero();
        assertThat(decision.retryAfterSeconds()).isGreaterThanOrEqualTo(1);
    }

    @Test
    void resetsCountersAfterWindowElapses() {
        AtomicLong now = new AtomicLong(1_000L);
        IntelligenceRequestRateLimiter limiter = new IntelligenceRequestRateLimiter(properties(1, 1_000L), now::get);

        assertThat(limiter.check("client-1").allowed()).isTrue();
        assertThat(limiter.check("client-1").allowed()).isFalse();

        now.addAndGet(1_001L);

        IntelligenceRequestRateLimiter.RateLimitDecision resetDecision = limiter.check("client-1");
        assertThat(resetDecision.allowed()).isTrue();
        assertThat(resetDecision.remaining()).isZero();
    }

    private AppProperties properties(int requestsPerWindow, long windowMs) {
        AppProperties base = IngestionTestFixtures.appProperties();
        return new AppProperties(
                base.frontendUrl(),
                base.baseUrl(),
                base.refreshCookieSecure(),
                base.rulesPath(),
                base.accessTokenMinutes(),
                base.refreshTokenDays(),
                base.allowedOrigins(),
                base.quota(),
                base.jwt(),
                base.stripe(),
                base.ingestion(),
                new AppProperties.Intelligence(
                        base.intelligence().enabled(),
                        base.intelligence().streamEnabled(),
                        base.intelligence().observedLimitDefault(),
                        base.intelligence().observedLimitMax(),
                        base.intelligence().forecastHorizonDaysDefault(),
                        base.intelligence().forecastHorizonDaysMax(),
                        base.intelligence().streamIntervalMs(),
                        base.intelligence().cacheTtlMs(),
                        base.intelligence().maxConcurrentStreams(),
                        base.intelligence().maxConcurrentStreamsPerClient(),
                        new AppProperties.Intelligence.RateLimit(true, requestsPerWindow, windowMs)
                )
        );
    }
}
