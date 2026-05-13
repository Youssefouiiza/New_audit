package com.audit.platform.modules.document.repository;

import com.audit.platform.modules.document.domain.Document;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<Document, UUID> {
    List<Document> findByAuditId(UUID auditId);
}
