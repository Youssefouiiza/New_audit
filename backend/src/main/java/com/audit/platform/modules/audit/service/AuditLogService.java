package com.audit.platform.modules.audit.service;

import com.audit.platform.modules.audit.domain.AuditLog;
import com.audit.platform.modules.audit.repository.AuditLogRepository;
import com.audit.platform.modules.user.domain.User;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Transactional
    public void log(Optional<User> user, String action, String resourceType, String resourceId,
                    HttpServletRequest request) {
        AuditLog entry = AuditLog.builder()
                .user(user.orElse(null))
                .action(action)
                .resourceType(resourceType)
                .resourceId(resourceId)
                .ipAddress(clientIp(request))
                .userAgent(request.getHeader("User-Agent"))
                .createdAt(Instant.now())
                .build();
        auditLogRepository.save(entry);
    }

    private String clientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
