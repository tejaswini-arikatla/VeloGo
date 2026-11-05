package com.velogo.dto;

import com.velogo.domain.enums.RideStatus;
import com.velogo.domain.enums.VehicleCategory;
import com.velogo.domain.enums.VerificationStatus;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;

public class AdminDtos {

    public record AdminOverviewDto(
            long totalCustomers,
            long totalCaptains,
            long pendingCaptains,
            long onlineCaptains,
            long totalRides,
            long activeRides,
            long completedRides,
            long cancelledRides,
            BigDecimal grossBookingValue,
            BigDecimal totalCollectedPayments,
            List<RecentRideDto> recentRides
    ) {}

    public record RecentRideDto(
            String id,
            String customerName,
            String captainName,
            VehicleCategory category,
            RideStatus status,
            BigDecimal fare,
            String createdAt
    ) {}

    public record VerifyCaptainActionRequest(
            @NotNull VerificationStatus status,
            String reason
    ) {}

    public record VerifyWomenOnlyActionRequest(
            @NotBlank String status,
            String reason
    ) {}

    public record UpdateFareConfigRequest(
            @NotNull(message = "Base fare is required")
            @DecimalMin(value = "0.00", message = "Base fare cannot be negative")
            @DecimalMax(value = "5000.00", message = "Base fare cannot exceed ₹5000")
            BigDecimal baseFare,

            @NotNull(message = "Minimum fare is required")
            @DecimalMin(value = "0.00", message = "Minimum fare cannot be negative")
            @DecimalMax(value = "5000.00", message = "Minimum fare cannot exceed ₹5000")
            BigDecimal minFare,

            @NotNull(message = "Per-kilometer rate is required")
            @DecimalMin(value = "1.00", message = "Per-kilometer rate must be at least ₹1.00")
            @DecimalMax(value = "500.00", message = "Per-kilometer rate cannot exceed ₹500.00")
            BigDecimal perKmRate,

            @NotNull(message = "Per-minute rate is required")
            @DecimalMin(value = "0.00", message = "Per-minute rate cannot be negative")
            @DecimalMax(value = "100.00", message = "Per-minute rate cannot exceed ₹100.00")
            BigDecimal perMinRate,

            @NotNull(message = "Booking fee is required")
            @DecimalMin(value = "0.00", message = "Booking fee cannot be negative")
            @DecimalMax(value = "500.00", message = "Booking fee cannot exceed ₹500.00")
            BigDecimal bookingFee,

            @NotNull(message = "Tax rate percentage is required")
            @DecimalMin(value = "0.00", message = "Tax rate cannot be negative")
            @DecimalMax(value = "50.00", message = "Tax rate cannot exceed 50%")
            BigDecimal taxRatePercent,

            Boolean active
    ) {}

    public record CreateCouponRequest(
            @NotBlank String code,
            String description,
            @NotNull BigDecimal discountPercent,
            @NotNull BigDecimal maxDiscount,
            @NotNull BigDecimal minRideAmount,
            Boolean active,
            Integer validDays
    ) {}

    public record UpdateUserStatusRequest(
            boolean active,
            String reason
    ) {}

    public record CaptainUserSummary(
            String id,
            String fullName,
            String email,
            String phone
    ) {}

    public record CaptainVehicleSummary(
            String id,
            VehicleCategory category,
            String model,
            String registrationNumber,
            String color
    ) {}

    public record CaptainAdminDto(
            String id,
            CaptainUserSummary user,
            CaptainVehicleSummary vehicle,
            String drivingLicenseNumber,
            VerificationStatus verificationStatus,
            String rejectionReason,
            boolean online,
            boolean available,
            boolean womenOnlyEligible,
            String womenOnlyStatus,
            String womenOnlyRejectionReason,
            BigDecimal ratingAvg,
            long totalRides,
            BigDecimal totalEarnings,
            String createdAt
    ) {}
}
