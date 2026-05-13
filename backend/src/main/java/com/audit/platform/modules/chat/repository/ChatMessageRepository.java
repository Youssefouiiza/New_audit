package com.audit.platform.modules.chat.repository;

import com.audit.platform.modules.chat.domain.ChatMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {
    Page<ChatMessage> findByRoomIdOrderByCreatedAtDesc(UUID roomId, Pageable pageable);
}
