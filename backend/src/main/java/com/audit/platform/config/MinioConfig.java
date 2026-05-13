package com.audit.platform.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;

/**
 * Storage configuration — MinIO replaced by local filesystem storage.
 * No MinioClient bean needed. See MinioStorageService for implementation.
 */
@Slf4j
@Configuration
public class MinioConfig {
    // Local storage is handled entirely by MinioStorageService (@PostConstruct)
}
