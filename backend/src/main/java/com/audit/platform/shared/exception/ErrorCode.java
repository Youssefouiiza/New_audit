package com.audit.platform.shared.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    USER_001("USER_001", "User not found"),
    USER_002("USER_002", "Email already exists"),
    AUTH_001("AUTH_001", "Invalid credentials"),
    AUTH_002("AUTH_002", "Invalid or expired token"),
    AUTH_003("AUTH_003", "Account disabled"),
    AUDIT_001("AUDIT_001", "Audit not found"),
    AUDIT_002("AUDIT_002", "Invalid audit status transition"),
    DOC_001("DOC_001", "Document not found"),
    DOC_002("DOC_002", "File type not allowed"),
    DOC_003("DOC_003", "Storage quota exceeded"),
    AI_001("AI_001", "AI analysis failed"),
    CHAT_001("CHAT_001", "Room not found or access denied"),
    VAL_001("VAL_001", "Validation failed"),
    GEN_001("GEN_001", "Unexpected error");

    private final String code;
    private final String defaultMessage;
}
