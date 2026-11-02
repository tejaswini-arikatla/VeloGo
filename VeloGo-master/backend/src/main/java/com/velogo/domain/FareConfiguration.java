package com.velogo.domain;

import com.velogo.domain.enums.VehicleCategory;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "fare_configurations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FareConfiguration {

    @Id
    @Column(length = 36)
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, unique = true, length = 20)
    private VehicleCategory category;

    @Column(name = "base_fare", nullable = false, precision = 10, scale = 2)
    private BigDecimal baseFare;

    @Column(name = "min_fare", nullable = false, precision = 10, scale = 2)
    private BigDecimal minFare;

    @Column(name = "per_km_rate", nullable = false, precision = 10, scale = 2)
    private BigDecimal perKmRate;

    @Column(name = "per_min_rate", nullable = false, precision = 10, scale = 2)
    private BigDecimal perMinRate;

    @Column(name = "booking_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal bookingFee;

    @Column(name = "tax_rate_percent", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal taxRatePercent = new BigDecimal("5.00");

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}