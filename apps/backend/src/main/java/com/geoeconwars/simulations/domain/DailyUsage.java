package com.geoeconwars.simulations.domain;

import com.geoeconwars.shared.domain.BaseEntity;
import com.geoeconwars.shared.domain.SubjectType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "daily_usage")
public class DailyUsage extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SubjectType subjectType;

    @Column(nullable = false)
    private UUID subjectId;

    @Column(nullable = false)
    private LocalDate usageDate;

    @Column(nullable = false)
    private int simulationsUsed;

    public SubjectType getSubjectType() {
        return subjectType;
    }

    public void setSubjectType(SubjectType subjectType) {
        this.subjectType = subjectType;
    }

    public UUID getSubjectId() {
        return subjectId;
    }

    public void setSubjectId(UUID subjectId) {
        this.subjectId = subjectId;
    }

    public LocalDate getUsageDate() {
        return usageDate;
    }

    public void setUsageDate(LocalDate usageDate) {
        this.usageDate = usageDate;
    }

    public int getSimulationsUsed() {
        return simulationsUsed;
    }

    public void setSimulationsUsed(int simulationsUsed) {
        this.simulationsUsed = simulationsUsed;
    }
}
