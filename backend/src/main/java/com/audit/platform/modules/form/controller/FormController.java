package com.audit.platform.modules.form.controller;

import com.audit.platform.modules.form.dto.FormResponse;
import com.audit.platform.modules.form.dto.SubmitFormRequest;
import com.audit.platform.modules.form.service.FormService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/forms")
@RequiredArgsConstructor
@Tag(name = "Forms", description = "Client commercial form management")
public class FormController {

    private final FormService formService;

    @PostMapping
    @PreAuthorize("hasRole('CLIENT')")
    @Operation(summary = "Submit or update the commercial form for an audit")
    public ResponseEntity<FormResponse> submit(@Valid @RequestBody SubmitFormRequest req) {
        return ResponseEntity.ok(formService.submit(req));
    }

    @GetMapping("/audit/{auditId}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','AUDITOR','CLIENT')")
    @Operation(summary = "Get the submitted form for a given audit")
    public ResponseEntity<FormResponse> get(@PathVariable UUID auditId) {
        return ResponseEntity.ok(formService.getByAuditId(auditId));
    }
}
