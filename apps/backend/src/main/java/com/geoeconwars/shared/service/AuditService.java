package com.geoeconwars.shared.service;

import com.geoeconwars.shared.domain.AuditEvent;
import com.geoeconwars.shared.domain.SubjectType;
import com.geoeconwars.shared.domain.AuditEventRepository;
import com.geoeconwars.shared.util.JsonSupport;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class AuditService {

    private final AuditEventRepository auditEventRepository;
    private final JsonSupport jsonSupport;

    public AuditService(AuditEventRepository auditEventRepository, JsonSupport jsonSupport) {
        this.auditEventRepository = auditEventRepository;
        this.jsonSupport = jsonSupport;
    }

    public void record(String eventType, SubjectType actorType, UUID actorId, Map<String, Object> metadata) {
        AuditEvent event = new AuditEvent();
        event.setEventType(eventType);
        event.setActorType(actorType);
        event.setActorId(actorId);
        event.setMetadataJson(jsonSupport.write(metadata));
        auditEventRepository.save(event);
    }
}
