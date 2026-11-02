package com.velogo.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "subscription_usages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubscriptionUsage {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_subscription_id", nullable = false)
    private UserSubscription userSubscription;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ride_id")
    private Ride ride;

    @Column(name = "discount_applied", nullable = false, precision = 10, scale = 2)
    private BigDecimal discountApplied;

    @Column(name = "was_free_ride", nullable = false)
    @Builder.Default
    private boolean wasFreeRide = false;

    @Column(name = "used_at", nullable = false)
    private LocalDateTime usedAt;

    @PrePersist
    public void onPrePersist() {
        if (this.usedAt == null) {
            this.usedAt = LocalDateTime.now();
        }
    }
}
