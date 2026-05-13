package com.audit.platform.modules.user.controller;

import com.audit.platform.modules.user.domain.UserRole;
import com.audit.platform.modules.user.dto.CreateUserRequest;
import com.audit.platform.modules.user.dto.UpdateUserRequest;
import com.audit.platform.modules.user.dto.UserResponse;
import com.audit.platform.modules.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "User management endpoints")
public class UserController {

    private final UserService userService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a new user (Admin only)")
    public ResponseEntity<UserResponse> create(
            @Valid @RequestBody CreateUserRequest req,
            java.security.Principal principal) {
        // Extract creator ID from security principal (avoids SecurityContext issues in @Transactional)
        UUID creatorId = null;
        if (principal instanceof org.springframework.security.authentication.UsernamePasswordAuthenticationToken auth) {
            if (auth.getPrincipal() instanceof com.audit.platform.config.SecurityUserDetails details) {
                creatorId = details.getId();
            }
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.createUser(req, creatorId));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @Operation(summary = "List all users with optional role filter")
    public ResponseEntity<Page<UserResponse>> list(
            @RequestParam(required = false) UserRole role,
            Pageable pageable) {
        return ResponseEntity.ok(userService.listUsers(role, pageable));
    }

    @GetMapping("/me")
    @Operation(summary = "Get current authenticated user profile")
    public ResponseEntity<UserResponse> me() {
        return ResponseEntity.ok(userService.getMe());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @Operation(summary = "Get user by ID")
    public ResponseEntity<UserResponse> get(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.getUser(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update user details")
    public ResponseEntity<UserResponse> update(@PathVariable UUID id, @RequestBody UpdateUserRequest req) {
        return ResponseEntity.ok(userService.updateUser(id, req));
    }

    @PatchMapping("/{id}/toggle-status")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Toggle user active/inactive status")
    public ResponseEntity<UserResponse> toggleStatus(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.toggleStatus(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Soft-delete (deactivate) a user")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}
