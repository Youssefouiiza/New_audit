package com.audit.platform.modules.audit.dto;

import com.audit.platform.modules.audit.domain.AuditStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class AuditHistoryResponse {
    private UUID id;
    private UUID auditId;
    private AuditStatus oldStatus;
    private AuditStatus newStatus;
    private String comment;
    private UUID changedById;
    private String changedByName;
    private Instant createdAt;
}
