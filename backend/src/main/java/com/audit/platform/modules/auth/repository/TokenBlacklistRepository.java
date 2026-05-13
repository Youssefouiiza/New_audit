package com.audit.platform.modules.auth.repository;

import com.audit.platform.modules.auth.domain.TokenBlacklist;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TokenBlacklistRepository extends JpaRepository<TokenBlacklist, UUID> {

    boolean existsByJti(String jti);

    Optional<TokenBlacklist> findByJti(String jti);
}
