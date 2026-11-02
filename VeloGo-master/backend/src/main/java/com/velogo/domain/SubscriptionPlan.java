package com.velogo.domain;

import com.velogo.domain.enums.PlanStatus;
import com.velogo.domain.enums.SubscriptionInterval;
import com.velogo.domain.enums.SubscriptionTier;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "subscription_plans")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubscriptionPlan {

    @Id
    @Column(length = 36)
    private String id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SubscriptionTier tier;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Enumerated(EnumType.STRING)
    @Column(name = "plan_interval", nullable = false, length = 20)
    @Builder.Default
    private SubscriptionInterval interval = SubscriptionInterval.MONTHLY;

    @Column(name = "discount_percentage", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal discountPercentage = BigDecimal.ZERO;

    @Column(name = "max_discount_per_ride", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal maxDiscountPerRide = BigDecimal.ZERO;

    @Column(name = "free_rides_count", nullable = false)
    @Builder.Default
    private Integer freeRidesCount = 0;

    @Column(name = "priority_matching", nullable = false)
    @Builder.Default
    private boolean priorityMatching = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private PlanStatus status = PlanStatus.ACTIVE;

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
