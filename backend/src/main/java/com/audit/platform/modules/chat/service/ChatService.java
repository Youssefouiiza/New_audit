package com.audit.platform.modules.chat.service;

import com.audit.platform.config.AppProperties;
import com.audit.platform.config.SecurityUserDetails;
import com.audit.platform.modules.audit.domain.Audit;
import com.audit.platform.modules.audit.repository.AuditRepository;
import com.audit.platform.modules.chat.domain.ChatMessage;
import com.audit.platform.modules.chat.domain.ChatRoom;
import com.audit.platform.modules.chat.domain.RoomType;
import com.audit.platform.modules.chat.dto.ChatMessageResponse;
import com.audit.platform.modules.chat.dto.ChatRoomResponse;
import com.audit.platform.modules.chat.dto.SendChatMessageRequest;
import com.audit.platform.modules.chat.repository.ChatMessageRepository;
import com.audit.platform.modules.chat.repository.ChatRoomRepository;
import com.audit.platform.modules.document.service.MinioStorageService;
import com.audit.platform.modules.notification.domain.NotificationType;
import com.audit.platform.modules.notification.service.NotificationService;
import com.audit.platform.modules.user.domain.User;
import com.audit.platform.modules.user.repository.UserRepository;
import com.audit.platform.shared.exception.ApiException;
import com.audit.platform.shared.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatRoomRepository chatRoomRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final AuditRepository auditRepository;
    private final MinioStorageService storageService;
    private final NotificationService notificationService;
    private final AppProperties appProperties;

    @Transactional
    public ChatRoomResponse getOrCreateAuditRoom(UUID auditId) {
        Audit audit = auditRepository.findById(auditId)
                .orElseThrow(() -> new ApiException(ErrorCode.AUDIT_001, HttpStatus.NOT_FOUND));
        
        ChatRoom room = chatRoomRepository.findByAuditIdAndRoomType(auditId, RoomType.AUDIT)
                .orElseGet(() -> {
                    ChatRoom newRoom = ChatRoom.builder()
                            .roomType(RoomType.AUDIT)
                            .audit(audit)
                            .participantA(audit.getClient())
                            .participantB(audit.getAuditor())
                            .build();
                    return chatRoomRepository.save(newRoom);
                });
        return toRoomResponse(room);
    }

    @Transactional
    public ChatMessageResponse saveMessage(UUID roomId, SendChatMessageRequest req, UUID senderId) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ApiException(ErrorCode.CHAT_001, HttpStatus.NOT_FOUND, "Room not found"));
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_001, HttpStatus.NOT_FOUND));

        ChatMessage msg = ChatMessage.builder()
                .room(room)
                .sender(sender)
                .content(req.getContent())
                .messageType(req.getMessageType())
                .fileKey(req.getFileKey())
                .fileName(req.getFileName())
                .build();
        msg = chatMessageRepository.save(msg);

        // Determine recipient to push notification
        User recipient = room.getParticipantA().getId().equals(senderId) ? room.getParticipantB() : room.getParticipantA();
        if (recipient != null) {
            String refId = room.getAudit() != null ? room.getAudit().getId().toString() : roomId.toString();
            notificationService.push(recipient, NotificationType.NEW_MESSAGE,
                    "Nouveau message",
                    "Vous avez reçu un nouveau message de " + sender.getFullName(),
                    refId, "CHAT");
        }

        return toMessageResponse(msg);
    }

    @Transactional(readOnly = true)
    public Page<ChatMessageResponse> getRoomMessages(UUID roomId, Pageable pageable) {
        return chatMessageRepository.findByRoomIdOrderByCreatedAtDesc(roomId, pageable)
                .map(this::toMessageResponse);
    }

    private ChatRoomResponse toRoomResponse(ChatRoom r) {
        return ChatRoomResponse.builder()
                .id(r.getId())
                .roomType(r.getRoomType())
                .auditId(r.getAudit() != null ? r.getAudit().getId() : null)
                .auditTitle(r.getAudit() != null ? r.getAudit().getTitle() : null)
                .participantAId(r.getParticipantA() != null ? r.getParticipantA().getId() : null)
                .participantAName(r.getParticipantA() != null ? r.getParticipantA().getFullName() : null)
                .participantBId(r.getParticipantB() != null ? r.getParticipantB().getId() : null)
                .participantBName(r.getParticipantB() != null ? r.getParticipantB().getFullName() : null)
                .createdAt(r.getCreatedAt())
                .build();
    }

    public ChatMessageResponse toMessageResponse(ChatMessage m) {
        String fileUrl = null;
        if (m.getFileKey() != null) {
            fileUrl = storageService.presignedGetUrl(appProperties.getMinio().getBuckets().getChatFiles(), m.getFileKey());
        }
        return ChatMessageResponse.builder()
                .id(m.getId())
                .roomId(m.getRoom().getId())
                .senderId(m.getSender().getId())
                .senderName(m.getSender().getFullName())
                .content(m.getContent())
                .messageType(m.getMessageType())
                .fileKey(m.getFileKey())
                .fileName(m.getFileName())
                .fileUrl(fileUrl)
                .readAt(m.getReadAt())
                .createdAt(m.getCreatedAt())
                .build();
    }
}
