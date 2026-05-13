package com.audit.platform.modules.auth.service;

import com.audit.platform.config.AppProperties;
import com.audit.platform.config.JwtTokenProvider;
import com.audit.platform.modules.audit.service.AuditLogService;
import com.audit.platform.modules.auth.domain.RefreshToken;
import com.audit.platform.modules.auth.dto.LoginRequest;
import com.audit.platform.modules.auth.dto.TokenResponse;
import com.audit.platform.modules.auth.repository.PasswordResetTokenRepository;
import com.audit.platform.modules.auth.repository.RefreshTokenRepository;
import com.audit.platform.modules.auth.repository.TokenBlacklistRepository;
import com.audit.platform.modules.user.domain.User;
import com.audit.platform.modules.user.domain.UserRole;
import com.audit.platform.modules.user.domain.UserStatus;
import com.audit.platform.modules.user.repository.UserRepository;
import com.audit.platform.shared.exception.ApiException;
import com.audit.platform.shared.exception.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService Unit Tests")
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private RefreshTokenRepository refreshTokenRepository;
    @Mock
    private TokenBlacklistRepository tokenBlacklistRepository;
    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtTokenProvider jwtTokenProvider;
    @Mock
    private AppProperties appProperties;
    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private AuditLogService auditLogService;
    @Mock
    private ObjectProvider<JavaMailSender> mailSender;
    @Mock
    private HttpServletRequest httpServletRequest;

    @InjectMocks
    private AuthService authService;

    private User activeUser;

    @BeforeEach
    void setUp() {
        activeUser = User.builder()
                .id(UUID.randomUUID())
                .email("test@test.com")
                .passwordHash("hashedPass")
                .role(UserRole.AUDITOR)
                .status(UserStatus.ACTIVE)
                .firstLogin(false)
                .build();
    }

    @Test
    @DisplayName("Login Success")
    void login_Success() {
        // Arrange
        LoginRequest req = new LoginRequest();
        req.setEmail("test@test.com");
        req.setPassword("password");
        when(userRepository.findByEmailIgnoreCase(req.getEmail())).thenReturn(Optional.of(activeUser));
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(null);
        when(jwtTokenProvider.createAccessToken(any(), any(), any(), anyBoolean())).thenReturn("mockedAccessToken");
        
        AppProperties.Jwt jwtProps = new AppProperties.Jwt();
        jwtProps.setRefreshTokenDays(7);
        when(appProperties.getJwt()).thenReturn(jwtProps);

        // Act
        TokenResponse response = authService.login(req, httpServletRequest);

        // Assert
        assertNotNull(response);
        assertEquals("mockedAccessToken", response.getAccessToken());
        assertNotNull(response.getRefreshToken());
        verify(refreshTokenRepository).save(any(RefreshToken.class));
        verify(auditLogService).log(any(), eq("LOGIN"), eq("AUTH"), any(), eq(httpServletRequest));
    }

    @Test
    @DisplayName("Login with inactive user should fail")
    void login_InactiveUser() {
        // Arrange
        activeUser.setStatus(UserStatus.INACTIVE);
        LoginRequest req = new LoginRequest();
        req.setEmail("test@test.com");
        req.setPassword("password");
        when(userRepository.findByEmailIgnoreCase(req.getEmail())).thenReturn(Optional.of(activeUser));

        // Act & Assert
        ApiException ex = assertThrows(ApiException.class, () -> authService.login(req, httpServletRequest));
        assertEquals(ErrorCode.AUTH_003, ex.getErrorCode());
        verify(auditLogService).log(any(), eq("LOGIN_BLOCKED"), eq("AUTH"), any(), eq(httpServletRequest));
    }

    @Test
    @DisplayName("Login with invalid credentials should fail")
    void login_InvalidCredentials() {
        // Arrange
        LoginRequest req = new LoginRequest();
        req.setEmail("test@test.com");
        req.setPassword("wrongpassword");
        when(userRepository.findByEmailIgnoreCase(req.getEmail())).thenReturn(Optional.of(activeUser));
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new RuntimeException("Bad credentials"));

        // Act & Assert
        ApiException ex = assertThrows(ApiException.class, () -> authService.login(req, httpServletRequest));
        assertEquals(ErrorCode.AUTH_001, ex.getErrorCode());
        verify(auditLogService).log(any(), eq("LOGIN_FAILED"), eq("AUTH"), any(), eq(httpServletRequest));
    }
}
