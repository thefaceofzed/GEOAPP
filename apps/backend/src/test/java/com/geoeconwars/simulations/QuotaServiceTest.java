package com.geoeconwars.simulations;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.geoeconwars.auth.domain.GuestSession;
import com.geoeconwars.auth.domain.GuestSessionRepository;
import com.geoeconwars.auth.service.ActorContext;
import com.geoeconwars.ingestion.support.IngestionTestFixtures;
import com.geoeconwars.shared.config.AppProperties;
import com.geoeconwars.shared.domain.PlanTier;
import com.geoeconwars.shared.domain.SubjectType;
import com.geoeconwars.shared.exception.ForbiddenException;
import com.geoeconwars.simulations.domain.DailyUsageRepository;
import com.geoeconwars.simulations.service.QuotaService;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class QuotaServiceTest {

    @Mock
    private GuestSessionRepository guestSessionRepository;

    @Mock
    private DailyUsageRepository dailyUsageRepository;

    @Test
    void calculatesGuestRemainingQuota() {
        QuotaService quotaService = new QuotaService(properties(), guestSessionRepository, dailyUsageRepository);
        GuestSession guestSession = new GuestSession();
        guestSession.setAnonymousToken("guest");
        guestSession.setSimulationsUsed(1);
        guestSession.setExpiresAt(Instant.now().plusSeconds(60));

        QuotaService.QuotaStatus status = quotaService.checkRemaining(new ActorContext(
                UUID.randomUUID(),
                SubjectType.GUEST,
                PlanTier.GUEST,
                null,
                null,
                guestSession
        ));

        assertThat(status.remaining()).isEqualTo(2);
        assertThat(status.unlimited()).isFalse();
    }

    @Test
    void blocksGuestsWhenQuotaIsExhausted() {
        QuotaService quotaService = new QuotaService(properties(), guestSessionRepository, dailyUsageRepository);
        GuestSession guestSession = new GuestSession();
        guestSession.setAnonymousToken("guest");
        guestSession.setSimulationsUsed(3);
        guestSession.setExpiresAt(Instant.now().plusSeconds(60));

        assertThatThrownBy(() -> quotaService.consume(new ActorContext(
                UUID.randomUUID(),
                SubjectType.GUEST,
                PlanTier.GUEST,
                null,
                null,
                guestSession
        ))).isInstanceOf(ForbiddenException.class);
    }

    private AppProperties properties() {
        return IngestionTestFixtures.appProperties();
    }
}
