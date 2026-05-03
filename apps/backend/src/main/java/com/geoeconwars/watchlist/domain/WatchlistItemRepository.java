package com.geoeconwars.watchlist.domain;

import com.geoeconwars.shared.domain.SubjectType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WatchlistItemRepository extends JpaRepository<WatchlistItem, UUID> {

    List<WatchlistItem> findBySubjectTypeAndSubjectIdOrderByCreatedAtDesc(SubjectType subjectType, UUID subjectId);

    Optional<WatchlistItem> findBySubjectTypeAndSubjectIdAndCountryCodeAndActionKey(
            SubjectType subjectType,
            UUID subjectId,
            String countryCode,
            String actionKey
    );
}
