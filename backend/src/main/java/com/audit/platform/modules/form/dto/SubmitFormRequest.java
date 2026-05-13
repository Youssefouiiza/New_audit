package com.audit.platform.modules.form.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.util.Map;
import java.util.UUID;

@Data
public class SubmitFormRequest {
    @NotNull
    private UUID auditId;
    @NotBlank
    private String companyName;
    @NotBlank
    private String legalForm;
    private String siret;
    private String address;
    @Positive
    private Double revenue;
    @Positive
    private Integer employees;
    private Integer fiscalYear;
    private Map<String, Object> financialData;
}
