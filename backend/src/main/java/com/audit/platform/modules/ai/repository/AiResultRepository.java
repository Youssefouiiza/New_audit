package com.audit.platform.modules.ai.repository;

import com.audit.platform.modules.ai.domain.AiResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AiResultRepository extends JpaRepository<AiResult, UUID> {
    Optional<AiResult> findByAuditId(UUID auditId);
}
