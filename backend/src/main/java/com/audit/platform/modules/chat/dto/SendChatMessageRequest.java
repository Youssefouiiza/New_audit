package com.audit.platform.modules.chat.dto;

import com.audit.platform.modules.chat.domain.MessageType;
import lombok.Data;

import java.util.UUID;

@Data
public class SendChatMessageRequest {
    private UUID roomId;
    private String content;
    private MessageType messageType;
    private String fileKey;
    private String fileName;
}
