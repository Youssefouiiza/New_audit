package com.audit.platform.modules.chat.dto;

import com.audit.platform.modules.chat.domain.RoomType;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class ChatRoomResponse {
    private UUID id;
    private RoomType roomType;
    private UUID auditId;
    private String auditTitle;
    private UUID participantAId;
    private String participantAName;
    private UUID participantBId;
    private String participantBName;
    private Instant createdAt;
}
