package com.audit.platform.modules.user.dto;

import com.audit.platform.modules.user.domain.UserStatus;
import lombok.Data;

@Data
public class UpdateUserRequest {
    private String fullName;
    private String phone;
    private UserStatus status;
    private Boolean clientChatEnabled;
}
