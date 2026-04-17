package com.geoeconwars.auth.service;

import com.geoeconwars.auth.domain.GuestSession;
import com.geoeconwars.auth.domain.GuestSessionRepository;
import com.geoeconwars.shared.domain.PlanTier;
import com.geoeconwars.shared.domain.SubjectType;
import com.geoeconwars.shared.domain.UserRole;
import com.geoeconwars.shared.exception.ConflictException;
import com.geoeconwars.shared.exception.UnauthorizedException;
import com.geoeconwars.shared.security.TokenPayload;
import com.geoeconwars.shared.security.TokenService;
import com.geoeconwars.shared.service.AuditService;
import com.geoeconwars.simulations.service.QuotaService;
import com.geoeconwars.users.domain.User;
import com.geoeconwars.users.domain.UserRepository;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class AuthService {

    private final GuestSessionRepository guestSessionRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;
    private final QuotaService quotaService;
    private final AuditService auditService;

    public AuthService(
            GuestSessionRepository guestSessionRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            TokenService tokenService,
            QuotaService quotaService,
            AuditService auditService
    ) {
        this.guestSessionRepository = guestSessionRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
        this.quotaService = quotaService;
        this.auditService = auditService;
    }

    @Transactional
    public AuthSession createGuest() {
        GuestSession guestSession = new GuestSession();
        guestSession.setAnonymousToken("guest_" + UUID.randomUUID());
        guestSession.setSimulationsUsed(0);
        guestSession.setExpiresAt(Instant.now().plusSeconds(30L * 24L * 60L * 60L));
        guestSessionRepository.save(guestSession);
        auditService.record("guest_created", SubjectType.GUEST, guestSession.getId(), Map.of("anonymousToken", guestSession.getAnonymousToken()));
        return buildGuestSession(guestSession);
    }

    @Transactional
    public AuthSession register(String email, String password) {
        String normalizedEmail = email.toLowerCase();
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new ConflictException("An account already exists for this email address");
        }

        User user = new User();
        user.setEmail(normalizedEmail);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setPlanTier(PlanTier.FREE);
        user.setRole(UserRole.USER);
        userRepository.save(user);
        auditService.record("register_completed", SubjectType.USER, user.getId(), Map.of("email", user.getEmail()));
        return buildUserSession(user);
    }

    @Transactional(readOnly = true)
    public AuthSession login(String email, String password) {
        User user = userRepository.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid email or password");
        }
        return buildUserSession(user);
    }

    @Transactional(readOnly = true)
    public AuthSession refresh(String refreshToken) {
        if (!StringUtils.hasText(refreshToken)) {
            throw new UnauthorizedException("Refresh token is required");
        }

        TokenPayload payload;
        try {
            payload = tokenService.parseRefreshToken(refreshToken);
        } catch (RuntimeException exception) {
            throw new UnauthorizedException("Invalid refresh token");
        }

        if (payload.subjectType() == SubjectType.USER) {
            User user = userRepository.findById(payload.subjectId())
                    .orElseThrow(() -> new UnauthorizedException("User no longer exists"));
            return buildUserSession(user);
        }

        GuestSession guestSession = guestSessionRepository.findById(payload.subjectId())
                .orElseThrow(() -> new UnauthorizedException("Guest session no longer exists"));
        if (guestSession.getExpiresAt().isBefore(Instant.now())) {
            throw new UnauthorizedException("Guest session has expired");
        }
        return buildGuestSession(guestSession);
    }

    private AuthSession buildUserSession(User user) {
        QuotaService.QuotaStatus quota = quotaService.checkRemaining(new ActorContext(user.getId(), SubjectType.USER, user.getPlanTier(), user.getEmail(), user, null));
        String accessToken = tokenService.createAccessToken(user.getId(), SubjectType.USER, user.getPlanTier(), user.getEmail());
        String refreshToken = tokenService.createRefreshToken(user.getId(), SubjectType.USER, user.getPlanTier(), user.getEmail());
        return new AuthSession(accessToken, refreshToken, SubjectType.USER, user.getId(), user.getPlanTier(), user.getRole(), user.getEmail(), quota.remaining(), quota.unlimited());
    }

    private AuthSession buildGuestSession(GuestSession guestSession) {
        QuotaService.QuotaStatus quota = quotaService.checkRemaining(new ActorContext(guestSession.getId(), SubjectType.GUEST, PlanTier.GUEST, null, null, guestSession));
        String accessToken = tokenService.createAccessToken(guestSession.getId(), SubjectType.GUEST, PlanTier.GUEST, null);
        String refreshToken = tokenService.createRefreshToken(guestSession.getId(), SubjectType.GUEST, PlanTier.GUEST, null);
        return new AuthSession(accessToken, refreshToken, SubjectType.GUEST, guestSession.getId(), PlanTier.GUEST, null, null, quota.remaining(), quota.unlimited());
    }

    public record AuthSession(
            String accessToken,
            String refreshToken,
            SubjectType subjectType,
            UUID subjectId,
            PlanTier planTier,
            UserRole role,
            String email,
            Integer simulationsRemaining,
            boolean unlimited
    ) {
    }
}
