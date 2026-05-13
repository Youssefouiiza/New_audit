package com.audit.platform.modules.form.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
public class FormResponse {
    private UUID id;
    private UUID auditId;
    private String companyName;
    private String legalForm;
    private String siret;
    private String address;
    private Double revenue;
    private Integer employees;
    private Integer fiscalYear;
    private Map<String, Object> financialData;
    private Instant submittedAt;
}
