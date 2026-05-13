package com.audit.platform.modules.report.repository;

import com.audit.platform.modules.report.domain.Report;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ReportRepository extends JpaRepository<Report, UUID> {
    Optional<Report> findByAuditId(UUID auditId);
}
