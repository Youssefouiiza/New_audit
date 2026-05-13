package com.audit.platform.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
public class AuthRateLimitFilter extends OncePerRequestFilter {

    private final AppProperties appProperties;

    private static final class Window {
        long windowStartEpochSecond;
        int count;
    }

    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !path.contains("/api/auth/");
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {
        String ip = clientIp(request);
        int max = appProperties.getRateLimit().getAuthPerMinute();
        long now = Instant.now().getEpochSecond();
        long minute = now / 60;
        String key = ip + ":" + minute;
        Window w = windows.computeIfAbsent(key, k -> {
            Window nw = new Window();
            nw.windowStartEpochSecond = minute * 60;
            nw.count = 0;
            return nw;
        });
        synchronized (w) {
            if (w.count >= max) {
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                return;
            }
            w.count++;
        }
        filterChain.doFilter(request, response);
    }

    private String clientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
