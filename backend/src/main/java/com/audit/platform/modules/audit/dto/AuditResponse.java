package com.audit.platform.modules.audit.dto;

import com.audit.platform.modules.audit.domain.AuditStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
public class AuditResponse {
    private UUID id;
    private String title;
    private String description;
    private AuditStatus status;
    private LocalDate deadline;
    private Instant createdAt;
    private Instant updatedAt;
    private UUID clientId;
    private String clientName;
    private String clientEmail;
    private UUID auditorId;
    private String auditorName;
    private UUID managerId;
    private String managerName;
}
