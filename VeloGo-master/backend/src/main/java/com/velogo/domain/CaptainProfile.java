package com.velogo.domain;

import com.velogo.domain.enums.VerificationStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "captain_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CaptainProfile {

    @Id
    @Column(length = 36)
    private String id;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "driving_license_number", nullable = false, length = 50)
    private String drivingLicenseNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false, length = 20)
    @Builder.Default
    private VerificationStatus verificationStatus = VerificationStatus.PENDING;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "is_online", nullable = false)
    @Builder.Default
    private boolean online = false;

    @Column(name = "is_available", nullable = false)
    @Builder.Default
    private boolean available = false;

    @Column(name = "women_only_eligible", nullable = false)
    @Builder.Default
    private boolean womenOnlyEligible = false;

    @Column(name = "women_only_status", nullable = false, length = 20)
    @Builder.Default
    private String womenOnlyStatus = "NOT_APPLIED";

    @Column(name = "women_only_declaration_date")
    private LocalDateTime womenOnlyDeclarationDate;

    @Column(name = "women_only_rejection_reason", columnDefinition = "TEXT")
    private String womenOnlyRejectionReason;

    @Column(name = "current_latitude", precision = 10, scale = 7)
    private BigDecimal currentLatitude;

    @Column(name = "current_longitude", precision = 10, scale = 7)
    private BigDecimal currentLongitude;

    @Column(name = "last_location_update")
    private LocalDateTime lastLocationUpdate;

    @Column(name = "rating_avg", nullable = false, precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal ratingAvg = new BigDecimal("5.00");

    @Column(name = "total_rides", nullable = false)
    @Builder.Default
    private Integer totalRides = 0;

    @Column(name = "total_earnings", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal totalEarnings = BigDecimal.ZERO;

    @OneToOne(mappedBy = "captain", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Vehicle vehicle;

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
