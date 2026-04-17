package com.geoeconwars.ingestion.domain;

import com.geoeconwars.shared.domain.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "ingested_signals")
public class IngestedSignal extends BaseEntity {

    @Column(nullable = false)
    private String sourceName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SignalSourceType sourceType;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String url;

    @Column(nullable = false)
    private Instant publishedAt;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String countryCodesJson;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String topicTagsJson;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SignalType signalType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SignalSentiment sentiment;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal severityScore;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String extractedSummary;

    @Column(nullable = false)
    private String rawReferenceId;

    @Column(nullable = false)
    private String dedupeHash;

    public String getSourceName() {
        return sourceName;
    }

    public void setSourceName(String sourceName) {
        this.sourceName = sourceName;
    }

    public SignalSourceType getSourceType() {
        return sourceType;
    }

    public void setSourceType(SignalSourceType sourceType) {
        this.sourceType = sourceType;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    public void setPublishedAt(Instant publishedAt) {
        this.publishedAt = publishedAt;
    }

    public String getCountryCodesJson() {
        return countryCodesJson;
    }

    public void setCountryCodesJson(String countryCodesJson) {
        this.countryCodesJson = countryCodesJson;
    }

    public String getTopicTagsJson() {
        return topicTagsJson;
    }

    public void setTopicTagsJson(String topicTagsJson) {
        this.topicTagsJson = topicTagsJson;
    }

    public SignalType getSignalType() {
        return signalType;
    }

    public void setSignalType(SignalType signalType) {
        this.signalType = signalType;
    }

    public SignalSentiment getSentiment() {
        return sentiment;
    }

    public void setSentiment(SignalSentiment sentiment) {
        this.sentiment = sentiment;
    }

    public BigDecimal getSeverityScore() {
        return severityScore;
    }

    public void setSeverityScore(BigDecimal severityScore) {
        this.severityScore = severityScore;
    }

    public String getExtractedSummary() {
        return extractedSummary;
    }

    public void setExtractedSummary(String extractedSummary) {
        this.extractedSummary = extractedSummary;
    }

    public String getRawReferenceId() {
        return rawReferenceId;
    }

    public void setRawReferenceId(String rawReferenceId) {
        this.rawReferenceId = rawReferenceId;
    }

    public String getDedupeHash() {
        return dedupeHash;
    }

    public void setDedupeHash(String dedupeHash) {
        this.dedupeHash = dedupeHash;
    }
}
