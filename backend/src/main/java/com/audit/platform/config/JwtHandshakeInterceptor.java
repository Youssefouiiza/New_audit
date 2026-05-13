package com.audit.platform.config;

import com.audit.platform.modules.auth.repository.TokenBlacklistRepository;
import com.audit.platform.modules.user.domain.UserStatus;
import com.audit.platform.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    public static final String ATTR_USER_ID = "WS_USER_ID";

    private final JwtTokenProvider jwtTokenProvider;
    private final TokenBlacklistRepository tokenBlacklistRepository;
    private final UserRepository userRepository;

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes) {
        if (!(request instanceof ServletServerHttpRequest servletRequest)) {
            return false;
        }
        String token = servletRequest.getServletRequest().getParameter("access_token");
        if (token == null || token.isBlank()) {
            return false;
        }
        try {
            String jti = jwtTokenProvider.getJti(token);
            if (tokenBlacklistRepository.existsByJti(jti)) {
                return false;
            }
            UUID userId = jwtTokenProvider.getUserId(token);
            return userRepository.findById(userId)
                    .filter(u -> u.getStatus() == UserStatus.ACTIVE)
                    .map(u -> {
                        attributes.put(ATTR_USER_ID, u.getId());
                        return true;
                    })
                    .orElse(false);
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Exception exception) {
        // no-op
    }
}
