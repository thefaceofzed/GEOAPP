package com.geoeconwars.intelligence.service;

import com.geoeconwars.shared.config.AppProperties;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.function.LongSupplier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class IntelligenceRequestRateLimiter {

    private final ConcurrentMap<String, WindowState> windows = new ConcurrentHashMap<>();
    private final AppProperties properties;
    private final LongSupplier currentTimeSupplier;

    @Autowired
    public IntelligenceRequestRateLimiter(AppProperties properties) {
        this(properties, System::currentTimeMillis);
    }

    IntelligenceRequestRateLimiter(AppProperties properties, LongSupplier currentTimeSupplier) {
        this.properties = properties;
        this.currentTimeSupplier = currentTimeSupplier;
    }

    public RateLimitDecision check(String clientKey) {
        AppProperties.Intelligence.RateLimit rateLimit = properties.intelligence().rateLimit();
        if (rateLimit == null || !rateLimit.enabled()) {
            return new RateLimitDecision(true, Integer.MAX_VALUE, 0);
        }

        long now = currentTimeSupplier.getAsLong();
        WindowState updated = windows.compute(clientKey, (key, existing) -> {
            if (existing == null || now - existing.windowStartedAtMs() >= rateLimit.windowMs()) {
                return new WindowState(now, 1);
            }
            return new WindowState(existing.windowStartedAtMs(), existing.requestCount() + 1);
        });

        boolean allowed = updated.requestCount() <= rateLimit.requestsPerWindow();
        int remaining = Math.max(0, rateLimit.requestsPerWindow() - updated.requestCount());
        long retryAfterMs = allowed ? 0 : Math.max(0, rateLimit.windowMs() - (now - updated.windowStartedAtMs()));
        return new RateLimitDecision(allowed, remaining, retryAfterMs / 1000L);
    }

    record WindowState(long windowStartedAtMs, int requestCount) {
    }

    public record RateLimitDecision(
            boolean allowed,
            int remaining,
            long retryAfterSeconds
    ) {
    }
}
