package com.geoeconwars.replay.domain;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReplayLinkRepository extends JpaRepository<ReplayLink, UUID> {

    Optional<ReplayLink> findByPublicTokenAndIsPublicTrue(String publicToken);

    Optional<ReplayLink> findBySimulationId(UUID simulationId);
}
