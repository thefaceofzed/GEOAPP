package com.geoeconwars.billing;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.geoeconwars.auth.service.CurrentActorService;
import com.geoeconwars.billing.domain.SubscriptionRepository;
import com.geoeconwars.billing.service.BillingService;
import com.geoeconwars.ingestion.support.IngestionTestFixtures;
import com.geoeconwars.shared.config.AppProperties;
import com.geoeconwars.shared.exception.BadRequestException;
import com.geoeconwars.shared.service.AuditService;
import com.geoeconwars.users.domain.UserRepository;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class BillingServiceTest {

    @Test
    void rejectsWebhookHandlingWhenStripeIsNotConfigured() {
        BillingService billingService = new BillingService(
                IngestionTestFixtures.appProperties(),
                Mockito.mock(CurrentActorService.class),
                Mockito.mock(UserRepository.class),
                Mockito.mock(SubscriptionRepository.class),
                Mockito.mock(AuditService.class)
        );

        assertThatThrownBy(() -> billingService.handleWebhook("{}", "sig"))
                .isInstanceOf(BadRequestException.class);
    }
}
