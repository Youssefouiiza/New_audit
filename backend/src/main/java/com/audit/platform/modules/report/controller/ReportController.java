package com.audit.platform.modules.report.controller;

import com.audit.platform.modules.report.dto.ReportResponse;
import com.audit.platform.modules.report.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@Tag(name = "Reports", description = "PDF Report generation, submission and review workflow")
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/audit/{auditId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AUDITOR', 'CLIENT')")
    @Operation(summary = "Get report details for an audit")
    public ResponseEntity<ReportResponse> getByAuditId(@PathVariable UUID auditId) {
        return ResponseEntity.ok(reportService.getByAuditId(auditId));
    }

    @PostMapping("/generate/{auditId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AUDITOR')")
    @Operation(summary = "Generate final PDF report for an audit")
    public ResponseEntity<ReportResponse> generate(@PathVariable UUID auditId) {
        return ResponseEntity.ok(reportService.generateReport(auditId));
    }

    /**
     * Auditor submits a final report document (by document file key after upload).
     * Body: { "documentFileKey": "...", "documentFileName": "..." }
     */
    @PostMapping("/submit/{auditId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR')")
    @Operation(summary = "Auditor submits final report for manager review")
    public ResponseEntity<ReportResponse> submit(
            @PathVariable UUID auditId,
            @RequestBody Map<String, String> body) {
        String fileKey = body.get("documentFileKey");
        String fileName = body.get("documentFileName");
        return ResponseEntity.ok(reportService.submitReport(auditId, fileKey, fileName));
    }

    /**
     * Manager reviews the submitted report.
     * Body: { "decision": "APPROVE|REJECT|REVISION", "comment": "..." }
     */
    @PatchMapping("/review/{auditId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Manager approves, rejects or requests revision on a submitted report")
    public ResponseEntity<ReportResponse> review(
            @PathVariable UUID auditId,
            @RequestBody Map<String, String> body) {
        String decision = body.getOrDefault("decision", "");
        String comment = body.get("comment");
        return ResponseEntity.ok(reportService.reviewReport(auditId, decision, comment));
    }
}
