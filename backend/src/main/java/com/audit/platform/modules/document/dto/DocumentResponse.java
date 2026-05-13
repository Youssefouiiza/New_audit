package com.audit.platform.modules.document.dto;

import com.audit.platform.modules.document.domain.DocumentCategory;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class DocumentResponse {
    private UUID id;
    private UUID auditId;
    private UUID uploadedById;
    private String uploadedByName;
    private String fileName;
    private Long fileSize;
    private String mimeType;
    private DocumentCategory category;
    private String status;
    private String downloadUrl;
    private Instant uploadedAt;
}
