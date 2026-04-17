package com.geoeconwars.users.service;

import com.geoeconwars.auth.service.ActorContext;
import com.geoeconwars.shared.domain.PlanTier;
import com.geoeconwars.shared.domain.SubjectType;
import com.geoeconwars.shared.domain.UserRole;
import com.geoeconwars.simulations.service.QuotaService;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class UserProfileService {

    private final QuotaService quotaService;

    public UserProfileService(QuotaService quotaService) {
        this.quotaService = quotaService;
    }

    public ProfileView buildProfile(ActorContext actor) {
        QuotaService.QuotaStatus quotaStatus = quotaService.checkRemaining(actor);
        return new ProfileView(
                actor.subjectId(),
                actor.subjectType(),
                actor.planTier(),
                actor.user() == null ? null : actor.user().getRole(),
                actor.email(),
                quotaStatus.remaining(),
                quotaStatus.unlimited()
        );
    }

    public record ProfileView(
            UUID subjectId,
            SubjectType subjectType,
            PlanTier planTier,
            UserRole role,
            String email,
            Integer simulationsRemaining,
            boolean unlimited
    ) {
    }
}
