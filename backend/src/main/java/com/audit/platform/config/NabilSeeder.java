package com.audit.platform.config;

import com.audit.platform.modules.user.domain.User;
import com.audit.platform.modules.user.domain.UserRole;
import com.audit.platform.modules.user.domain.UserStatus;
import com.audit.platform.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class NabilSeeder {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Bean
    public ApplicationRunner seedNabil() {
        return args -> {
            if (userRepository.existsByEmailIgnoreCase("nabil@gmail.com")) {
                return;
            }
            User admin = User.builder()
                    .email("nabil@gmail.com")
                    .passwordHash(passwordEncoder.encode("nabil"))
                    .role(UserRole.ADMIN)
                    .firstLogin(false)
                    .status(UserStatus.ACTIVE)
                    .fullName("Nabil")
                    .build();
            userRepository.save(admin);
            log.info("✅ ADMIN 'Nabil' CREE AVEC SUCCES : nabil@gmail.com / nabil");
        };
    }
}
