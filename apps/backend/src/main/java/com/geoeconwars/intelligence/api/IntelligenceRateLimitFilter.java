package com.geoeconwars.intelligence.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.geoeconwars.intelligence.service.IntelligenceRequestRateLimiter;
import com.geoeconwars.shared.config.AppProperties;
import com.geoeconwars.shared.exception.ApiError;
import com.geoeconwars.shared.web.ClientAddressResolver;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class IntelligenceRateLimitFilter extends OncePerRequestFilter {

    private final IntelligenceRequestRateLimiter rateLimiter;
    private final ClientAddressResolver clientAddressResolver;
    private final ObjectMapper objectMapper;
    private final AppProperties properties;

    public IntelligenceRateLimitFilter(
            IntelligenceRequestRateLimiter rateLimiter,
            ClientAddressResolver clientAddressResolver,
            ObjectMapper objectMapper,
            AppProperties properties
    ) {
        this.rateLimiter = rateLimiter;
        this.clientAddressResolver = clientAddressResolver;
        this.objectMapper = objectMapper;
        this.properties = properties;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/intelligence/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        AppProperties.Intelligence.RateLimit rateLimit = properties.intelligence().rateLimit();
        if (rateLimit == null || !rateLimit.enabled()) {
            filterChain.doFilter(request, response);
            return;
        }

        IntelligenceRequestRateLimiter.RateLimitDecision decision =
                rateLimiter.check(clientAddressResolver.resolve(request));

        response.setHeader("X-RateLimit-Limit", String.valueOf(rateLimit.requestsPerWindow()));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(decision.remaining()));

        if (decision.allowed()) {
            filterChain.doFilter(request, response);
            return;
        }

        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Retry-After", String.valueOf(Math.max(1, decision.retryAfterSeconds())));
        objectMapper.writeValue(response.getWriter(), new ApiError(
                Instant.now(),
                HttpStatus.TOO_MANY_REQUESTS.value(),
                HttpStatus.TOO_MANY_REQUESTS.getReasonPhrase(),
                "Intelligence request rate limit exceeded",
                request.getRequestURI(),
                java.util.Map.of()
        ));
    }
}
