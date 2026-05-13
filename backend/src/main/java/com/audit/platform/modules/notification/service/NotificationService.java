package com.audit.platform.modules.notification.service;

import com.audit.platform.modules.notification.domain.Notification;
import com.audit.platform.modules.notification.domain.NotificationType;
import com.audit.platform.modules.notification.dto.NotificationResponse;
import com.audit.platform.modules.notification.repository.NotificationRepository;
import com.audit.platform.modules.user.domain.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final ObjectProvider<SimpMessagingTemplate> messagingTemplate;

    @Transactional
    public void push(User user, NotificationType type, String title, String content, String refId, String refType) {
        Notification notif = Notification.builder()
                .user(user)
                .type(type)
                .title(title)
                .content(content)
                .referenceId(refId)
                .referenceType(refType)
                .build();
        notif = notificationRepository.save(notif);
        // Push via WebSocket
        NotificationResponse resp = toResponse(notif);
        messagingTemplate.ifAvailable(t -> {
            try {
                t.convertAndSendToUser(user.getId().toString(),
                        "/queue/notifications." + user.getId(), resp);
            } catch (Exception e) {
                log.warn("WS push failed for user {}: {}", user.getId(), e.getMessage());
            }
        });
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getMyNotifications(UUID userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getUnread(UUID userId) {
        return notificationRepository.findByUserIdAndReadAtIsNullOrderByCreatedAtDesc(userId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public void markRead(UUID notifId) {
        notificationRepository.findById(notifId).ifPresent(n -> {
            n.setReadAt(Instant.now());
            notificationRepository.save(n);
        });
    }

    @Transactional
    public void markAllRead(UUID userId) {
        notificationRepository.findByUserIdAndReadAtIsNullOrderByCreatedAtDesc(userId)
                .forEach(n -> {
                    n.setReadAt(Instant.now());
                    notificationRepository.save(n);
                });
    }

    private NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .type(n.getType())
                .title(n.getTitle())
                .content(n.getContent())
                .referenceId(n.getReferenceId())
                .referenceType(n.getReferenceType())
                .readAt(n.getReadAt())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
