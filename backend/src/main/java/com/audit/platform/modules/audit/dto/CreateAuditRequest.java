package com.audit.platform.modules.audit.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class CreateAuditRequest {
    @NotBlank
    private String title;
    private String description;
    private UUID clientId;   // Optional: if null, service uses current user (CLIENT role)
    private LocalDate deadline;
}
