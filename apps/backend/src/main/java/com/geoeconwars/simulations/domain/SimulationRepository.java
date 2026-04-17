package com.geoeconwars.simulations.domain;

import com.geoeconwars.shared.domain.SubjectType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SimulationRepository extends JpaRepository<Simulation, UUID> {

    List<Simulation> findTop20BySubjectTypeAndSubjectIdOrderByCreatedAtDesc(SubjectType subjectType, UUID subjectId);

    Optional<Simulation> findFirstByRequestHashAndRulesVersionOrderByCreatedAtDesc(String requestHash, String rulesVersion);
}
