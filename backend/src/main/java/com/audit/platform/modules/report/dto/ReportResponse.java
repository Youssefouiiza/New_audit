package com.audit.platform.modules.report.dto;

import com.audit.platform.modules.report.domain.ReportStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class ReportResponse {
    private UUID id;
    private UUID auditId;
    private UUID generatedById;
    private String generatedByName;
    private String fileName;
    private ReportStatus status;
    private String downloadUrl;
    private Instant createdAt;

    // Review workflow fields
    private String documentFileName;
    private String documentDownloadUrl;
    private String reviewComment;
    private UUID reviewedById;
    private String reviewedByName;
    private Instant reviewedAt;
    private Instant submittedAt;
}
