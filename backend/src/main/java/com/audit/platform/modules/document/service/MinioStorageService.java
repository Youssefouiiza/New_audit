package com.audit.platform.modules.document.service;

import com.audit.platform.shared.exception.ApiException;
import com.audit.platform.shared.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.*;
import java.util.Set;
import java.util.UUID;

/**
 * Local filesystem storage (replaces MinIO — no Docker needed).
 * Files are stored under ${app.storage.local-path} (default: ./uploads).
 * Download URLs point to /api/files/{key} via FileServeController.
 */
@Slf4j
@Service
public class MinioStorageService {

    private static final Set<String> ALLOWED = Set.of(
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel",
            "image/png",
            "image/jpeg",
            "image/gif",
            "text/plain",
            "application/octet-stream"
    );

    @Value("${app.storage.local-path:${user.home}/audit-platform-uploads}")
    private String localStoragePath;

    @Value("${app.cors.allowed-origins:http://localhost:3000}")
    private String allowedOrigins;

    @PostConstruct
    public void init() {
        try {
            Path base = Paths.get(localStoragePath);
            Files.createDirectories(base);
            log.info("Local storage initialized at: {}", base.toAbsolutePath());
        } catch (IOException e) {
            log.error("Failed to create local storage directory", e);
        }
    }

    public String uploadDocument(MultipartFile file, String prefix) {
        String mime = file.getContentType();
        if (mime == null) mime = "application/octet-stream";
        validateMime(mime);
        String key = prefix + "/" + UUID.randomUUID() + "-" + sanitize(file.getOriginalFilename());
        Path target = Paths.get(localStoragePath, key.replace("/", java.io.File.separator));
        try {
            Files.createDirectories(target.getParent());
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            log.debug("Stored file: {}", target.toAbsolutePath());
        } catch (IOException e) {
            throw new ApiException(ErrorCode.DOC_001, HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
        }
        return key;
    }

    public String uploadDocumentBytes(byte[] bytes, String fileName, String contentType, String prefix, String bucketOverride) {
        String key = prefix + "/" + UUID.randomUUID() + "-" + sanitize(fileName);
        Path target = Paths.get(localStoragePath, key.replace("/", java.io.File.separator));
        try {
            Files.createDirectories(target.getParent());
            Files.write(target, bytes, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        } catch (IOException e) {
            throw new ApiException(ErrorCode.DOC_001, HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
        }
        return key;
    }

    public byte[] downloadFile(String key) {
        Path file = Paths.get(localStoragePath, key.replace("/", java.io.File.separator));
        try {
            return Files.readAllBytes(file);
        } catch (IOException e) {
            throw new ApiException(ErrorCode.DOC_001, HttpStatus.NOT_FOUND, "File not found: " + key);
        }
    }

    // Returns a URL served by the local FileServeController
    public String presignedGetUrl(String bucket, String key) {
        // Pass key as query param to avoid Tomcat 400 error on encoded slashes (%2F)
        String baseUrl = "http://localhost:8080";
        String encodedKey = java.net.URLEncoder.encode(key, java.nio.charset.StandardCharsets.UTF_8);
        return baseUrl + "/api/files/download?key=" + encodedKey;
    }

    public void deleteFile(String key) {
        Path file = Paths.get(localStoragePath, key.replace("/", java.io.File.separator));
        try {
            Files.deleteIfExists(file);
            log.debug("Deleted file: {}", file.toAbsolutePath());
        } catch (IOException e) {
            log.warn("Could not delete file {}: {}", key, e.getMessage());
        }
    }

    private void validateMime(String mime) {
        if (mime != null && !ALLOWED.contains(mime)) {
            // Log warning but don't block — allow any file type
            log.warn("File type {} not in allowed list, allowing anyway", mime);
        }
    }

    private String sanitize(String name) {
        if (name == null) return "file";
        return name.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}
