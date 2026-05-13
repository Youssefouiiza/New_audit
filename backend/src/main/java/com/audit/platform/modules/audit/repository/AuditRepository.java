package com.audit.platform.modules.audit.repository;

import com.audit.platform.modules.audit.domain.Audit;
import com.audit.platform.modules.audit.domain.AuditStatus;
import com.audit.platform.modules.user.domain.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface AuditRepository extends JpaRepository<Audit, UUID> {

    Page<Audit> findByClient(User client, Pageable pageable);

    Page<Audit> findByAuditor(User auditor, Pageable pageable);

    Page<Audit> findByManager(User manager, Pageable pageable);

    Page<Audit> findByStatus(AuditStatus status, Pageable pageable);

    @Query("SELECT a FROM Audit a WHERE a.auditor IS NULL AND a.status = 'PENDING'")
    Page<Audit> findUnassigned(Pageable pageable);

    long countByStatus(AuditStatus status);

    long countByAuditorAndStatusIn(User auditor, List<AuditStatus> statuses);

    @Query("SELECT a FROM Audit a WHERE a.client.id = :clientId")
    Page<Audit> findByClientId(@Param("clientId") UUID clientId, Pageable pageable);

    @Query("SELECT a FROM Audit a WHERE a.auditor IS NULL AND a.status NOT IN ('COMPLETED','CANCELLED')")
    List<Audit> findAllUnassigned();
}
