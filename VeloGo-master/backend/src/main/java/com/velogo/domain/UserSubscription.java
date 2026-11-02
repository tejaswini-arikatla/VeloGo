package com.velogo.domain;

import com.velogo.domain.enums.SubscriptionStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_subscriptions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserSubscription {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id", nullable = false)
    private SubscriptionPlan plan;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SubscriptionStatus status = SubscriptionStatus.ACTIVE;

    @Column(name = "current_period_start", nullable = false)
    private LocalDateTime currentPeriodStart;

    @Column(name = "current_period_end", nullable = false)
    private LocalDateTime currentPeriodEnd;

    @Column(name = "auto_renew", nullable = false)
    @Builder.Default
    private boolean autoRenew = true;

    @Column(name = "payment_method_id", length = 50)
    private String paymentMethodId;

    @Column(name = "remaining_free_rides", nullable = false)
    @Builder.Default
    private Integer remainingFreeRides = 0;

    @Column(name = "total_discount_saved", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal totalDiscountSaved = BigDecimal.ZERO;

    @Column(name = "total_rides_taken", nullable = false)
    @Builder.Default
    private Integer totalRidesTaken = 0;

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
