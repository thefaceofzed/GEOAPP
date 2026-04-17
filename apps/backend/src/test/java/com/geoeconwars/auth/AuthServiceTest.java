package com.geoeconwars.auth;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.geoeconwars.auth.domain.GuestSessionRepository;
import com.geoeconwars.auth.service.AuthService;
import com.geoeconwars.shared.config.AppProperties;
import com.geoeconwars.shared.exception.ConflictException;
import com.geoeconwars.shared.exception.UnauthorizedException;
import com.geoeconwars.shared.security.TokenService;
import com.geoeconwars.shared.service.AuditService;
import com.geoeconwars.simulations.service.QuotaService;
import com.geoeconwars.ingestion.support.IngestionTestFixtures;
import com.geoeconwars.users.domain.User;
import com.geoeconwars.users.domain.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private GuestSessionRepository guestSessionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private QuotaService quotaService;

    @Mock
    private AuditService auditService;

    @Test
    void registerRejectsDuplicateEmails() {
        AuthService authService = new AuthService(
                guestSessionRepository,
                userRepository,
                passwordEncoder,
                new TokenService(properties()),
                quotaService,
                auditService
        );
        when(userRepository.existsByEmail("user@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register("user@example.com", "Password123"))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void loginRejectsInvalidPasswords() {
        AuthService authService = new AuthService(
                guestSessionRepository,
                userRepository,
                passwordEncoder,
                new TokenService(properties()),
                quotaService,
                auditService
        );
        User user = new User();
        user.setEmail("user@example.com");
        user.setPasswordHash("hash");
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "hash")).thenReturn(false);

        assertThatThrownBy(() -> authService.login("user@example.com", "wrong"))
                .isInstanceOf(UnauthorizedException.class);
    }

    private AppProperties properties() {
        return IngestionTestFixtures.appProperties();
    }
}
