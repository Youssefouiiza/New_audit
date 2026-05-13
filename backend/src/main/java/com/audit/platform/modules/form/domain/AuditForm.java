package com.audit.platform.modules.form.domain;

import com.audit.platform.modules.audit.domain.Audit;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "forms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditForm {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "audit_id", nullable = false, unique = true)
    private Audit audit;

    @Column(name = "company_name", nullable = false)
    private String companyName;

    @Column(name = "legal_form")
    private String legalForm;

    private String siret;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(precision = 19, scale = 2)
    private BigDecimal revenue;

    private Integer employees;

    @Column(name = "fiscal_year")
    private Integer fiscalYear;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "financial_data", columnDefinition = "jsonb")
    private String financialData;

    @Column(name = "submitted_at")
    private Instant submittedAt;
}
