package com.velogo.domain;

import com.velogo.domain.enums.CompanyStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "companies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Company {

    @Id
    @Column(length = 36)
    private String id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(name = "tax_id", nullable = false, length = 50)
    private String taxId;

    @Column(name = "billing_address", nullable = false, columnDefinition = "TEXT")
    private String billingAddress;

    @Column(length = 100)
    private String domain;

    @Column(name = "contact_email", nullable = false, length = 150)
    private String contactEmail;

    @Column(name = "credit_limit", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal creditLimit = new BigDecimal("50000.00");

    @Column(name = "used_credit", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal usedCredit = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private CompanyStatus status = CompanyStatus.ACTIVE;

    @Column(name = "approval_threshold", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal approvalThreshold = new BigDecimal("500.00");

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void onPrePersist() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.updatedAt == null) {
            this.updatedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    public void onPreUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
