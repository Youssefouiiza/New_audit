package com.audit.platform.modules.report.domain;

public enum ReportStatus {
    GENERATING,
    READY,
    ERROR,
    PENDING_REVIEW,      // Auditor submitted — awaiting manager approval
    REVISION_REQUESTED,  // Manager asked for changes
    APPROVED,            // Manager approved — visible to client
    REJECTED             // Manager rejected permanently
}
