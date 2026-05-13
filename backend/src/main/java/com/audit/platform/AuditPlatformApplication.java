package com.audit.platform;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@ConfigurationPropertiesScan
@EnableAsync
public class AuditPlatformApplication {

    public static void main(String[] args) {
        SpringApplication.run(AuditPlatformApplication.class, args);
    }
}
