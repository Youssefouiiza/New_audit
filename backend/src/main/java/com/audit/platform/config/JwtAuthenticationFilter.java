package com.audit.platform.config;

import com.audit.platform.modules.auth.repository.TokenBlacklistRepository;
import com.audit.platform.modules.user.domain.User;
import com.audit.platform.modules.user.domain.UserStatus;
import com.audit.platform.modules.user.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final TokenBlacklistRepository tokenBlacklistRepository;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }
        String token = header.substring(7);
        try {
            String jti = jwtTokenProvider.getJti(token);
            if (tokenBlacklistRepository.existsByJti(jti)) {
                response.setStatus(HttpStatus.UNAUTHORIZED.value());
                return;
            }
            UUID userId = jwtTokenProvider.getUserId(token);
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isEmpty()) {
                response.setStatus(HttpStatus.UNAUTHORIZED.value());
                return;
            }
            User user = userOpt.get();
            if (user.getStatus() != UserStatus.ACTIVE) {
                response.setStatus(HttpStatus.FORBIDDEN.value());
                return;
            }
            SecurityUserDetails details = new SecurityUserDetails(user);
            var auth = new UsernamePasswordAuthenticationToken(
                    details, null, details.getAuthorities());
            auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(auth);
        } catch (Exception e) {
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            return;
        }
        filterChain.doFilter(request, response);
    }
}
