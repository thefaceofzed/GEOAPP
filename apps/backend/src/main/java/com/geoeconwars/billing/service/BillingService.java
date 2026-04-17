package com.geoeconwars.billing.service;

import com.geoeconwars.auth.service.ActorContext;
import com.geoeconwars.auth.service.CurrentActorService;
import com.geoeconwars.billing.domain.Subscription;
import com.geoeconwars.billing.domain.SubscriptionRepository;
import com.geoeconwars.billing.domain.SubscriptionStatus;
import com.geoeconwars.shared.config.AppProperties;
import com.geoeconwars.shared.domain.PlanTier;
import com.geoeconwars.shared.domain.SubjectType;
import com.geoeconwars.shared.exception.BadRequestException;
import com.geoeconwars.shared.exception.NotFoundException;
import com.geoeconwars.shared.service.AuditService;
import com.geoeconwars.users.domain.User;
import com.geoeconwars.users.domain.UserRepository;
import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.StripeObject;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class BillingService {

    private final AppProperties properties;
    private final CurrentActorService currentActorService;
    private final UserRepository userRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final AuditService auditService;

    public BillingService(
            AppProperties properties,
            CurrentActorService currentActorService,
            UserRepository userRepository,
            SubscriptionRepository subscriptionRepository,
            AuditService auditService
    ) {
        this.properties = properties;
        this.currentActorService = currentActorService;
        this.userRepository = userRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.auditService = auditService;
    }

    @Transactional
    public CheckoutSessionView createCheckoutSession(ActorContext actor) {
        User user = currentActorService.requireUser(actor);
        if (!StringUtils.hasText(properties.stripe().secretKey()) || !StringUtils.hasText(properties.stripe().proPriceId())) {
            throw new BadRequestException("Stripe is not configured");
        }

        Stripe.apiKey = properties.stripe().secretKey();
        SessionCreateParams params = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
                .setSuccessUrl(properties.frontendUrl() + "/account?checkout=success")
                .setCancelUrl(properties.frontendUrl() + "/account?checkout=cancelled")
                .putMetadata("userId", user.getId().toString())
                .addLineItem(
                        SessionCreateParams.LineItem.builder()
                                .setQuantity(1L)
                                .setPrice(properties.stripe().proPriceId())
                                .build()
                )
                .build();
        try {
            Session session = Session.create(params);
            auditService.record("checkout_started", SubjectType.USER, user.getId(), Map.of("stripeSessionId", session.getId()));
            return new CheckoutSessionView(session.getId(), session.getUrl());
        } catch (StripeException exception) {
            throw new BadRequestException("Unable to create Stripe checkout session");
        }
    }

    @Transactional
    public WebhookResult handleWebhook(String payload, String signature) {
        if (!StringUtils.hasText(properties.stripe().webhookSecret())) {
            throw new BadRequestException("Stripe webhook secret is not configured");
        }

        Event event;
        try {
            event = Webhook.constructEvent(payload, signature, properties.stripe().webhookSecret());
        } catch (SignatureVerificationException exception) {
            throw new BadRequestException("Invalid Stripe webhook signature");
        }

        if (subscriptionRepository.existsByLastEventId(event.getId())) {
            return new WebhookResult(true, "ignored_duplicate");
        }

        return switch (event.getType()) {
            case "checkout.session.completed" -> handleCheckoutCompleted(event);
            case "customer.subscription.updated" -> handleSubscriptionUpdated(event);
            case "customer.subscription.deleted" -> handleSubscriptionDeleted(event);
            default -> new WebhookResult(true, "ignored_" + event.getType());
        };
    }

    private WebhookResult handleCheckoutCompleted(Event event) {
        StripeObject stripeObject = event.getDataObjectDeserializer().getObject().orElse(null);
        if (!(stripeObject instanceof Session session)) {
            return new WebhookResult(false, "missing_session");
        }
        String userId = session.getMetadata().get("userId");
        if (!StringUtils.hasText(userId)) {
            return new WebhookResult(false, "missing_user_id");
        }
        User user = userRepository.findById(UUID.fromString(userId))
                .orElseThrow(() -> new NotFoundException("User not found for webhook"));
        Subscription subscription = subscriptionRepository.findByUser(user).orElseGet(() -> {
            Subscription created = new Subscription();
            created.setUser(user);
            return created;
        });
        subscription.setStripeCustomerId(session.getCustomer());
        subscription.setStripeSubscriptionId(session.getSubscription());
        subscription.setStatus(SubscriptionStatus.ACTIVE);
        subscription.setLastEventId(event.getId());
        subscriptionRepository.save(subscription);
        user.setPlanTier(PlanTier.PRO);
        userRepository.save(user);
        auditService.record("subscription_activated", SubjectType.USER, user.getId(), Map.of("stripeSubscriptionId", session.getSubscription()));
        return new WebhookResult(true, "subscription_activated");
    }

    private WebhookResult handleSubscriptionUpdated(Event event) {
        Optional<com.stripe.model.Subscription> subscriptionOptional = event.getDataObjectDeserializer()
                .getObject()
                .filter(com.stripe.model.Subscription.class::isInstance)
                .map(com.stripe.model.Subscription.class::cast);
        if (subscriptionOptional.isEmpty()) {
            return new WebhookResult(false, "missing_subscription");
        }
        com.stripe.model.Subscription stripeSubscription = subscriptionOptional.get();
        Subscription subscription = subscriptionRepository.findByStripeSubscriptionId(stripeSubscription.getId())
                .orElseThrow(() -> new NotFoundException("Subscription record not found"));
        subscription.setStatus(mapStatus(stripeSubscription.getStatus()));
        subscription.setCurrentPeriodEnd(Instant.ofEpochSecond(stripeSubscription.getCurrentPeriodEnd()));
        subscription.setLastEventId(event.getId());
        subscriptionRepository.save(subscription);

        User user = subscription.getUser();
        user.setPlanTier(subscription.getStatus() == SubscriptionStatus.ACTIVE ? PlanTier.PRO : PlanTier.FREE);
        userRepository.save(user);
        return new WebhookResult(true, "subscription_updated");
    }

    private WebhookResult handleSubscriptionDeleted(Event event) {
        Optional<com.stripe.model.Subscription> subscriptionOptional = event.getDataObjectDeserializer()
                .getObject()
                .filter(com.stripe.model.Subscription.class::isInstance)
                .map(com.stripe.model.Subscription.class::cast);
        if (subscriptionOptional.isEmpty()) {
            return new WebhookResult(false, "missing_subscription");
        }
        com.stripe.model.Subscription stripeSubscription = subscriptionOptional.get();
        Subscription subscription = subscriptionRepository.findByStripeSubscriptionId(stripeSubscription.getId())
                .orElseThrow(() -> new NotFoundException("Subscription record not found"));
        subscription.setStatus(SubscriptionStatus.CANCELED);
        subscription.setLastEventId(event.getId());
        subscriptionRepository.save(subscription);

        User user = subscription.getUser();
        user.setPlanTier(PlanTier.FREE);
        userRepository.save(user);
        return new WebhookResult(true, "subscription_canceled");
    }

    private SubscriptionStatus mapStatus(String status) {
        return switch (status) {
            case "active", "trialing" -> SubscriptionStatus.ACTIVE;
            case "past_due", "unpaid" -> SubscriptionStatus.PAST_DUE;
            case "canceled", "incomplete_expired" -> SubscriptionStatus.CANCELED;
            default -> SubscriptionStatus.INACTIVE;
        };
    }

    public record CheckoutSessionView(
            String id,
            String url
    ) {
    }

    public record WebhookResult(
            boolean processed,
            String message
    ) {
    }
}
