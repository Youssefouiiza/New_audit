package com.audit.platform.modules.audit.service;

import com.audit.platform.config.SecurityUserDetails;
import com.audit.platform.modules.audit.domain.Audit;
import com.audit.platform.modules.audit.domain.AuditHistory;
import com.audit.platform.modules.audit.domain.AuditStatus;
import com.audit.platform.modules.audit.dto.*;
import com.audit.platform.modules.audit.repository.AuditHistoryRepository;
import com.audit.platform.modules.audit.repository.AuditRepository;
import com.audit.platform.modules.notification.domain.NotificationType;
import com.audit.platform.modules.notification.service.NotificationService;
import com.audit.platform.modules.user.domain.User;
import com.audit.platform.modules.user.domain.UserRole;
import com.audit.platform.modules.user.repository.UserRepository;
import com.audit.platform.shared.exception.ApiException;
import com.audit.platform.shared.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditRepository auditRepository;
    private final AuditHistoryRepository auditHistoryRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional
    public AuditResponse create(CreateAuditRequest req) {
        User creator = currentUser();
        // If the caller is a CLIENT, they are the client of the audit
        User client;
        if (creator.getRole() == UserRole.CLIENT) {
            client = creator;
        } else {
            client = findUser(req.getClientId());
        }
        Audit audit = Audit.builder()
                .title(req.getTitle())
                .description(req.getDescription())
                .client(client)
                .deadline(req.getDeadline())
                .status(AuditStatus.DRAFT)
                .build();
        Audit savedAudit = auditRepository.save(audit);
        // Notify all managers
        userRepository.findByRole(UserRole.MANAGER).forEach(m ->
                notificationService.push(m, NotificationType.AUDIT_ASSIGNED,
                        "Nouvel audit cree", "Un audit '" + savedAudit.getTitle() + "' a ete cree.", savedAudit.getId().toString(), "AUDIT"));
        return toResponse(savedAudit);
    }

    @Transactional(readOnly = true)
    public Page<AuditResponse> listAll(Pageable pageable) {
        return auditRepository.findAll(pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<AuditResponse> listUnassigned(Pageable pageable) {
        return auditRepository.findUnassigned(pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<AuditResponse> listMine(Pageable pageable) {
        User me = currentUser();
        return switch (me.getRole()) {
            case CLIENT -> auditRepository.findByClient(me, pageable).map(this::toResponse);
            case AUDITOR -> auditRepository.findByAuditor(me, pageable).map(this::toResponse);
            case MANAGER -> auditRepository.findByManager(me, pageable).map(this::toResponse);
            default -> auditRepository.findAll(pageable).map(this::toResponse);
        };
    }

    @Transactional(readOnly = true)
    public AuditResponse getById(UUID id) {
        return toResponse(findAudit(id));
    }

    @Transactional
    public AuditResponse assign(UUID auditId, AssignAuditRequest req) {
        Audit audit = findAudit(auditId);
        User auditor = findUser(req.getAuditorId());
        if (auditor.getRole() != UserRole.AUDITOR) {
            throw new ApiException(ErrorCode.USER_001, HttpStatus.BAD_REQUEST, "User is not an AUDITOR");
        }
        AuditStatus oldStatus = audit.getStatus();
        audit.setAuditor(auditor);
        if (req.getManagerId() != null) {
            audit.setManager(findUser(req.getManagerId()));
        }
        audit.setStatus(AuditStatus.IN_PROGRESS);
        audit = auditRepository.save(audit);
        recordHistory(audit, oldStatus, AuditStatus.IN_PROGRESS, "Assigned to auditor");
        notificationService.push(auditor, NotificationType.AUDIT_ASSIGNED,
                "Audit assigné", "Vous avez été assigné à l'audit '" + audit.getTitle() + "'.", auditId.toString(), "AUDIT");
        return toResponse(audit);
    }

    @Transactional
    public AuditResponse changeStatus(UUID auditId, AuditStatus newStatus, ChangeStatusRequest req) {
        Audit audit = findAudit(auditId);
        User me = currentUser();
        validateTransition(audit.getStatus(), newStatus, me);
        AuditStatus old = audit.getStatus();
        audit.setStatus(newStatus);
        audit = auditRepository.save(audit);
        recordHistory(audit, old, newStatus, req != null ? req.getComment() : null);
        return toResponse(audit);
    }

    @Transactional
    public void delete(UUID id) {
        Audit audit = findAudit(id);
        audit.setStatus(AuditStatus.CANCELLED);
        auditRepository.save(audit);
    }

    @Transactional(readOnly = true)
    public List<AuditHistoryResponse> getHistory(UUID auditId) {
        findAudit(auditId);
        return auditHistoryRepository.findByAuditIdOrderByCreatedAtDesc(auditId).stream()
                .map(h -> AuditHistoryResponse.builder()
                        .id(h.getId())
                        .auditId(auditId)
                        .oldStatus(h.getOldStatus())
                        .newStatus(h.getNewStatus())
                        .comment(h.getComment())
                        .changedById(h.getChangedBy() != null ? h.getChangedBy().getId() : null)
                        .changedByName(h.getChangedBy() != null ? h.getChangedBy().getFullName() : null)
                        .createdAt(h.getCreatedAt())
                        .build())
                .toList();
    }

    // Stats for dashboard
    public long countByStatus(AuditStatus status) {
        return auditRepository.countByStatus(status);
    }

    // ---- helpers ----
    private void validateTransition(AuditStatus current, AuditStatus target, User user) {
        boolean isAdminOrManager = user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.MANAGER;
        boolean isAuditor = user.getRole() == UserRole.AUDITOR;
        boolean valid = switch (current) {
            case DRAFT ->
                // Auditor can start a draft; admin/manager can cancel or move to pending
                (isAuditor && target == AuditStatus.IN_PROGRESS) ||
                (isAdminOrManager && (target == AuditStatus.PENDING || target == AuditStatus.IN_PROGRESS || target == AuditStatus.CANCELLED));
            case PENDING ->
                // Auditor can move from revision to in-progress or completed; admin can cancel
                (isAuditor && (target == AuditStatus.IN_PROGRESS || target == AuditStatus.COMPLETED)) ||
                (isAdminOrManager && (target == AuditStatus.IN_PROGRESS || target == AuditStatus.CANCELLED));
            case IN_PROGRESS ->
                // Auditor can send for review (PENDING) or complete; admin can cancel
                (isAuditor && (target == AuditStatus.PENDING || target == AuditStatus.AWAITING_DOCS || target == AuditStatus.COMPLETED)) ||
                (isAdminOrManager && (target == AuditStatus.PENDING || target == AuditStatus.COMPLETED || target == AuditStatus.CANCELLED));
            case AWAITING_DOCS ->
                (isAuditor && target == AuditStatus.IN_PROGRESS) ||
                (isAdminOrManager && target == AuditStatus.CANCELLED);
            case COMPLETED ->
                isAdminOrManager && target == AuditStatus.CANCELLED;
            case CANCELLED -> false;
        };
        if (!valid) {
            throw new ApiException(ErrorCode.AUDIT_002, HttpStatus.BAD_REQUEST,
                    current + " -> " + target + " not allowed for role " + user.getRole());
        }
    }


    private void recordHistory(Audit audit, AuditStatus oldStatus, AuditStatus newStatus, String comment) {
        auditHistoryRepository.save(AuditHistory.builder()
                .audit(audit)
                .changedBy(currentUser())
                .oldStatus(oldStatus)
                .newStatus(newStatus)
                .comment(comment)
                .build());
    }

    private Audit findAudit(UUID id) {
        return auditRepository.findById(id)
                .orElseThrow(() -> new ApiException(ErrorCode.AUDIT_001, HttpStatus.NOT_FOUND));
    }

    private User findUser(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_001, HttpStatus.NOT_FOUND));
    }

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        SecurityUserDetails d = (SecurityUserDetails) auth.getPrincipal();
        return findUser(d.getId());
    }

    public AuditResponse toResponse(Audit a) {
        return AuditResponse.builder()
                .id(a.getId())
                .title(a.getTitle())
                .description(a.getDescription())
                .status(a.getStatus())
                .deadline(a.getDeadline())
                .createdAt(a.getCreatedAt())
                .updatedAt(a.getUpdatedAt())
                .clientId(a.getClient().getId())
                .clientName(a.getClient().getFullName())
                .clientEmail(a.getClient().getEmail())
                .auditorId(a.getAuditor() != null ? a.getAuditor().getId() : null)
                .auditorName(a.getAuditor() != null ? a.getAuditor().getFullName() : null)
                .managerId(a.getManager() != null ? a.getManager().getId() : null)
                .managerName(a.getManager() != null ? a.getManager().getFullName() : null)
                .build();
    }
}
