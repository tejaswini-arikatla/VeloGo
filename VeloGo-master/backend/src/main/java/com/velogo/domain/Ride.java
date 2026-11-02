package com.velogo.domain;

import com.velogo.domain.enums.RideStatus;
import com.velogo.domain.enums.VehicleCategory;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "rides")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Ride {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "captain_id")
    private CaptainProfile captain;

    @Enumerated(EnumType.STRING)
    @Column(name = "vehicle_category", nullable = false, length = 20)
    private VehicleCategory vehicleCategory;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RideStatus status;

    @Column(name = "pickup_address", nullable = false, columnDefinition = "TEXT")
    private String pickupAddress;

    @Column(name = "pickup_latitude", nullable = false, precision = 10, scale = 7)
    private BigDecimal pickupLatitude;

    @Column(name = "pickup_longitude", nullable = false, precision = 10, scale = 7)
    private BigDecimal pickupLongitude;

    @Column(name = "dest_address", nullable = false, columnDefinition = "TEXT")
    private String destAddress;

    @Column(name = "dest_latitude", nullable = false, precision = 10, scale = 7)
    private BigDecimal destLatitude;

    @Column(name = "dest_longitude", nullable = false, precision = 10, scale = 7)
    private BigDecimal destLongitude;

    @Column(name = "distance_km", nullable = false, precision = 6, scale = 2)
    private BigDecimal distanceKm;

    @Column(name = "duration_minutes", nullable = false)
    private Integer durationMinutes;

    @Column(name = "estimated_fare", nullable = false, precision = 10, scale = 2)
    private BigDecimal estimatedFare;

    @Column(name = "final_fare", precision = 10, scale = 2)
    private BigDecimal finalFare;

    @Column(name = "coupon_code", length = 30)
    private String couponCode;

    @Column(name = "discount_amount", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "tax_amount", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Column(name = "otp_code", nullable = false, length = 6)
    private String otpCode;

    @Column(name = "is_for_someone_else", nullable = false)
    @Builder.Default
    private boolean isForSomeoneElse = false;

    @Column(name = "traveler_name", length = 100)
    private String travelerName;

    @Column(name = "traveler_phone", length = 20)
    private String travelerPhone;

    @Column(name = "traveler_relationship", length = 50)
    private String travelerRelationship;

    @Column(name = "traveler_gender", length = 20)
    private String travelerGender;

    @Column(name = "passenger_declaration_acknowledged", nullable = false)
    @Builder.Default
    private boolean passengerDeclarationAcknowledged = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "billing_profile", nullable = false, length = 20)
    @Builder.Default
    private com.velogo.domain.enums.BillingProfile billingProfile = com.velogo.domain.enums.BillingProfile.PERSONAL;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    @Enumerated(EnumType.STRING)
    @Column(name = "corporate_approval_status", nullable = false, length = 20)
    @Builder.Default
    private com.velogo.domain.enums.CorporateApprovalStatus corporateApprovalStatus = com.velogo.domain.enums.CorporateApprovalStatus.NOT_REQUIRED;

    @Column(name = "requires_approval", nullable = false)
    @Builder.Default
    private boolean requiresApproval = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subscription_id")
    private UserSubscription subscription;

    @Column(name = "subscription_discount", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal subscriptionDiscount = BigDecimal.ZERO;

    @Column(name = "is_subscription_free_ride", nullable = false)
    @Builder.Default
    private boolean isSubscriptionFreeRide = false;

    @Column(name = "cancellation_reason", columnDefinition = "TEXT")
    private String cancellationReason;

    @Column(name = "cancelled_by", length = 20)
    private String cancelledBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "accepted_at")
    private LocalDateTime acceptedAt;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @PrePersist
    public void onPrePersist() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
