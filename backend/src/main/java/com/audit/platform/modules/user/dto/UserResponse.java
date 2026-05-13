package com.audit.platform.modules.user.dto;

import com.audit.platform.modules.user.domain.UserRole;
import com.audit.platform.modules.user.domain.UserStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class UserResponse {
    private UUID id;
    private String email;
    private String fullName;
    private String phone;
    private UserRole role;
    private UserStatus status;
    private boolean firstLogin;
    private boolean clientChatEnabled;
    private Instant createdAt;
    private Instant updatedAt;
    private UUID createdById;
    private String createdByName;
}
