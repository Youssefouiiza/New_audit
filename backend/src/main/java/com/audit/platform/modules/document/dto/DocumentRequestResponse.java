package com.audit.platform.modules.document.dto;

import com.audit.platform.modules.document.domain.DocumentRequestStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
public class DocumentRequestResponse {
    private UUID id;
    private UUID auditId;
    private UUID requestedById;
    private String requestedByName;
    private String description;
    private LocalDate deadline;
    private DocumentRequestStatus status;
    private Instant createdAt;
}
