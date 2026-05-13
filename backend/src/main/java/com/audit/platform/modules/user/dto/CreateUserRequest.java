package com.audit.platform.modules.user.dto;

import com.audit.platform.modules.user.domain.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateUserRequest {

    @Email
    @NotBlank
    private String email;

    @NotBlank
    @Size(min = 2, max = 100)
    private String fullName;

    private String phone;

    @NotNull
    private UserRole role;

    @NotBlank
    @Size(min = 8)
    private String temporaryPassword;
}
