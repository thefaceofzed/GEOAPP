package com.geoeconwars.auth.service;

import com.geoeconwars.auth.domain.GuestSession;
import com.geoeconwars.shared.domain.PlanTier;
import com.geoeconwars.shared.domain.SubjectType;
import com.geoeconwars.users.domain.User;
import java.util.UUID;

public record ActorContext(
        UUID subjectId,
        SubjectType subjectType,
        PlanTier planTier,
        String email,
        User user,
        GuestSession guestSession
) {
}
