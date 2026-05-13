package com.audit.platform.modules.form.repository;

import com.audit.platform.modules.form.domain.AuditForm;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AuditFormRepository extends JpaRepository<AuditForm, UUID> {
    Optional<AuditForm> findByAuditId(UUID auditId);
    boolean existsByAuditId(UUID auditId);
}
