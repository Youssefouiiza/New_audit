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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserService Unit Tests")
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private ObjectProvider<JavaMailSender> mailSender;

    @InjectMocks
    private UserService userService;

    private User adminUser;
    private User regularUser;
    private UUID adminId;
    private UUID regularUserId;

    @BeforeEach
    void setUp() {
        adminId = UUID.randomUUID();
        adminUser = User.builder()
                .id(adminId)
                .email("admin@test.com")
                .fullName("Admin Test")
                .role(UserRole.ADMIN)
                .status(UserStatus.ACTIVE)
                .build();

        regularUserId = UUID.randomUUID();
        regularUser = User.builder()
                .id(regularUserId)
                .email("user@test.com")
                .fullName("User Test")
                .role(UserRole.AUDITOR)
                .status(UserStatus.ACTIVE)
                .build();
    }

    private void mockSecurityContext(User user) {
        SecurityUserDetails details = new SecurityUserDetails(user);
        Authentication authentication = new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities());
        SecurityContext securityContext = mock(SecurityContext.class);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
    }

    @Test
    @DisplayName("Should successfully create a user")
    void createUser_Success() {
        // Arrange
        CreateUserRequest req = new CreateUserRequest();
        req.setEmail("new@test.com");
        req.setFullName("New User");
        req.setRole(UserRole.AUDITOR);
        req.setTemporaryPassword("tempPass");

        when(userRepository.existsByEmailIgnoreCase(req.getEmail())).thenReturn(false);
        when(userRepository.findById(adminId)).thenReturn(Optional.of(adminUser));
        when(passwordEncoder.encode(req.getTemporaryPassword())).thenReturn("hashedPass");
        
        User savedUser = User.builder()
                .id(UUID.randomUUID())
                .email(req.getEmail().toLowerCase())
                .fullName(req.getFullName())
                .role(req.getRole())
                .status(UserStatus.ACTIVE)
                .createdBy(adminUser)
                .build();
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        // Act
        UserResponse response = userService.createUser(req, adminId);

        // Assert
        assertNotNull(response);
        assertEquals(req.getEmail(), response.getEmail());
        assertEquals(req.getFullName(), response.getFullName());
        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("Should throw exception when creating user with existing email")
    void createUser_EmailAlreadyExists() {
        // Arrange
        CreateUserRequest req = new CreateUserRequest();
        req.setEmail("admin@test.com");

        when(userRepository.existsByEmailIgnoreCase(req.getEmail())).thenReturn(true);

        // Act & Assert
        ApiException ex = assertThrows(ApiException.class, () -> userService.createUser(req, adminId));
        assertEquals(ErrorCode.USER_002, ex.getErrorCode());
    }

    @Test
    @DisplayName("Should fetch a paginated list of users")
    void listUsers_Success() {
        // Arrange
        Pageable pageable = PageRequest.of(0, 10);
        Page<User> page = new PageImpl<>(List.of(adminUser, regularUser));
        when(userRepository.findAll(pageable)).thenReturn(page);

        // Act
        Page<UserResponse> response = userService.listUsers(null, pageable);

        // Assert
        assertNotNull(response);
        assertEquals(2, response.getTotalElements());
        verify(userRepository).findAll(pageable);
    }

    @Test
    @DisplayName("Should toggle user status successfully")
    void toggleStatus_Success() {
        // Arrange
        when(userRepository.findById(regularUserId)).thenReturn(Optional.of(regularUser));
        when(userRepository.save(any(User.class))).thenReturn(regularUser);

        // Act
        UserResponse response = userService.toggleStatus(regularUserId);

        // Assert
        assertNotNull(response);
        assertEquals(UserStatus.INACTIVE, response.getStatus()); // since it was ACTIVE initially
        verify(userRepository).save(regularUser);
    }

    @Test
    @DisplayName("Should update user successfully")
    void updateUser_Success() {
        // Arrange
        UpdateUserRequest req = new UpdateUserRequest();
        req.setFullName("Updated Name");
        req.setPhone("123456789");

        when(userRepository.findById(regularUserId)).thenReturn(Optional.of(regularUser));
        when(userRepository.save(any(User.class))).thenReturn(regularUser);

        // Act
        UserResponse response = userService.updateUser(regularUserId, req);

        // Assert
        assertNotNull(response);
        assertEquals("Updated Name", response.getFullName());
        assertEquals("123456789", response.getPhone());
    }
}
