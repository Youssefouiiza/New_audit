package com.audit.platform.modules.report.domain;

import com.audit.platform.modules.audit.domain.Audit;
import com.audit.platform.modules.user.domain.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "audit_id", nullable = false, unique = true)
    private Audit audit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "generated_by")
    private User generatedBy;

    @Column(name = "file_key", length = 512)
    private String fileKey;

    @Column(name = "file_name")
    private String fileName;

    // ─── Manual upload by auditor ───────────────────────────────────────────

    /** Key of the manually uploaded final report document */
    @Column(name = "document_file_key", length = 512)
    private String documentFileKey;

    @Column(name = "document_file_name")
    private String documentFileName;

    // ─── Review flow ────────────────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ReportStatus status = ReportStatus.GENERATING;

    /** Manager who reviewed the report */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    /** Manager's comment (revision request, rejection reason, or approval note) */
    @Column(name = "review_comment", length = 2000)
    private String reviewComment;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        createdAt = Instant.now();
    }
}
