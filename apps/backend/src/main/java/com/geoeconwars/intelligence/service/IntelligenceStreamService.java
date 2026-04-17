package com.geoeconwars.intelligence.service;

import com.geoeconwars.ingestion.service.SignalsRefreshedEvent;
import com.geoeconwars.shared.config.AppProperties;
import com.geoeconwars.shared.exception.BadRequestException;
import com.geoeconwars.shared.exception.TooManyRequestsException;
import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.ConcurrentMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
public class IntelligenceStreamService {

    private static final long EMITTER_TIMEOUT_MS = 0L;

    private final Logger logger = LoggerFactory.getLogger(getClass());

    private final IntelligenceService intelligenceService;
    private final ThreadPoolTaskScheduler intelligenceTaskScheduler;
    private final AppProperties properties;
    private final ConcurrentMap<String, Subscription> subscriptions = new java.util.concurrent.ConcurrentHashMap<>();
    private final AtomicReference<Instant> lastBroadcastAt = new AtomicReference<>();

    public IntelligenceStreamService(
            IntelligenceService intelligenceService,
            ThreadPoolTaskScheduler intelligenceTaskScheduler,
            AppProperties properties
    ) {
        this.intelligenceService = intelligenceService;
        this.intelligenceTaskScheduler = intelligenceTaskScheduler;
        this.properties = properties;
    }

    public SseEmitter subscribe(String countryCode, String actionKey, String clientKey) {
        if (!properties.intelligence().enabled() || !properties.intelligence().streamEnabled()) {
            throw new BadRequestException("Intelligence streaming is disabled");
        }
        ensureCapacity(clientKey);

        String subscriptionId = UUID.randomUUID().toString();
        SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT_MS);
        Subscription subscription = new Subscription(subscriptionId, emitter, countryCode, actionKey, clientKey, null);
        subscriptions.put(subscriptionId, subscription);

        emitter.onCompletion(() -> unsubscribe(subscriptionId));
        emitter.onTimeout(() -> {
            unsubscribe(subscriptionId);
            emitter.complete();
        });
        emitter.onError(error -> {
            logger.debug("Intelligence SSE emitter errored for {} / {}: {}", countryCode, actionKey, error.getMessage());
            unsubscribe(subscriptionId);
        });

        pushSnapshot(subscription);
        var future = intelligenceTaskScheduler.scheduleAtFixedRate(
                () -> pushSnapshot(subscription),
                Duration.ofMillis(properties.intelligence().streamIntervalMs())
        );
        subscriptions.computeIfPresent(subscriptionId, (key, existing) -> existing.withFuture(future));
        return emitter;
    }

    public StreamRuntimeStatus streamStatus() {
        return new StreamRuntimeStatus(
                subscriptions.size(),
                subscriptions.values().stream().map(Subscription::clientKey).distinct().count(),
                properties.intelligence().maxConcurrentStreams(),
                properties.intelligence().maxConcurrentStreamsPerClient(),
                properties.intelligence().streamIntervalMs(),
                lastBroadcastAt.get()
        );
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onSignalsRefreshed(SignalsRefreshedEvent event) {
        if (!event.hasMutations()) {
            return;
        }
        subscriptions.values().forEach(this::pushSnapshot);
    }

    private void pushSnapshot(Subscription subscription) {
        try {
            IntelligenceModels.ObservedView observed =
                    intelligenceService.observedSignals(subscription.countryCode(), subscription.actionKey(), null);
            IntelligenceModels.ForecastView forecast =
                    intelligenceService.forecast(subscription.countryCode(), subscription.actionKey(), null);
            subscription.emitter().send(SseEmitter.event().name("observed").data(observed));
            subscription.emitter().send(SseEmitter.event().name("forecast").data(forecast));
            subscription.emitter().send(SseEmitter.event().name("heartbeat").data(Map.of("generatedAt", Instant.now().toString())));
            lastBroadcastAt.set(Instant.now());
        } catch (IOException exception) {
            subscription.emitter().completeWithError(exception);
        } catch (RuntimeException exception) {
            logger.warn(
                    "Failed to push intelligence snapshot for {} / {}: {}",
                    subscription.countryCode(),
                    subscription.actionKey(),
                    exception.getMessage()
            );
            subscription.emitter().completeWithError(exception);
        }
    }

    private void unsubscribe(String subscriptionId) {
        Subscription subscription = subscriptions.remove(subscriptionId);
        if (subscription != null && subscription.future() != null) {
            subscription.future().cancel(true);
        }
    }

    private void ensureCapacity(String clientKey) {
        if (subscriptions.size() >= properties.intelligence().maxConcurrentStreams()) {
            throw new TooManyRequestsException("Intelligence streaming capacity is currently exhausted");
        }

        long clientSubscriptions = subscriptions.values().stream()
                .filter(subscription -> subscription.clientKey().equals(clientKey))
                .count();
        if (clientSubscriptions >= properties.intelligence().maxConcurrentStreamsPerClient()) {
            throw new TooManyRequestsException("Too many active intelligence streams for this client");
        }
    }

    private record Subscription(
            String id,
            SseEmitter emitter,
            String countryCode,
            String actionKey,
            String clientKey,
            java.util.concurrent.ScheduledFuture<?> future
    ) {
        private Subscription withFuture(java.util.concurrent.ScheduledFuture<?> scheduledFuture) {
            return new Subscription(id, emitter, countryCode, actionKey, clientKey, scheduledFuture);
        }
    }

    public record StreamRuntimeStatus(
            int activeSubscriptions,
            long activeClients,
            int maxConcurrentStreams,
            int maxConcurrentStreamsPerClient,
            long streamIntervalMs,
            Instant lastBroadcastAt
    ) {
    }
}
