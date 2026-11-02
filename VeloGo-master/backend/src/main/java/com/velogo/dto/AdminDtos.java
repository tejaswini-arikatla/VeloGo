package com.velogo.dto;

import com.velogo.domain.enums.RideStatus;
import com.velogo.domain.enums.VehicleCategory;
import com.velogo.domain.enums.VerificationStatus;
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
            @NotNull BigDecimal baseFare,
            @NotNull BigDecimal minFare,
            @NotNull BigDecimal perKmRate,
            @NotNull BigDecimal perMinRate,
            @NotNull BigDecimal bookingFee,
            @NotNull BigDecimal taxRatePercent,
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
