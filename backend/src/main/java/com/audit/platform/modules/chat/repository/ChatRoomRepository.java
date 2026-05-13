package com.audit.platform.modules.chat.repository;

import com.audit.platform.modules.chat.domain.ChatRoom;
import com.audit.platform.modules.chat.domain.RoomType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ChatRoomRepository extends JpaRepository<ChatRoom, UUID> {
    Optional<ChatRoom> findByAuditIdAndRoomType(UUID auditId, RoomType type);
}
