package com.audit.platform.modules.form.service;

import com.audit.platform.config.SecurityUserDetails;
import com.audit.platform.modules.audit.domain.Audit;
import com.audit.platform.modules.audit.domain.AuditStatus;
import com.audit.platform.modules.audit.repository.AuditRepository;
import com.audit.platform.modules.form.domain.AuditForm;
import com.audit.platform.modules.form.dto.FormResponse;
import com.audit.platform.modules.form.dto.SubmitFormRequest;
import com.audit.platform.modules.form.repository.AuditFormRepository;
import com.audit.platform.modules.notification.domain.NotificationType;
import com.audit.platform.modules.notification.service.NotificationService;
import com.audit.platform.modules.user.domain.UserRole;
import com.audit.platform.modules.user.repository.UserRepository;
import com.audit.platform.shared.exception.ApiException;
import com.audit.platform.shared.exception.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FormService {

    private final AuditFormRepository formRepository;
    private final AuditRepository auditRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    @Transactional
    public FormResponse submit(SubmitFormRequest req) {
        UUID auditId = req.getAuditId();
        Audit audit = auditRepository.findById(auditId)
                .orElseThrow(() -> new ApiException(ErrorCode.AUDIT_001, HttpStatus.NOT_FOUND));

        // Move audit from DRAFT -> PENDING after form submission
        if (audit.getStatus() == AuditStatus.DRAFT) {
            audit.setStatus(AuditStatus.PENDING);
            auditRepository.save(audit);
        }

        String financialJson = null;
        if (req.getFinancialData() != null) {
            try {
                financialJson = objectMapper.writeValueAsString(req.getFinancialData());
            } catch (JsonProcessingException e) {
                financialJson = "{}";
            }
        }

        AuditForm form = formRepository.findByAuditId(auditId).orElse(null);
        if (form == null) {
            form = AuditForm.builder()
                    .audit(audit)
                    .companyName(req.getCompanyName())
                    .legalForm(req.getLegalForm())
                    .siret(req.getSiret())
                    .address(req.getAddress())
                    .revenue(req.getRevenue() != null ? BigDecimal.valueOf(req.getRevenue()) : null)
                    .employees(req.getEmployees())
                    .fiscalYear(req.getFiscalYear())
                    .financialData(financialJson)
                    .submittedAt(Instant.now())
                    .build();
        } else {
            form.setCompanyName(req.getCompanyName());
            form.setLegalForm(req.getLegalForm());
            form.setSiret(req.getSiret());
            form.setAddress(req.getAddress());
            form.setRevenue(req.getRevenue() != null ? BigDecimal.valueOf(req.getRevenue()) : null);
            form.setEmployees(req.getEmployees());
            form.setFiscalYear(req.getFiscalYear());
            form.setFinancialData(financialJson);
            form.setSubmittedAt(Instant.now());
        }
        form = formRepository.save(form);

        // Notify managers
        userRepository.findByRole(UserRole.MANAGER).forEach(m ->
                notificationService.push(m, NotificationType.AUDIT_ASSIGNED,
                        "Formulaire soumis",
                        "Le client a soumis le formulaire pour l'audit : " + audit.getTitle(),
                        auditId.toString(), "AUDIT"));

        return toResponse(form);
    }

    @Transactional(readOnly = true)
    public FormResponse getByAuditId(UUID auditId) {
        AuditForm form = formRepository.findByAuditId(auditId)
                .orElseThrow(() -> new ApiException(ErrorCode.DOC_001, HttpStatus.NOT_FOUND, "Form not found"));
        return toResponse(form);
    }

    @SuppressWarnings("unchecked")
    private FormResponse toResponse(AuditForm f) {
        Map<String, Object> financialData = null;
        if (f.getFinancialData() != null) {
            try {
                financialData = objectMapper.readValue(f.getFinancialData(), Map.class);
            } catch (Exception ignored) {}
        }
        return FormResponse.builder()
                .id(f.getId())
                .auditId(f.getAudit().getId())
                .companyName(f.getCompanyName())
                .legalForm(f.getLegalForm())
                .siret(f.getSiret())
                .address(f.getAddress())
                .revenue(f.getRevenue() != null ? f.getRevenue().doubleValue() : null)
                .employees(f.getEmployees())
                .fiscalYear(f.getFiscalYear())
                .financialData(financialData)
                .submittedAt(f.getSubmittedAt())
                .build();
    }
}
