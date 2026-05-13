package com.audit.platform.shared.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class ApiException extends RuntimeException {

    private final ErrorCode errorCode;
    private final HttpStatus status;
    private final String details;

    public ApiException(ErrorCode errorCode, HttpStatus status) {
        super(errorCode.getDefaultMessage());
        this.errorCode = errorCode;
        this.status = status;
        this.details = null;
    }

    public ApiException(ErrorCode errorCode, HttpStatus status, String details) {
        super(errorCode.getDefaultMessage());
        this.errorCode = errorCode;
        this.status = status;
        this.details = details;
    }
}
