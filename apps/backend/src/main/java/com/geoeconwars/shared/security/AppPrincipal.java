package com.geoeconwars.shared.security;

import com.geoeconwars.shared.domain.PlanTier;
import com.geoeconwars.shared.domain.SubjectType;
import java.security.Principal;
import java.util.UUID;

public record AppPrincipal(
        UUID subjectId,
        SubjectType subjectType,
        PlanTier planTier,
        String email
) implements Principal {

    @Override
    public String getName() {
        return subjectId.toString();
    }
}
