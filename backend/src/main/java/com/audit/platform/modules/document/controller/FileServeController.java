package com.audit.platform.modules.document.controller;

import com.audit.platform.modules.document.service.MinioStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

/**
 * Serves locally stored files.
 * Primary endpoint: GET /api/files/download?key=<url-encoded-key>
 * (avoids Tomcat 400 error on %2F in path segments)
 */
@Slf4j
@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileServeController {

    private final MinioStorageService storageService;

    /**
     * Primary endpoint: key passed as query parameter.
     * Avoids Tomcat's rejection of encoded slashes (%2F) in URL paths.
     * URL: GET /api/files/download?key=audit%2F<auditId>%2F<filename>
     */
    @GetMapping("/download")
    public ResponseEntity<byte[]> serveFileByQueryParam(@RequestParam String key) {
        String decodedKey = URLDecoder.decode(key, StandardCharsets.UTF_8);
        log.debug("Serving file by query param key: {}", decodedKey);
        byte[] bytes = storageService.downloadFile(decodedKey);
        String fileName = getFileName(decodedKey);
        String contentType = detectContentType(fileName);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + fileName + "\"")
                .contentType(MediaType.parseMediaType(contentType))
                .contentLength(bytes.length)
                .body(bytes);
    }

    /**
     * Fallback: handles path-style URLs (for backward compatibility).
     * May fail for keys with slashes on some Tomcat configs.
     */
    @GetMapping("/**")
    public ResponseEntity<byte[]> serveFileWildcard(jakarta.servlet.http.HttpServletRequest request) {
        String path = request.getRequestURI();
        String prefix = "/api/files/";
        String key = path.startsWith(prefix) ? path.substring(prefix.length()) : path;
        key = URLDecoder.decode(key, StandardCharsets.UTF_8);
        log.debug("Serving file by path key: {}", key);
        byte[] bytes = storageService.downloadFile(key);
        String fileName = getFileName(key);
        String contentType = detectContentType(fileName);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + fileName + "\"")
                .contentType(MediaType.parseMediaType(contentType))
                .contentLength(bytes.length)
                .body(bytes);
    }

    private String getFileName(String key) {
        int idx = key.lastIndexOf('/');
        return idx >= 0 ? key.substring(idx + 1) : key;
    }

    private String detectContentType(String fileName) {
        if (fileName == null) return "application/octet-stream";
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".pdf")) return "application/pdf";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        if (lower.endsWith(".xls")) return "application/vnd.ms-excel";
        if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        if (lower.endsWith(".doc")) return "application/msword";
        if (lower.endsWith(".csv")) return "text/csv";
        if (lower.endsWith(".txt")) return "text/plain";
        return "application/octet-stream";
    }
}
