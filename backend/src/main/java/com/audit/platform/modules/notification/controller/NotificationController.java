package com.audit.platform.modules.notification.controller;

import com.audit.platform.config.SecurityUserDetails;
import com.audit.platform.modules.notification.dto.NotificationResponse;
import com.audit.platform.modules.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "In-app notifications")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @Operation(summary = "Get all notifications for current user")
    public ResponseEntity<List<NotificationResponse>> getAll(Authentication auth) {
        UUID userId = ((SecurityUserDetails) auth.getPrincipal()).getId();
        return ResponseEntity.ok(notificationService.getMyNotifications(userId));
    }

    @GetMapping("/unread")
    @Operation(summary = "Get unread notifications")
    public ResponseEntity<List<NotificationResponse>> getUnread(Authentication auth) {
        UUID userId = ((SecurityUserDetails) auth.getPrincipal()).getId();
        return ResponseEntity.ok(notificationService.getUnread(userId));
    }

    @PatchMapping("/{id}/read")
    @Operation(summary = "Mark a notification as read")
    public ResponseEntity<Void> markRead(@PathVariable UUID id) {
        notificationService.markRead(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/read-all")
    @Operation(summary = "Mark all notifications as read")
    public ResponseEntity<Void> markAllRead(Authentication auth) {
        UUID userId = ((SecurityUserDetails) auth.getPrincipal()).getId();
        notificationService.markAllRead(userId);
        return ResponseEntity.noContent().build();
    }
}
