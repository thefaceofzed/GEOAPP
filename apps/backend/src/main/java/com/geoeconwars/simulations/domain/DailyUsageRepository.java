package com.geoeconwars.simulations.domain;

import com.geoeconwars.shared.domain.SubjectType;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DailyUsageRepository extends JpaRepository<DailyUsage, UUID> {

    Optional<DailyUsage> findBySubjectTypeAndSubjectIdAndUsageDate(SubjectType subjectType, UUID subjectId, LocalDate usageDate);
}
