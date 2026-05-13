package com.audit.platform.modules.notification.dto;

import com.audit.platform.modules.notification.domain.NotificationType;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class NotificationResponse {
    private UUID id;
    private NotificationType type;
    private String title;
    private String content;
    private String referenceId;
    private String referenceType;
    private Instant readAt;
    private Instant createdAt;
}
