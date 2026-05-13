package com.audit.platform.modules.document.dto;

import com.audit.platform.modules.document.domain.DocumentCategory;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateDocRequestRequest {
    @NotNull
    private UUID auditId;
    private String description;
    private java.time.LocalDate deadline;
    private DocumentCategory category;
}
