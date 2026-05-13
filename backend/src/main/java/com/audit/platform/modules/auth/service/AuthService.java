package com.audit.platform.modules.auth.service;

import com.audit.platform.config.AppProperties;
import com.audit.platform.config.JwtTokenProvider;
import com.audit.platform.config.SecurityUserDetails;
import com.audit.platform.modules.audit.service.AuditLogService;
import com.audit.platform.modules.auth.domain.PasswordResetToken;
import com.audit.platform.modules.auth.domain.RefreshToken;
import com.audit.platform.modules.auth.domain.TokenBlacklist;
import com.audit.platform.modules.auth.dto.ChangePasswordRequest;
import com.audit.platform.modules.auth.dto.ForgotPasswordRequest;
import com.audit.platform.modules.auth.dto.LoginRequest;
import com.audit.platform.modules.auth.dto.ResetPasswordRequest;
import com.audit.platform.modules.auth.dto.TokenResponse;
import com.audit.platform.modules.auth.repository.PasswordResetTokenRepository;
import com.audit.platform.modules.auth.repository.RefreshTokenRepository;
import com.audit.platform.modules.auth.repository.TokenBlacklistRepository;
import com.audit.platform.modules.user.domain.User;
import com.audit.platform.modules.user.domain.UserStatus;
import com.audit.platform.modules.user.repository.UserRepository;
import com.audit.platform.shared.exception.ApiException;
import com.audit.platform.shared.exception.ErrorCode;
import com.audit.platform.shared.utils.HashUtils;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final TokenBlacklistRepository tokenBlacklistRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AppProperties appProperties;
    private final AuthenticationManager authenticationManager;
    private final AuditLogService auditLogService;
    private final ObjectProvider<JavaMailSender> mailSender;

    @Transactional
    public TokenResponse login(LoginRequest req, HttpServletRequest http) {
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(req.getEmail());
        if (userOpt.isEmpty()) {
            auditLogService.log(Optional.empty(), "LOGIN_FAILED", "AUTH", null, http);
            throw new ApiException(ErrorCode.AUTH_001, HttpStatus.UNAUTHORIZED);
        }
        User user = userOpt.get();
        if (user.getStatus() != UserStatus.ACTIVE) {
            auditLogService.log(Optional.of(user), "LOGIN_BLOCKED", "AUTH", user.getId().toString(), http);
            throw new ApiException(ErrorCode.AUTH_003, HttpStatus.FORBIDDEN);
        }
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(req.getEmail(), req.getPassword()));
        } catch (Exception e) {
            auditLogService.log(Optional.of(user), "LOGIN_FAILED", "AUTH", user.getId().toString(), http);
            throw new ApiException(ErrorCode.AUTH_001, HttpStatus.UNAUTHORIZED);
        }
        return buildTokens(user, http, "LOGIN");
    }

    @Transactional
    public TokenResponse refresh(String refreshTokenRaw, HttpServletRequest http) {
        if (refreshTokenRaw == null || refreshTokenRaw.isBlank()) {
            throw new ApiException(ErrorCode.AUTH_002, HttpStatus.UNAUTHORIZED);
        }
        String hash = HashUtils.sha256Hex(refreshTokenRaw);
        RefreshToken rt = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new ApiException(ErrorCode.AUTH_002, HttpStatus.UNAUTHORIZED));
        if (rt.isRevoked() || rt.getExpiresAt().isBefore(Instant.now())) {
            throw new ApiException(ErrorCode.AUTH_002, HttpStatus.UNAUTHORIZED);
        }
        User user = rt.getUser();
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(ErrorCode.AUTH_003, HttpStatus.FORBIDDEN);
        }
        rt.setRevoked(true);
        refreshTokenRepository.save(rt);
        return buildTokens(user, http, "REFRESH");
    }

    @Transactional
    public void logout(String accessToken) {
        Claims c = jwtTokenProvider.parse(accessToken);
        String jti = c.getId();
        Instant exp = c.getExpiration().toInstant();
        if (!tokenBlacklistRepository.existsByJti(jti)) {
            tokenBlacklistRepository.save(TokenBlacklist.builder()
                    .jti(jti)
                    .expiresAt(exp)
                    .createdAt(Instant.now())
                    .build());
        }
    }

    @Transactional
    public void changePassword(ChangePasswordRequest req) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        SecurityUserDetails details = (SecurityUserDetails) auth.getPrincipal();
        User user = userRepository.findById(details.getId())
                .orElseThrow(() -> new ApiException(ErrorCode.USER_001, HttpStatus.NOT_FOUND));
        if (user.isFirstLogin()) {
            if (req.getCurrentPassword() != null && !req.getCurrentPassword().isBlank()) {
                if (!passwordEncoder.matches(req.getCurrentPassword(), user.getPasswordHash())) {
                    throw new ApiException(ErrorCode.AUTH_001, HttpStatus.UNAUTHORIZED);
                }
            }
        } else {
            if (req.getCurrentPassword() == null || !passwordEncoder.matches(req.getCurrentPassword(), user.getPasswordHash())) {
                throw new ApiException(ErrorCode.AUTH_001, HttpStatus.UNAUTHORIZED);
            }
        }
        user.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
        user.setFirstLogin(false);
        userRepository.save(user);
    }

    @Transactional
    public void forgotPassword(ForgotPasswordRequest req, HttpServletRequest http) {
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(req.getEmail());
        if (userOpt.isEmpty()) {
            return;
        }
        User user = userOpt.get();
        String raw = UUID.randomUUID().toString() + ":" + System.nanoTime();
        String hash = HashUtils.sha256Hex(raw);
        PasswordResetToken prt = PasswordResetToken.builder()
                .user(user)
                .tokenHash(hash)
                .expiresAt(Instant.now().plus(1, ChronoUnit.HOURS))
                .used(false)
                .build();
        passwordResetTokenRepository.save(prt);
        String link = "http://localhost:3000/reset-password?token=" + raw;
        mailSender.ifAvailable(ms -> {
            SimpleMailMessage m = new SimpleMailMessage();
            m.setTo(user.getEmail());
            m.setSubject("Password reset");
            m.setText("Reset link (valid 1h): " + link);
            ms.send(m);
        });
        auditLogService.log(Optional.of(user), "PASSWORD_RESET_REQUEST", "AUTH", user.getId().toString(), http);
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest req) {
        String hash = HashUtils.sha256Hex(req.getToken());
        PasswordResetToken prt = passwordResetTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new ApiException(ErrorCode.AUTH_002, HttpStatus.UNAUTHORIZED));
        if (prt.isUsed() || prt.getExpiresAt().isBefore(Instant.now())) {
            throw new ApiException(ErrorCode.AUTH_002, HttpStatus.UNAUTHORIZED);
        }
        User user = prt.getUser();
        user.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
        user.setFirstLogin(false);
        userRepository.save(user);
        prt.setUsed(true);
        passwordResetTokenRepository.save(prt);
    }

    private TokenResponse buildTokens(User user, HttpServletRequest http, String action) {
        String access = jwtTokenProvider.createAccessToken(
                user.getId(), user.getEmail(), user.getRole(), user.isFirstLogin());
        String refreshRaw = UUID.randomUUID().toString() + "-" + UUID.randomUUID();
        String rHash = HashUtils.sha256Hex(refreshRaw);
        Instant exp = Instant.now().plus(appProperties.getJwt().getRefreshTokenDays(), ChronoUnit.DAYS);
        refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .tokenHash(rHash)
                .expiresAt(exp)
                .revoked(false)
                .deviceInfo(http.getHeader("User-Agent"))
                .build());
        auditLogService.log(Optional.of(user), action, "AUTH", user.getId().toString(), http);
        return TokenResponse.builder()
                .accessToken(access)
                .refreshToken(refreshRaw)
                .firstLogin(user.isFirstLogin())
                .role(user.getRole().name())
                .build();
    }
}
