package com.velogo.dto;

import com.velogo.domain.enums.PlanStatus;
import com.velogo.domain.enums.SubscriptionInterval;
import com.velogo.domain.enums.SubscriptionStatus;
import com.velogo.domain.enums.SubscriptionTier;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class SubscriptionDtos {

    public record SubscriptionPlanDto(
            String id,
            String name,
            String description,
            SubscriptionTier tier,
            BigDecimal price,
            SubscriptionInterval interval,
            BigDecimal discountPercentage,
            BigDecimal maxDiscountPerRide,
            Integer freeRidesCount,
            boolean priorityMatching,
            PlanStatus status
    ) {}

    public record UserSubscriptionDto(
            String id,
            String userId,
            String userName,
            String planId,
            String planName,
            SubscriptionTier planTier,
            BigDecimal planPrice,
            SubscriptionInterval planInterval,
            SubscriptionStatus status,
            LocalDateTime currentPeriodStart,
            LocalDateTime currentPeriodEnd,
            boolean autoRenew,
            Integer remainingFreeRides,
            BigDecimal totalDiscountSaved,
            Integer totalRidesTaken,
            boolean isActive,
            LocalDateTime createdAt
    ) {}

    public record SubscribeRequest(
            @NotBlank(message = "Plan ID is required")
            String planId,
            String paymentMethodId
    ) {}

    public record SubscriptionUsageDto(
            String id,
            String userSubscriptionId,
            String rideId,
            BigDecimal discountApplied,
            boolean wasFreeRide,
            LocalDateTime usedAt
    ) {}

    public record SubscriptionDiscountCalculationDto(
            BigDecimal discountAmount,
            boolean isFreeRide,
            String planName,
            BigDecimal originalFare,
            BigDecimal finalFare
    ) {}

    public record UserSubscriptionPortalDto(
            UserSubscriptionDto activeSubscription,
            List<SubscriptionPlanDto> availablePlans,
            List<SubscriptionUsageDto> recentUsages,
            BigDecimal totalSavings,
            int ridesWithPass
    ) {}

    public record CreateSubscriptionOrderResponse(
            String orderId,
            String planId,
            String planName,
            BigDecimal amount,
            String currency,
            String keyId
    ) {}

    public record VerifySubscriptionPaymentRequest(
            @NotBlank String planId,
            @NotBlank String razorpayOrderId,
            String razorpayPaymentId,
            String razorpaySignature
    ) {}

    public record SubscriptionWebhookRequest(
            String event,
            String subscriptionId,
            String userEmail,
            String status
    ) {}
}
