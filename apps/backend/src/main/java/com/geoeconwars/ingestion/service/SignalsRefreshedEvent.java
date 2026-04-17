package com.geoeconwars.ingestion.service;

import java.time.Instant;

public record SignalsRefreshedEvent(
        Instant triggeredAt,
        int insertedCount,
        int updatedCount
) {

    public boolean hasMutations() {
        return insertedCount > 0 || updatedCount > 0;
    }
}
