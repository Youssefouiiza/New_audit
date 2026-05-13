package com.audit.platform.modules.user.service;

import com.audit.platform.config.SecurityUserDetails;
import com.audit.platform.modules.user.domain.User;
import com.audit.platform.modules.user.domain.UserRole;
import com.audit.platform.modules.user.domain.UserStatus;
import com.audit.platform.modules.user.dto.CreateUserRequest;
import com.audit.platform.modules.user.dto.UpdateUserRequest;
import com.audit.platform.modules.user.dto.UserResponse;
import com.audit.platform.modules.user.repository.UserRepository;
import com.audit.platform.shared.exception.ApiException;
import com.audit.platform.shared.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectProvider<JavaMailSender> mailSender;

    @Transactional
    public UserResponse createUser(CreateUserRequest req, UUID creatorId) {
        if (userRepository.existsByEmailIgnoreCase(req.getEmail())) {
            throw new ApiException(ErrorCode.USER_002, HttpStatus.CONFLICT);
        }
        User creator = creatorId != null ? userRepository.findById(creatorId).orElse(null) : null;
        User user = User.builder()
                .email(req.getEmail().toLowerCase())
                .fullName(req.getFullName())
                .phone(req.getPhone())
                .role(req.getRole())
                .passwordHash(passwordEncoder.encode(req.getTemporaryPassword()))
                .firstLogin(true)
                .status(UserStatus.ACTIVE)
                .createdBy(creator)
                .build();
        user = userRepository.save(user);
        try {
            sendCredentialsMail(req.getEmail(), req.getTemporaryPassword());
        } catch (Exception e) {
            System.err.println("Warning: Failed to send credentials email to " + req.getEmail() + ": " + e.getMessage());
        }
        return toResponse(user);
    }

    @Transactional(readOnly = true)
    public Page<UserResponse> listUsers(UserRole role, Pageable pageable) {
        if (role != null) {
            return userRepository.findByRole(role, pageable).map(this::toResponse);
        }
        return userRepository.findAll(pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public UserResponse getUser(UUID id) {
        return toResponse(findById(id));
    }

    @Transactional
    public UserResponse updateUser(UUID id, UpdateUserRequest req) {
        User user = findById(id);
        if (req.getFullName() != null) user.setFullName(req.getFullName());
        if (req.getPhone() != null) user.setPhone(req.getPhone());
        if (req.getStatus() != null) user.setStatus(req.getStatus());
        if (req.getClientChatEnabled() != null) user.setClientChatEnabled(req.getClientChatEnabled());
        return toResponse(userRepository.save(user));
    }

    @Transactional
    public void deleteUser(UUID id) {
        User user = findById(id);
        userRepository.delete(user);
    }

    @Transactional
    public UserResponse toggleStatus(UUID id) {
        User user = findById(id);
        user.setStatus(user.getStatus() == UserStatus.ACTIVE ? UserStatus.INACTIVE : UserStatus.ACTIVE);
        return toResponse(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public UserResponse getMe() {
        return toResponse(currentUser());
    }

    private User findById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_001, HttpStatus.NOT_FOUND));
    }

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        SecurityUserDetails details = (SecurityUserDetails) auth.getPrincipal();
        return userRepository.findById(details.getId())
                .orElseThrow(() -> new ApiException(ErrorCode.USER_001, HttpStatus.NOT_FOUND));
    }

    private void sendCredentialsMail(String email, String tempPassword) {
        mailSender.ifAvailable(ms -> {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(email);
            msg.setSubject("Bienvenue sur AuditPro — Vos identifiants");
            msg.setText("Bonjour,\n\nVotre compte a été créé.\nEmail: " + email
                    + "\nMot de passe temporaire: " + tempPassword
                    + "\n\nVous serez invité à changer votre mot de passe à la première connexion.\n\nL'équipe AuditPro");
            ms.send(msg);
        });
    }

    public UserResponse toResponse(User u) {
        return UserResponse.builder()
                .id(u.getId())
                .email(u.getEmail())
                .fullName(u.getFullName())
                .phone(u.getPhone())
                .role(u.getRole())
                .status(u.getStatus())
                .firstLogin(u.isFirstLogin())
                .clientChatEnabled(u.isClientChatEnabled())
                .createdAt(u.getCreatedAt())
                .updatedAt(u.getUpdatedAt())
                .createdById(u.getCreatedBy() != null ? u.getCreatedBy().getId() : null)
                .createdByName(u.getCreatedBy() != null ? u.getCreatedBy().getFullName() : null)
                .build();
    }
}
