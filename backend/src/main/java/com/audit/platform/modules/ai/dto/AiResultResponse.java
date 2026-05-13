package com.audit.platform.modules.ai.dto;

import com.audit.platform.modules.ai.domain.RiskLevel;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
public class AiResultResponse {
    private UUID id;
    private UUID auditId;
    private String modelUsed;
    private String summary;
    private Integer riskScore;
    private RiskLevel riskLevel;
    private List<Map<String, Object>> anomalies;
    private String recommendations;
    private Long processingTimeMs;
    private Instant createdAt;
}
