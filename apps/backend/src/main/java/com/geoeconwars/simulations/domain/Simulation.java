package com.geoeconwars.simulations.domain;

import com.geoeconwars.shared.domain.BaseEntity;
import com.geoeconwars.shared.domain.SubjectType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "simulations")
public class Simulation extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SubjectType subjectType;

    @Column(nullable = false)
    private UUID subjectId;

    @Column(nullable = false)
    private String countryCode;

    @Column(nullable = false)
    private String actionKey;

    @Column(nullable = false)
    private int durationHours;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String alliesJson;

    @Column(nullable = false)
    private String rulesVersion;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal severityScore;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String impactsJson;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String narrativeJson;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String affectedCountriesJson;

    @Column(nullable = false)
    private String requestHash;

    @Column(nullable = false)
    private boolean cached;

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

    public String getCountryCode() {
        return countryCode;
    }

    public void setCountryCode(String countryCode) {
        this.countryCode = countryCode;
    }

    public String getActionKey() {
        return actionKey;
    }

    public void setActionKey(String actionKey) {
        this.actionKey = actionKey;
    }

    public int getDurationHours() {
        return durationHours;
    }

    public void setDurationHours(int durationHours) {
        this.durationHours = durationHours;
    }

    public String getAlliesJson() {
        return alliesJson;
    }

    public void setAlliesJson(String alliesJson) {
        this.alliesJson = alliesJson;
    }

    public String getRulesVersion() {
        return rulesVersion;
    }

    public void setRulesVersion(String rulesVersion) {
        this.rulesVersion = rulesVersion;
    }

    public BigDecimal getSeverityScore() {
        return severityScore;
    }

    public void setSeverityScore(BigDecimal severityScore) {
        this.severityScore = severityScore;
    }

    public String getImpactsJson() {
        return impactsJson;
    }

    public void setImpactsJson(String impactsJson) {
        this.impactsJson = impactsJson;
    }

    public String getNarrativeJson() {
        return narrativeJson;
    }

    public void setNarrativeJson(String narrativeJson) {
        this.narrativeJson = narrativeJson;
    }

    public String getAffectedCountriesJson() {
        return affectedCountriesJson;
    }

    public void setAffectedCountriesJson(String affectedCountriesJson) {
        this.affectedCountriesJson = affectedCountriesJson;
    }

    public String getRequestHash() {
        return requestHash;
    }

    public void setRequestHash(String requestHash) {
        this.requestHash = requestHash;
    }

    public boolean isCached() {
        return cached;
    }

    public void setCached(boolean cached) {
        this.cached = cached;
    }
}
