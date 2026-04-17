package com.geoeconwars.billing.api;

import com.geoeconwars.auth.service.CurrentActorService;
import com.geoeconwars.billing.service.BillingService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/billing")
public class BillingController {

    private final CurrentActorService currentActorService;
    private final BillingService billingService;

    public BillingController(CurrentActorService currentActorService, BillingService billingService) {
        this.currentActorService = currentActorService;
        this.billingService = billingService;
    }

    @PostMapping("/checkout-session")
    public BillingService.CheckoutSessionView createCheckoutSession(Authentication authentication) {
        return billingService.createCheckoutSession(currentActorService.require(authentication));
    }

    @PostMapping("/webhook")
    public ResponseEntity<BillingService.WebhookResult> webhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String stripeSignature
    ) {
        return ResponseEntity.ok(billingService.handleWebhook(payload, stripeSignature));
    }
}
