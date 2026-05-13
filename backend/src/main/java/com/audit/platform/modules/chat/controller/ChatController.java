package com.audit.platform.modules.chat.controller;

import com.audit.platform.config.SecurityUserDetails;
import com.audit.platform.modules.chat.dto.ChatMessageResponse;
import com.audit.platform.modules.chat.dto.ChatRoomResponse;
import com.audit.platform.modules.chat.dto.SendChatMessageRequest;
import com.audit.platform.modules.chat.service.ChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@Tag(name = "Chat", description = "Real-time Chat via WebSocket and REST API")
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    // ── REST ──────────────────────────────────────────────────────────────────

    /** Get or create the AUDIT chat room — used when opening a dossier */
    @GetMapping("/room/audit/{auditId}")
    @PreAuthorize("hasAnyRole('AUDITOR', 'CLIENT', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Get or create primary chat room for an audit")
    public ResponseEntity<ChatRoomResponse> getAuditRoom(@PathVariable UUID auditId) {
        return ResponseEntity.ok(chatService.getOrCreateAuditRoom(auditId));
    }

    /** Paginated message history for a room */
    @GetMapping("/rooms/{roomId}/messages")
    @PreAuthorize("hasAnyRole('AUDITOR', 'CLIENT', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Get paginated chat history for a room")
    public ResponseEntity<Page<ChatMessageResponse>> getMessages(
            @PathVariable UUID roomId,
            Pageable pageable) {
        return ResponseEntity.ok(chatService.getRoomMessages(roomId, pageable));
    }

    /**
     * REST send-message endpoint (WebSocket fallback).
     * The frontend uses this when WebSocket/STOMP is not connected.
     * Also broadcasts via WebSocket so other subscribers receive it live.
     */
    @PostMapping("/rooms/{roomId}/messages")
    @PreAuthorize("hasAnyRole('AUDITOR', 'CLIENT', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Send a chat message via REST (WebSocket fallback)")
    public ResponseEntity<ChatMessageResponse> sendMessageRest(
            @PathVariable UUID roomId,
            @RequestBody SendChatMessageRequest request,
            Authentication authentication) {

        SecurityUserDetails userDetails = (SecurityUserDetails) authentication.getPrincipal();
        // Ensure roomId is consistent even if body omits it
        if (request.getRoomId() == null) request.setRoomId(roomId);

        ChatMessageResponse response = chatService.saveMessage(roomId, request, userDetails.getId());

        // Best-effort WebSocket broadcast so the other participant sees it live
        try {
            messagingTemplate.convertAndSend("/topic/room." + roomId, response);
        } catch (Exception e) {
            log.warn("WebSocket broadcast skipped: {}", e.getMessage());
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ── WEBSOCKET (STOMP) ─────────────────────────────────────────────────────

    @MessageMapping("/chat.send/{roomId}")
    public void sendMessageWs(
            @DestinationVariable UUID roomId,
            @Payload SendChatMessageRequest request,
            Authentication authentication) {

        SecurityUserDetails userDetails = (SecurityUserDetails) authentication.getPrincipal();
        try {
            ChatMessageResponse response = chatService.saveMessage(roomId, request, userDetails.getId());
            messagingTemplate.convertAndSend("/topic/room." + roomId, response);
        } catch (Exception e) {
            log.error("Failed to process WebSocket message: {}", e.getMessage(), e);
        }
    }
}
