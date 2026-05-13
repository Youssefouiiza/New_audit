package com.audit.platform.modules.document.service;

import com.audit.platform.config.AppProperties;
import com.audit.platform.config.SecurityUserDetails;
import com.audit.platform.modules.audit.domain.Audit;
import com.audit.platform.modules.audit.domain.AuditStatus;
import com.audit.platform.modules.audit.repository.AuditRepository;
import com.audit.platform.modules.document.domain.*;
import com.audit.platform.modules.document.dto.*;
import com.audit.platform.modules.document.repository.DocumentRepository;
import com.audit.platform.modules.document.repository.DocumentRequestRepository;
import com.audit.platform.modules.notification.domain.NotificationType;
import com.audit.platform.modules.notification.service.NotificationService;
import com.audit.platform.modules.user.domain.User;
import com.audit.platform.modules.user.repository.UserRepository;
import com.audit.platform.shared.exception.ApiException;
import com.audit.platform.shared.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final DocumentRequestRepository documentRequestRepository;
    private final AuditRepository auditRepository;
    private final UserRepository userRepository;
    private final MinioStorageService storageService;
    private final NotificationService notificationService;
    private final AppProperties appProperties;

    @Transactional
    public DocumentResponse upload(UUID auditId, MultipartFile file, DocumentCategory category) {
        Audit audit = findAudit(auditId);
        User uploader = currentUser();

        // Quota check - 50MB per file
        if (file.getSize() > 50L * 1024 * 1024) {
            throw new ApiException(ErrorCode.DOC_003, HttpStatus.BAD_REQUEST, "File exceeds 50MB limit");
        }

        String key = storageService.uploadDocument(file, "audit/" + auditId);
        Document doc = Document.builder()
                .audit(audit)
                .uploadedBy(uploader)
                .fileName(file.getOriginalFilename())
                .fileKey(key)
                .fileSize(file.getSize())
                .mimeType(file.getContentType())
                .category(category != null ? category : DocumentCategory.OTHER)
                .status(DocumentEntityStatus.PENDING)
                .build();
        doc = documentRepository.save(doc);

        // If audit was AWAITING_DOCS, move back to IN_PROGRESS
        if (audit.getStatus() == AuditStatus.AWAITING_DOCS) {
            audit.setStatus(AuditStatus.IN_PROGRESS);
            auditRepository.save(audit);
        }

        // Notify auditor about new document
        if (audit.getAuditor() != null) {
            notificationService.push(audit.getAuditor(), NotificationType.AI_READY,
                    "Document reçu",
                    "Un nouveau document a été uploadé pour l'audit '" + audit.getTitle() + "'",
                    auditId.toString(), "AUDIT");
        }

        return toResponse(doc);
    }

    @Transactional(readOnly = true)
    public List<DocumentResponse> listByAudit(UUID auditId) {
        findAudit(auditId);
        return documentRepository.findByAuditId(auditId).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DocumentResponse getById(UUID docId) {
        Document doc = documentRepository.findById(docId)
                .orElseThrow(() -> new ApiException(ErrorCode.DOC_001, HttpStatus.NOT_FOUND));
        return toResponse(doc);
    }

    @Transactional
    public void delete(UUID docId) {
        Document doc = documentRepository.findById(docId)
                .orElseThrow(() -> new ApiException(ErrorCode.DOC_001, HttpStatus.NOT_FOUND));
        // Remove physical file from storage
        try {
            storageService.deleteFile(doc.getFileKey());
        } catch (Exception e) {
            // Log but don't block deletion if file is already missing
        }
        documentRepository.delete(doc);
    }

    @Transactional
    public DocumentRequestResponse createRequest(CreateDocRequestRequest req) {
        Audit audit = findAudit(req.getAuditId());
        User requester = currentUser();
        DocumentRequest dr = DocumentRequest.builder()
                .audit(audit)
                .requestedBy(requester)
                .description(req.getDescription())
                .deadline(req.getDeadline())
                .status(DocumentRequestStatus.PENDING)
                .build();
        dr = documentRequestRepository.save(dr);

        // Notify client
        notificationService.push(audit.getClient(), NotificationType.DOC_REQUESTED,
                "Document demandé",
                "L'auditeur demande un document : " + req.getDescription(),
                audit.getId().toString(), "AUDIT");

        // Set audit to AWAITING_DOCS if in progress
        if (audit.getStatus() == AuditStatus.IN_PROGRESS) {
            audit.setStatus(AuditStatus.AWAITING_DOCS);
            auditRepository.save(audit);
        }

        return toDocRequestResponse(dr);
    }

    @Transactional(readOnly = true)
    public List<DocumentRequestResponse> listRequestsByAudit(UUID auditId) {
        return documentRequestRepository.findByAuditId(auditId).stream()
                .map(this::toDocRequestResponse).collect(Collectors.toList());
    }

    @Transactional
    public DocumentRequestResponse updateRequestStatus(UUID requestId, DocumentRequestStatus newStatus) {
        DocumentRequest dr = documentRequestRepository.findById(requestId)
                .orElseThrow(() -> new ApiException(ErrorCode.DOC_001, HttpStatus.NOT_FOUND));
        dr.setStatus(newStatus);
        return toDocRequestResponse(documentRequestRepository.save(dr));
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

    private DocumentResponse toResponse(Document d) {
        String url = storageService.presignedGetUrl(
                appProperties.getMinio().getBuckets().getDocuments(), d.getFileKey());
        return DocumentResponse.builder()
                .id(d.getId())
                .auditId(d.getAudit().getId())
                .uploadedById(d.getUploadedBy().getId())
                .uploadedByName(d.getUploadedBy().getFullName())
                .fileName(d.getFileName())
                .fileSize(d.getFileSize())
                .mimeType(d.getMimeType())
                .category(d.getCategory())
                .status(d.getStatus().name())
                .downloadUrl(url)
                .uploadedAt(d.getUploadedAt())
                .build();
    }

    private DocumentRequestResponse toDocRequestResponse(DocumentRequest dr) {
        return DocumentRequestResponse.builder()
                .id(dr.getId())
                .auditId(dr.getAudit().getId())
                .requestedById(dr.getRequestedBy().getId())
                .requestedByName(dr.getRequestedBy().getFullName())
                .description(dr.getDescription())
                .deadline(dr.getDeadline())
                .status(dr.getStatus())
                .createdAt(dr.getCreatedAt())
                .build();
    }
}
