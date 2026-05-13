package com.audit.platform.modules.audit.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class AssignAuditRequest {
    @NotNull
    private UUID auditorId;
    private UUID managerId;
}
