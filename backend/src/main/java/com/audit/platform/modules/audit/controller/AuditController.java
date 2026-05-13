package com.audit.platform.modules.audit.controller;

import com.audit.platform.modules.audit.domain.AuditStatus;
import com.audit.platform.modules.audit.dto.*;
import com.audit.platform.modules.audit.service.AuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/audits")
@RequiredArgsConstructor
@Tag(name = "Audits", description = "Audit lifecycle management")
public class AuditController {

    private final AuditService auditService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CLIENT')")
    @Operation(summary = "Create a new audit")
    public ResponseEntity<AuditResponse> create(@Valid @RequestBody CreateAuditRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(auditService.create(req));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @Operation(summary = "List all audits (admin/manager)")
    public ResponseEntity<Page<AuditResponse>> listAll(Pageable pageable) {
        return ResponseEntity.ok(auditService.listAll(pageable));
    }

    @GetMapping("/mine")
    @Operation(summary = "List audits relevant to current user role")
    public ResponseEntity<Page<AuditResponse>> listMine(Pageable pageable) {
        return ResponseEntity.ok(auditService.listMine(pageable));
    }

    @GetMapping("/unassigned")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @Operation(summary = "List unassigned audits pending assignment")
    public ResponseEntity<Page<AuditResponse>> unassigned(Pageable pageable) {
        return ResponseEntity.ok(auditService.listUnassigned(pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get audit details by ID")
    public ResponseEntity<AuditResponse> get(@PathVariable UUID id) {
        return ResponseEntity.ok(auditService.getById(id));
    }

    @PostMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @Operation(summary = "Assign an auditor (and optionally manager) to an audit")
    public ResponseEntity<AuditResponse> assign(@PathVariable UUID id, @Valid @RequestBody AssignAuditRequest req) {
        return ResponseEntity.ok(auditService.assign(id, req));
    }

    @PatchMapping("/{id}/status/{newStatus}")
    @Operation(summary = "Change audit status (role-dependent transitions)")
    public ResponseEntity<AuditResponse> changeStatus(
            @PathVariable UUID id,
            @PathVariable AuditStatus newStatus,
            @RequestBody(required = false) ChangeStatusRequest req) {
        return ResponseEntity.ok(auditService.changeStatus(id, newStatus, req));
    }

    @GetMapping("/{id}/history")
    @Operation(summary = "Get status change history for an audit")
    public ResponseEntity<List<AuditHistoryResponse>> history(@PathVariable UUID id) {
        return ResponseEntity.ok(auditService.getHistory(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @Operation(summary = "Cancel an audit")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        auditService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
