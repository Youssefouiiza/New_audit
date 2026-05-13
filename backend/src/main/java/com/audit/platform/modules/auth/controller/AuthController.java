package com.audit.platform.modules.auth.controller;

import com.audit.platform.modules.auth.dto.ChangePasswordRequest;
import com.audit.platform.modules.auth.dto.ForgotPasswordRequest;
import com.audit.platform.modules.auth.dto.LoginRequest;
import com.audit.platform.modules.auth.dto.RefreshRequest;
import com.audit.platform.modules.auth.dto.ResetPasswordRequest;
import com.audit.platform.modules.auth.dto.TokenResponse;
import com.audit.platform.modules.auth.service.AuthService;
import com.audit.platform.config.SecurityUserDetails;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private static final String REFRESH_COOKIE = "refreshToken";

    private final AuthService authService;

    @Value("${app.jwt.refresh-token-days:7}")
    private long refreshTokenDays;

    @PostMapping("/login")
    public TokenResponse login(
            @Valid @RequestBody LoginRequest req,
            HttpServletRequest http,
            HttpServletResponse response) {
        TokenResponse tokens = authService.login(req, http);
        attachRefreshCookie(response, tokens.getRefreshToken());
        return tokens;
    }

    @PostMapping("/refresh")
    public TokenResponse refresh(
            @RequestBody(required = false) RefreshRequest body,
            @CookieValue(value = REFRESH_COOKIE, required = false) String cookieRefresh,
            HttpServletRequest http,
            HttpServletResponse response) {
        String raw = body != null && body.getRefreshToken() != null
                ? body.getRefreshToken()
                : cookieRefresh;
        TokenResponse tokens = authService.refresh(raw, http);
        attachRefreshCookie(response, tokens.getRefreshToken());
        return tokens;
    }

    @PostMapping("/logout")
    public void logout(
            @RequestHeader("Authorization") String authorization,
            HttpServletResponse response) {
        String access = authorization.replace("Bearer ", "");
        authService.logout(access);
        Cookie c = new Cookie(REFRESH_COOKIE, "");
        c.setMaxAge(0);
        c.setPath("/");
        response.addCookie(c);
    }

    @PostMapping("/change-password")
    public void changePassword(
            @Valid @RequestBody ChangePasswordRequest req,
            @AuthenticationPrincipal SecurityUserDetails user) {
        if (user == null) {
            throw new IllegalStateException("Unauthenticated");
        }
        authService.changePassword(req);
    }

    @PostMapping("/forgot-password")
    public void forgotPassword(@Valid @RequestBody ForgotPasswordRequest req, HttpServletRequest http) {
        authService.forgotPassword(req, http);
    }

    @PostMapping("/reset-password")
    public void resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        authService.resetPassword(req);
    }

    private void attachRefreshCookie(HttpServletResponse response, String refreshToken) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE, refreshToken)
                .httpOnly(true)
                .secure(false)
                .path("/")
                .sameSite("Lax")
                .maxAge(Duration.ofDays(refreshTokenDays))
                .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }
}
