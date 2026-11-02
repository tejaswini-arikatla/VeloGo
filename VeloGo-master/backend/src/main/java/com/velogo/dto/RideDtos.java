package com.velogo.dto;

import com.velogo.domain.enums.PaymentMethod;
import com.velogo.domain.enums.PaymentStatus;
import com.velogo.domain.enums.RideStatus;
import com.velogo.domain.enums.VehicleCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;

public class RideDtos {

    public record FareEstimateRequest(
            @NotNull BigDecimal pickupLat,
            @NotNull BigDecimal pickupLng,
            @NotBlank String pickupAddress,
            @NotNull BigDecimal destLat,
            @NotNull BigDecimal destLng,
            @NotBlank String destAddress,
            String couponCode
    ) {}

    public record CategoryEstimateDto(
            VehicleCategory category,
            String categoryName,
            String etaText,
            BigDecimal distanceKm,
            Integer durationMinutes,
            BigDecimal baseFare,
            BigDecimal distanceCharge,
            BigDecimal timeCharge,
            BigDecimal bookingFee,
            BigDecimal taxAmount,
            BigDecimal discountAmount,
            BigDecimal totalFare,
            boolean isAvailable,
            BigDecimal subscriptionDiscount,
            Boolean isSubscriptionFreeRide
    ) {}

    public record CouponAppliedDto(
            String code,
            BigDecimal discountAmount,
            String description
    ) {}

    public record RouteStepDto(
            String instruction,
            String streetName,
            String maneuver,
            double distanceMeters,
            int durationSeconds
    ) {}

    public record FareEstimateResponse(
            BigDecimal distanceKm,
            Integer durationMinutes,
            List<CategoryEstimateDto> estimates,
            CouponAppliedDto couponApplied,
            List<List<Double>> routeGeometry,
            List<RouteStepDto> steps
    ) {}

    public record BookRideRequest(
            @NotNull BigDecimal pickupLat,
            @NotNull BigDecimal pickupLng,
            @NotBlank String pickupAddress,
            @NotNull BigDecimal destLat,
            @NotNull BigDecimal destLng,
            @NotBlank String destAddress,
            @NotNull VehicleCategory vehicleCategory,
            @NotNull PaymentMethod paymentMethod,
            String couponCode,
            Boolean isForSomeoneElse,
            String travelerName,
            String travelerPhone,
            String travelerRelationship,
            String travelerGender,
            Boolean passengerDeclarationAcknowledged,
            com.velogo.domain.enums.BillingProfile billingProfile,
            String corporateReason
    ) {
        public BookRideRequest(
                BigDecimal pickupLat,
                BigDecimal pickupLng,
                String pickupAddress,
                BigDecimal destLat,
                BigDecimal destLng,
                String destAddress,
                VehicleCategory vehicleCategory,
                PaymentMethod paymentMethod,
                String couponCode,
                Boolean isForSomeoneElse,
                String travelerName,
                String travelerPhone,
                String travelerRelationship,
                String travelerGender,
                Boolean passengerDeclarationAcknowledged
        ) {
            this(pickupLat, pickupLng, pickupAddress, destLat, destLng, destAddress, vehicleCategory, paymentMethod, couponCode, isForSomeoneElse, travelerName, travelerPhone, travelerRelationship, travelerGender, passengerDeclarationAcknowledged, com.velogo.domain.enums.BillingProfile.PERSONAL, null);
        }
    }

    public record CancelRideRequest(
            @NotBlank String reason
    ) {}

    public record RideDto(
            String id,
            String customerId,
            String customerName,
            String customerPhone,
            String customerAvatar,
            String captainId,
            String captainName,
            String captainPhone,
            String captainAvatar,
            BigDecimal captainRating,
            VehicleCategory vehicleCategory,
            String vehicleModel,
            String registrationNumber,
            String vehicleColor,
            RideStatus status,
            String pickupAddress,
            BigDecimal pickupLat,
            BigDecimal pickupLng,
            String destAddress,
            BigDecimal destLat,
            BigDecimal destLng,
            BigDecimal distanceKm,
            Integer durationMinutes,
            BigDecimal estimatedFare,
            BigDecimal finalFare,
            BigDecimal discountAmount,
            BigDecimal taxAmount,
            String couponCode,
            String otpCode,
            PaymentMethod paymentMethod,
            PaymentStatus paymentStatus,
            BigDecimal captainCurrentLat,
            BigDecimal captainCurrentLng,
            String cancellationReason,
            String cancelledBy,
            Boolean isForSomeoneElse,
            String travelerName,
            String travelerPhone,
            String travelerRelationship,
            String travelerGender,
            Boolean passengerDeclarationAcknowledged,
            String createdAt,
            String acceptedAt,
            String startedAt,
            String completedAt,
            com.velogo.domain.enums.BillingProfile billingProfile,
            String companyId,
            String companyName,
            com.velogo.domain.enums.CorporateApprovalStatus corporateApprovalStatus,
            Boolean requiresApproval,
            BigDecimal subscriptionDiscount,
            Boolean isSubscriptionFreeRide
    ) {}
}
