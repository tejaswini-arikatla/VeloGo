package com.velogo.dto;

import com.velogo.domain.enums.PaymentMethod;
import com.velogo.domain.enums.PaymentStatus;
import com.velogo.domain.enums.VehicleCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public class PaymentDtos {

    public record CreatePaymentOrderRequest(
            @NotBlank String rideId,
            @NotNull PaymentMethod paymentMethod,
            String idempotencyKey
    ) {}

    public record CreatePaymentOrderResponse(
            String paymentId,
            String rideId,
            BigDecimal amount,
            String currency,
            PaymentMethod method,
            PaymentStatus status,
            String razorpayOrderId,
            String razorpayKeyId,
            boolean simulated
    ) {}

    public record VerifyPaymentRequest(
            @NotBlank String paymentId,
            String razorpayPaymentId,
            String razorpayOrderId,
            String razorpaySignature,
            boolean simulatedSuccess
    ) {}

    public record PaymentReceiptDto(
            String paymentId,
            String rideId,
            String customerName,
            String customerEmail,
            String customerPhone,
            String captainName,
            VehicleCategory vehicleCategory,
            String vehicleModel,
            String registrationNumber,
            String pickupAddress,
            String destAddress,
            BigDecimal distanceKm,
            Integer durationMinutes,
            BigDecimal baseFare,
            BigDecimal distanceCharge,
            BigDecimal timeCharge,
            BigDecimal bookingFee,
            BigDecimal taxAmount,
            BigDecimal discountAmount,
            BigDecimal totalAmount,
            PaymentMethod method,
            PaymentStatus status,
            String transactionRef,
            String date
    ) {}
}
