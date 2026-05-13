package com.audit.platform.modules.document.controller;

import com.audit.platform.modules.document.domain.DocumentCategory;
import com.audit.platform.modules.document.domain.DocumentRequestStatus;
import com.audit.platform.modules.document.dto.CreateDocRequestRequest;
import com.audit.platform.modules.document.dto.DocumentRequestResponse;
import com.audit.platform.modules.document.dto.DocumentResponse;
import com.audit.platform.modules.document.service.DocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
@Tag(name = "Documents", description = "Document management and requests")
public class DocumentController {

    private final DocumentService documentService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('CLIENT', 'AUDITOR', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Upload a document for an audit")
    public ResponseEntity<DocumentResponse> upload(
            @RequestParam UUID auditId,
            @RequestParam(required = false) DocumentCategory category,
            @RequestPart("file") MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED).body(documentService.upload(auditId, file, category));
    }

    @GetMapping("/audit/{auditId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AUDITOR', 'CLIENT')")
    @Operation(summary = "List documents for an audit")
    public ResponseEntity<List<DocumentResponse>> listByAudit(@PathVariable UUID auditId) {
        return ResponseEntity.ok(documentService.listByAudit(auditId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AUDITOR', 'CLIENT')")
    @Operation(summary = "Get document details including signed download URL")
    public ResponseEntity<DocumentResponse> get(@PathVariable UUID id) {
        return ResponseEntity.ok(documentService.getById(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AUDITOR', 'CLIENT')")
    @Operation(summary = "Delete a document by ID")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        documentService.delete(id);
        return ResponseEntity.noContent().build();
    }


    @PostMapping("/requests")
    @PreAuthorize("hasRole('AUDITOR')")
    @Operation(summary = "Create a formal document request (Auditor only)")
    public ResponseEntity<DocumentRequestResponse> createRequest(@Valid @RequestBody CreateDocRequestRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(documentService.createRequest(req));
    }

    @GetMapping("/requests/audit/{auditId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AUDITOR', 'CLIENT')")
    @Operation(summary = "List document requests for an audit")
    public ResponseEntity<List<DocumentRequestResponse>> listRequests(@PathVariable UUID auditId) {
        return ResponseEntity.ok(documentService.listRequestsByAudit(auditId));
    }

    @PatchMapping("/requests/{id}/status/{status}")
    @PreAuthorize("hasAnyRole('AUDITOR', 'CLIENT')")
    @Operation(summary = "Update status of a document request")
    public ResponseEntity<DocumentRequestResponse> updateRequestStatus(
            @PathVariable UUID id,
            @PathVariable DocumentRequestStatus status) {
        return ResponseEntity.ok(documentService.updateRequestStatus(id, status));
    }
}
