package com.audit.platform.modules.audit.repository;

import com.audit.platform.modules.audit.domain.AuditHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AuditHistoryRepository extends JpaRepository<AuditHistory, UUID> {
    List<AuditHistory> findByAuditIdOrderByCreatedAtDesc(UUID auditId);
}
