package com.geoeconwars.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.geoeconwars.ingestion.support.IngestionTestFixtures;
import com.geoeconwars.shared.config.AppProperties;
import com.geoeconwars.shared.domain.PlanTier;
import com.geoeconwars.shared.domain.SubjectType;
import com.geoeconwars.shared.security.TokenService;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class TokenServiceTest {

    @Test
    void createsAndParsesAccessTokens() {
        TokenService tokenService = new TokenService(properties());
        UUID userId = UUID.randomUUID();

        String token = tokenService.createAccessToken(userId, SubjectType.USER, PlanTier.FREE, "user@example.com");
        var payload = tokenService.parseAccessToken(token);

        assertThat(payload.subjectId()).isEqualTo(userId);
        assertThat(payload.planTier()).isEqualTo(PlanTier.FREE);
        assertThat(payload.email()).isEqualTo("user@example.com");
    }

    private AppProperties properties() {
        return IngestionTestFixtures.appProperties();
    }
}
