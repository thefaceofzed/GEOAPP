package com.geoeconwars.auth.service;

import com.geoeconwars.auth.domain.GuestSession;
import com.geoeconwars.auth.domain.GuestSessionRepository;
import com.geoeconwars.shared.domain.PlanTier;
import com.geoeconwars.shared.domain.SubjectType;
import com.geoeconwars.shared.domain.UserRole;
import com.geoeconwars.shared.exception.ForbiddenException;
import com.geoeconwars.shared.exception.NotFoundException;
import com.geoeconwars.shared.exception.UnauthorizedException;
import com.geoeconwars.shared.security.AppPrincipal;
import com.geoeconwars.users.domain.User;
import com.geoeconwars.users.domain.UserRepository;
import java.time.Instant;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
public class CurrentActorService {

    private final UserRepository userRepository;
    private final GuestSessionRepository guestSessionRepository;

    public CurrentActorService(UserRepository userRepository, GuestSessionRepository guestSessionRepository) {
        this.userRepository = userRepository;
        this.guestSessionRepository = guestSessionRepository;
    }

    public ActorContext require(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof AppPrincipal principal)) {
            throw new UnauthorizedException("Authentication required");
        }
        if (principal.subjectType() == SubjectType.USER) {
            User user = userRepository.findById(principal.subjectId())
                    .orElseThrow(() -> new UnauthorizedException("User no longer exists"));
            return new ActorContext(user.getId(), SubjectType.USER, user.getPlanTier(), user.getEmail(), user, null);
        }

        GuestSession guestSession = guestSessionRepository.findById(principal.subjectId())
                .orElseThrow(() -> new UnauthorizedException("Guest session no longer exists"));
        if (guestSession.getExpiresAt().isBefore(Instant.now())) {
            throw new UnauthorizedException("Guest session has expired");
        }
        return new ActorContext(guestSession.getId(), SubjectType.GUEST, PlanTier.GUEST, null, null, guestSession);
    }

    public User requireUser(ActorContext actor) {
        if (actor.subjectType() != SubjectType.USER || actor.user() == null) {
            throw new ForbiddenException("User account required");
        }
        return actor.user();
    }

    public User requireAdmin(Authentication authentication) {
        User user = requireUser(require(authentication));
        if (user.getRole() != UserRole.ADMIN) {
            throw new ForbiddenException("Admin access required");
        }
        return user;
    }

    public boolean owns(ActorContext actor, SubjectType subjectType, java.util.UUID subjectId) {
        return actor.subjectType() == subjectType && actor.subjectId().equals(subjectId);
    }
}
