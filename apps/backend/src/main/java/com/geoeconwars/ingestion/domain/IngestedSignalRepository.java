package com.geoeconwars.ingestion.domain;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IngestedSignalRepository extends JpaRepository<IngestedSignal, UUID> {

    Optional<IngestedSignal> findByDedupeHash(String dedupeHash);

    List<IngestedSignal> findTop200ByPublishedAtAfterOrderByPublishedAtDesc(Instant publishedAfter);

    Optional<IngestedSignal> findTopByOrderByPublishedAtDesc();
}
