package com.audit.platform.modules.ai.controller;

import com.audit.platform.modules.ai.dto.AiResultResponse;
import com.audit.platform.modules.ai.service.AiService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Tag(name = "AI", description = "AI Analysis results")
public class AiController {

    private final AiService aiService;

    @GetMapping("/result/{auditId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AUDITOR')")
    @Operation(summary = "Get the AI analysis result for a specific audit")
    public ResponseEntity<AiResultResponse> getResult(@PathVariable UUID auditId) {
        return ResponseEntity.ok(aiService.getByAuditId(auditId));
    }

    @PostMapping("/analyze/{auditId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AUDITOR')")
    @Operation(summary = "Trigger manual AI analysis for an audit")
    public ResponseEntity<Void> triggerAnalysis(@PathVariable UUID auditId) {
        aiService.analyzeAuditAsync(auditId);
        return ResponseEntity.accepted().build();
    }
}
