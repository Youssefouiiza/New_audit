package com.audit.platform.modules.audit.service;

import com.audit.platform.config.SecurityUserDetails;
import com.audit.platform.modules.audit.domain.Audit;
import com.audit.platform.modules.audit.domain.AuditHistory;
import com.audit.platform.modules.audit.domain.AuditStatus;
import com.audit.platform.modules.audit.dto.AuditResponse;
import com.audit.platform.modules.audit.dto.ChangeStatusRequest;
import com.audit.platform.modules.audit.dto.CreateAuditRequest;
import com.audit.platform.modules.audit.repository.AuditHistoryRepository;
import com.audit.platform.modules.audit.repository.AuditRepository;
import com.audit.platform.modules.notification.service.NotificationService;
import com.audit.platform.modules.user.domain.User;
import com.audit.platform.modules.user.domain.UserRole;
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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuditService Unit Tests")
class AuditServiceTest {

    @Mock
    private AuditRepository auditRepository;
    @Mock
    private AuditHistoryRepository auditHistoryRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private AuditService auditService;

    private User auditorUser;
    private User clientUser;
    private Audit audit;
    private UUID auditId;

    @BeforeEach
    void setUp() {
        clientUser = User.builder()
                .id(UUID.randomUUID())
                .fullName("Client User")
                .role(UserRole.CLIENT)
                .build();

        auditorUser = User.builder()
                .id(UUID.randomUUID())
                .fullName("Auditor User")
                .role(UserRole.AUDITOR)
                .build();

        auditId = UUID.randomUUID();
        audit = Audit.builder()
                .id(auditId)
                .title("Test Audit")
                .client(clientUser)
                .status(AuditStatus.DRAFT)
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
    @DisplayName("Create Audit as Client successfully")
    void createAudit_AsClient_Success() {
        // Arrange
        mockSecurityContext(clientUser);
        when(userRepository.findById(clientUser.getId())).thenReturn(Optional.of(clientUser));
        when(auditRepository.save(any(Audit.class))).thenReturn(audit);

        CreateAuditRequest req = new CreateAuditRequest();
        req.setTitle("New Audit");
        req.setDescription("Description");
        req.setDeadline(LocalDate.now().plusDays(10));

        // Act
        AuditResponse response = auditService.create(req);

        // Assert
        assertNotNull(response);
        assertEquals(audit.getId(), response.getId());
        verify(auditRepository).save(any(Audit.class));
    }

    @Test
    @DisplayName("Change Audit Status from DRAFT to IN_PROGRESS by Auditor")
    void changeStatus_DraftToInProgress_Auditor_Success() {
        // Arrange
        mockSecurityContext(auditorUser);
        when(userRepository.findById(auditorUser.getId())).thenReturn(Optional.of(auditorUser));
        when(auditRepository.findById(auditId)).thenReturn(Optional.of(audit));
        when(auditRepository.save(any(Audit.class))).thenReturn(audit);

        ChangeStatusRequest req = new ChangeStatusRequest();
        req.setComment("Starting audit");

        // Act
        AuditResponse response = auditService.changeStatus(auditId, AuditStatus.IN_PROGRESS, req);

        // Assert
        assertNotNull(response);
        assertEquals(AuditStatus.IN_PROGRESS, audit.getStatus());
        verify(auditHistoryRepository).save(any(AuditHistory.class));
    }

    @Test
    @DisplayName("Change Audit Status to an invalid state should throw ApiException")
    void changeStatus_InvalidTransition() {
        // Arrange
        mockSecurityContext(clientUser); // Client cannot change status
        when(userRepository.findById(clientUser.getId())).thenReturn(Optional.of(clientUser));
        when(auditRepository.findById(auditId)).thenReturn(Optional.of(audit));

        // Act & Assert
        ApiException ex = assertThrows(ApiException.class, 
                () -> auditService.changeStatus(auditId, AuditStatus.IN_PROGRESS, new ChangeStatusRequest()));
        assertEquals(ErrorCode.AUDIT_002, ex.getErrorCode());
    }
}
