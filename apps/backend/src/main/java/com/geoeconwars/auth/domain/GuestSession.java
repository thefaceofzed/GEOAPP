package com.geoeconwars.auth.domain;

import com.geoeconwars.shared.domain.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "guest_sessions")
public class GuestSession extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String anonymousToken;

    @Column(nullable = false)
    private int simulationsUsed;

    @Column(nullable = false)
    private Instant expiresAt;

    public String getAnonymousToken() {
        return anonymousToken;
    }

    public void setAnonymousToken(String anonymousToken) {
        this.anonymousToken = anonymousToken;
    }

    public int getSimulationsUsed() {
        return simulationsUsed;
    }

    public void setSimulationsUsed(int simulationsUsed) {
        this.simulationsUsed = simulationsUsed;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }
}
