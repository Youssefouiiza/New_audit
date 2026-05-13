package com.audit.platform.modules.auth.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class TokenResponse {
    String accessToken;
    String refreshToken;
    boolean firstLogin;
    String role;
}
