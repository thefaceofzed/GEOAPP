package com.geoeconwars.shared.security;

import com.geoeconwars.shared.domain.PlanTier;
import com.geoeconwars.shared.domain.SubjectType;
import java.util.UUID;

public record TokenPayload(
        UUID subjectId,
        SubjectType subjectType,
        PlanTier planTier,
        String email,
        JwtTokenType tokenType
) {
}
