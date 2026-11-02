package com.velogo.domain;

import com.velogo.domain.enums.CompanyMemberRole;
import com.velogo.domain.enums.CompanyMemberStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "company_members", uniqueConstraints = {
    @UniqueConstraint(name = "uk_company_member_user", columnNames = {"company_id", "user_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompanyMember {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private CompanyMemberRole role = CompanyMemberRole.EMPLOYEE;

    @Column(name = "monthly_budget", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal monthlyBudget = new BigDecimal("5000.00");

    @Column(name = "current_month_spent", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal currentMonthSpent = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private CompanyMemberStatus status = CompanyMemberStatus.ACTIVE;

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
