package com.geoeconwars.simulations.service;

import com.geoeconwars.auth.domain.GuestSession;
import com.geoeconwars.auth.domain.GuestSessionRepository;
import com.geoeconwars.auth.service.ActorContext;
import com.geoeconwars.shared.config.AppProperties;
import com.geoeconwars.shared.domain.PlanTier;
import com.geoeconwars.shared.domain.SubjectType;
import com.geoeconwars.shared.exception.ForbiddenException;
import com.geoeconwars.simulations.domain.DailyUsage;
import com.geoeconwars.simulations.domain.DailyUsageRepository;
import java.time.LocalDate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class QuotaService {

    private final AppProperties properties;
    private final GuestSessionRepository guestSessionRepository;
    private final DailyUsageRepository dailyUsageRepository;

    public QuotaService(AppProperties properties, GuestSessionRepository guestSessionRepository, DailyUsageRepository dailyUsageRepository) {
        this.properties = properties;
        this.guestSessionRepository = guestSessionRepository;
        this.dailyUsageRepository = dailyUsageRepository;
    }

    @Transactional(readOnly = true)
    public QuotaStatus checkRemaining(ActorContext actor) {
        if (actor.planTier() == PlanTier.PRO || actor.planTier() == PlanTier.ADMIN) {
            return new QuotaStatus(null, true);
        }
        if (actor.subjectType() == SubjectType.GUEST) {
            GuestSession guestSession = actor.guestSession();
            int remaining = Math.max(0, properties.quota().guestLifetimeLimit() - guestSession.getSimulationsUsed());
            return new QuotaStatus(remaining, false);
        }
        DailyUsage usage = dailyUsageRepository.findBySubjectTypeAndSubjectIdAndUsageDate(SubjectType.USER, actor.subjectId(), LocalDate.now())
                .orElse(null);
        int used = usage == null ? 0 : usage.getSimulationsUsed();
        int remaining = Math.max(0, properties.quota().freeDailyLimit() - used);
        return new QuotaStatus(remaining, false);
    }

    @Transactional
    public QuotaStatus consume(ActorContext actor) {
        QuotaStatus current = checkRemaining(actor);
        if (!current.unlimited() && current.remaining() != null && current.remaining() <= 0) {
            throw new ForbiddenException("Simulation quota exhausted");
        }

        if (actor.planTier() == PlanTier.PRO || actor.planTier() == PlanTier.ADMIN) {
            return current;
        }

        if (actor.subjectType() == SubjectType.GUEST) {
            GuestSession guestSession = actor.guestSession();
            guestSession.setSimulationsUsed(guestSession.getSimulationsUsed() + 1);
            guestSessionRepository.save(guestSession);
            return checkRemaining(new ActorContext(guestSession.getId(), SubjectType.GUEST, PlanTier.GUEST, null, null, guestSession));
        }

        DailyUsage usage = dailyUsageRepository.findBySubjectTypeAndSubjectIdAndUsageDate(SubjectType.USER, actor.subjectId(), LocalDate.now())
                .orElseGet(() -> {
                    DailyUsage dailyUsage = new DailyUsage();
                    dailyUsage.setSubjectType(SubjectType.USER);
                    dailyUsage.setSubjectId(actor.subjectId());
                    dailyUsage.setUsageDate(LocalDate.now());
                    dailyUsage.setSimulationsUsed(0);
                    return dailyUsage;
                });
        usage.setSimulationsUsed(usage.getSimulationsUsed() + 1);
        dailyUsageRepository.save(usage);
        return checkRemaining(actor);
    }

    public record QuotaStatus(
            Integer remaining,
            boolean unlimited
    ) {
    }
}
