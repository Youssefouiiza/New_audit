package com.audit.platform.modules.report.service;

import com.audit.platform.config.AppProperties;
import com.audit.platform.config.SecurityUserDetails;
import com.audit.platform.modules.ai.repository.AiResultRepository;
import com.audit.platform.modules.audit.domain.Audit;
import com.audit.platform.modules.audit.domain.AuditStatus;
import com.audit.platform.modules.audit.repository.AuditRepository;
import com.audit.platform.modules.document.service.MinioStorageService;
import com.audit.platform.modules.form.repository.AuditFormRepository;
import com.audit.platform.modules.notification.domain.NotificationType;
import com.audit.platform.modules.notification.service.NotificationService;
import com.audit.platform.modules.report.domain.Report;
import com.audit.platform.modules.report.domain.ReportStatus;
import com.audit.platform.modules.report.dto.ReportResponse;
import com.audit.platform.modules.report.repository.ReportRepository;
import com.audit.platform.modules.user.domain.User;
import com.audit.platform.modules.user.domain.UserRole;
import com.audit.platform.modules.user.repository.UserRepository;
import com.audit.platform.shared.exception.ApiException;
import com.audit.platform.shared.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;
    private final AuditRepository auditRepository;
    private final AuditFormRepository formRepository;
    private final AiResultRepository aiResultRepository;
    private final UserRepository userRepository;
    private final MinioStorageService storageService;
    private final NotificationService notificationService;
    private final AppProperties appProperties;

    // ─── Generate PDF (existing) ─────────────────────────────────────────────

    @Transactional
    public ReportResponse generateReport(UUID auditId) {
        Audit audit = findAudit(auditId);
        User generatedBy = currentUser();

        Report report = reportRepository.findByAuditId(auditId).orElse(new Report());
        report.setAudit(audit);
        report.setGeneratedBy(generatedBy);
        report.setStatus(ReportStatus.GENERATING);
        report.setFileName("Audit_Report_" + auditId + ".pdf");
        report = reportRepository.save(report);

        try {
            byte[] pdfBytes = createPdf(audit);
            String key = storageService.uploadDocumentBytes(pdfBytes, report.getFileName(), "application/pdf",
                    "reports/" + auditId, appProperties.getMinio().getBuckets().getReports());
            report.setFileKey(key);
            report.setStatus(ReportStatus.READY);
            report = reportRepository.save(report);

            audit.setStatus(AuditStatus.COMPLETED);
            auditRepository.save(audit);

            notificationService.push(audit.getClient(), NotificationType.REPORT_READY,
                    "Rapport disponible",
                    "Le rapport final de votre audit est prêt à être téléchargé.",
                    auditId.toString(), "AUDIT");

        } catch (Exception e) {
            log.error("Failed to generate report for audit {}", auditId, e);
            report.setStatus(ReportStatus.ERROR);
            reportRepository.save(report);
            throw new ApiException(ErrorCode.GEN_001, HttpStatus.INTERNAL_SERVER_ERROR, "PDF generation failed");
        }

        return toResponse(report);
    }

    // ─── Submit final report (Auditor uploads) ───────────────────────────────

    /**
     * Called when the auditor submits their final report document.
     * Creates/updates the Report record to PENDING_REVIEW and notifies all managers.
     */
    @Transactional
    public ReportResponse submitReport(UUID auditId, String documentFileKey, String documentFileName) {
        Audit audit = findAudit(auditId);
        User auditor = currentUser();

        Report report = reportRepository.findByAuditId(auditId).orElseGet(() -> {
            Report r = new Report();
            r.setAudit(audit);
            r.setGeneratedBy(auditor);
            return r;
        });

        report.setDocumentFileKey(documentFileKey);
        report.setDocumentFileName(documentFileName);
        report.setStatus(ReportStatus.PENDING_REVIEW);
        report.setSubmittedAt(Instant.now());
        report.setReviewComment(null);
        report.setReviewedBy(null);
        report.setReviewedAt(null);
        report = reportRepository.save(report);

        // Notify all managers
        List<User> managers = userRepository.findByRole(UserRole.MANAGER);
        for (User manager : managers) {
            notificationService.push(manager, NotificationType.AUDIT_UPDATED,
                    "📋 Rapport soumis pour validation",
                    "L'auditeur " + auditor.getFullName() + " a soumis le rapport final de l'audit \"" + audit.getTitle() + "\". Votre approbation est requise.",
                    auditId.toString(), "AUDIT");
        }

        log.info("Auditor {} submitted final report for audit {}", auditor.getEmail(), auditId);
        return toResponse(report);
    }

    // ─── Review report (Manager approves / rejects / requests revision) ──────

    @Transactional
    public ReportResponse reviewReport(UUID auditId, String decision, String comment) {
        Audit audit = findAudit(auditId);
        User manager = currentUser();

        Report report = reportRepository.findByAuditId(auditId)
                .orElseThrow(() -> new ApiException(ErrorCode.GEN_001, HttpStatus.NOT_FOUND, "Report not found — auditor has not submitted yet"));

        report.setReviewedBy(manager);
        report.setReviewedAt(Instant.now());
        report.setReviewComment(comment);

        switch (decision.toUpperCase()) {
            case "APPROVE" -> {
                report.setStatus(ReportStatus.APPROVED);
                // Mark audit COMPLETED
                audit.setStatus(AuditStatus.COMPLETED);
                auditRepository.save(audit);
                // Notify auditor
                notificationService.push(report.getGeneratedBy(), NotificationType.AUDIT_UPDATED,
                        "✅ Rapport approuvé",
                        "Le manager " + manager.getFullName() + " a approuvé votre rapport pour l'audit \"" + audit.getTitle() + "\".",
                        auditId.toString(), "AUDIT");
                // Notify client
                notificationService.push(audit.getClient(), NotificationType.REPORT_READY,
                        "📄 Votre rapport d'audit est disponible",
                        "Le rapport final de votre audit \"" + audit.getTitle() + "\" a été validé et est maintenant disponible.",
                        auditId.toString(), "AUDIT");
                log.info("Manager {} APPROVED report for audit {}", manager.getEmail(), auditId);
            }
            case "REJECT" -> {
                report.setStatus(ReportStatus.REJECTED);
                notificationService.push(report.getGeneratedBy(), NotificationType.AUDIT_UPDATED,
                        "❌ Rapport refusé",
                        "Le manager " + manager.getFullName() + " a refusé votre rapport. Commentaire: " + (comment != null ? comment : "Aucun"),
                        auditId.toString(), "AUDIT");
                log.info("Manager {} REJECTED report for audit {}", manager.getEmail(), auditId);
            }
            case "REVISION" -> {
                report.setStatus(ReportStatus.REVISION_REQUESTED);
                notificationService.push(report.getGeneratedBy(), NotificationType.AUDIT_UPDATED,
                        "🔄 Modifications demandées",
                        "Le manager " + manager.getFullName() + " demande des modifications sur le rapport: " + (comment != null ? comment : "Voir détails"),
                        auditId.toString(), "AUDIT");
                log.info("Manager {} requested REVISION for audit {}", manager.getEmail(), auditId);
            }
            default -> throw new ApiException(ErrorCode.GEN_001, HttpStatus.BAD_REQUEST, "Invalid decision: use APPROVE, REJECT or REVISION");
        }

        report = reportRepository.save(report);
        return toResponse(report);
    }

    // ─── Get ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ReportResponse getByAuditId(UUID auditId) {
        Report report = reportRepository.findByAuditId(auditId)
                .orElseThrow(() -> new ApiException(ErrorCode.GEN_001, HttpStatus.NOT_FOUND, "Report not found"));
        return toResponse(report);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private byte[] createPdf(Audit audit) throws Exception {
        String dummyContent = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n" +
                "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n" +
                "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n" +
                "4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 24 Tf 100 700 Td (Audit Report generated!) Tj ET\nendstream\nendobj\n" +
                "trailer\n<< /Root 1 0 R >>\n%%EOF";
        return dummyContent.getBytes();
    }

    private Audit findAudit(UUID id) {
        return auditRepository.findById(id)
                .orElseThrow(() -> new ApiException(ErrorCode.AUDIT_001, HttpStatus.NOT_FOUND));
    }

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        SecurityUserDetails d = (SecurityUserDetails) auth.getPrincipal();
        return userRepository.findById(d.getId())
                .orElseThrow(() -> new ApiException(ErrorCode.USER_001, HttpStatus.NOT_FOUND));
    }

    private ReportResponse toResponse(Report r) {
        String url = null;
        if (r.getFileKey() != null) {
            url = storageService.presignedGetUrl(appProperties.getMinio().getBuckets().getReports(), r.getFileKey());
        }
        String docUrl = null;
        if (r.getDocumentFileKey() != null) {
            docUrl = storageService.presignedGetUrl(appProperties.getMinio().getBuckets().getDocuments(), r.getDocumentFileKey());
        }
        User gb = r.getGeneratedBy();
        User rb = r.getReviewedBy();
        return ReportResponse.builder()
                .id(r.getId())
                .auditId(r.getAudit().getId())
                .generatedById(gb != null ? gb.getId() : null)
                .generatedByName(gb != null ? gb.getFullName() : null)
                .fileName(r.getFileName())
                .status(r.getStatus())
                .downloadUrl(url)
                .createdAt(r.getCreatedAt())
                .documentFileName(r.getDocumentFileName())
                .documentDownloadUrl(docUrl)
                .reviewComment(r.getReviewComment())
                .reviewedById(rb != null ? rb.getId() : null)
                .reviewedByName(rb != null ? rb.getFullName() : null)
                .reviewedAt(r.getReviewedAt())
                .submittedAt(r.getSubmittedAt())
                .build();
    }
}
