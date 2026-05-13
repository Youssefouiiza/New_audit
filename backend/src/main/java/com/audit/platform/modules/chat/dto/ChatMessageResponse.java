package com.audit.platform.modules.chat.dto;

import com.audit.platform.modules.chat.domain.MessageType;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class ChatMessageResponse {
    private UUID id;
    private UUID roomId;
    private UUID senderId;
    private String senderName;
    private String content;
    private MessageType messageType;
    private String fileKey;
    private String fileName;
    private String fileUrl;
    private Instant readAt;
    private Instant createdAt;
}
