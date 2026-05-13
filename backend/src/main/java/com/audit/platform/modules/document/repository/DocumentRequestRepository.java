package com.audit.platform.modules.document.repository;

import com.audit.platform.modules.document.domain.DocumentRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DocumentRequestRepository extends JpaRepository<DocumentRequest, UUID> {
    List<DocumentRequest> findByAuditId(UUID auditId);
}
